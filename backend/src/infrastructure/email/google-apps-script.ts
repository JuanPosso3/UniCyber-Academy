const DELIVERY_TIMEOUT_MS = 10_000;
const MAX_REDIRECTS = 5;
const RESPONSE_HOSTS = new Set(['script.google.com', 'script.googleusercontent.com']);
const REDIRECT_STATUSES = new Set([301, 302, 303, 307, 308]);

function deliveryFailure(): Error {
  // Nunca incorporar URL, cuerpo, destinatario ni excepción del proveedor.
  return new Error('EMAIL_DELIVERY_FAILED');
}

function secureUrl(value: string): URL {
  const url = new URL(value);
  if (url.protocol !== 'https:' || url.username || url.password ||
      (url.port && url.port !== '443') || !RESPONSE_HOSTS.has(url.hostname)) {
    throw deliveryFailure();
  }
  return url;
}

/** Transporte exclusivo del backend; no efectúa reintentos de envío. */
export async function sendRecoveryEmail(
  email: string,
  code: string,
  options: { fetch?: typeof fetch; timeoutMs?: number } = {},
): Promise<void> {
  try {
    const secret = process.env['MAIL_API_SECRET'];
    const configuredUrl = process.env['MAIL_API_URL'];
    if (!secret?.trim() || !configuredUrl?.trim()) throw deliveryFailure();
    let url = secureUrl(configuredUrl);
    // El POST con credenciales solo se dirige al despliegue de Apps Script.
    if (url.hostname !== 'script.google.com') throw deliveryFailure();

    const transport = options.fetch ?? globalThis.fetch;
    const signal = AbortSignal.timeout(options.timeoutMs ?? DELIVERY_TIMEOUT_MS);
    let method = 'POST';
    let body: string | undefined = JSON.stringify({ secret, email, code });

    for (let redirects = 0; redirects <= MAX_REDIRECTS; redirects += 1) {
      const response = await transport(url, {
        method,
        headers: body === undefined ? {} : { 'Content-Type': 'application/json' },
        body,
        signal,
        redirect: 'manual',
        credentials: 'omit',
        referrerPolicy: 'no-referrer',
      });

      if (REDIRECT_STATUSES.has(response.status)) {
        const location = response.headers.get('location');
        await response.body?.cancel();
        if (!location || redirects === MAX_REDIRECTS) throw deliveryFailure();
        const destination = secureUrl(new URL(location, url).href);
        // Fetch convierte POST a GET en 301/302/303. Nunca repetir un POST
        // con el secreto ante 307/308 ni ante un destino no autorizado.
        if (method === 'POST' && (response.status === 307 || response.status === 308)) {
          throw deliveryFailure();
        }
        method = 'GET';
        body = undefined;
        url = destination;
        continue;
      }

      if (!response.ok) {
        await response.body?.cancel();
        throw deliveryFailure();
      }
      const result: unknown = await response.json();
      if (typeof result !== 'object' || result === null ||
          !('success' in result) || result.success !== true) {
        throw deliveryFailure();
      }
      return;
    }
    throw deliveryFailure();
  } catch {
    // No conservar cause: los errores de fetch pueden incluir datos sensibles.
    throw deliveryFailure();
  }
}
