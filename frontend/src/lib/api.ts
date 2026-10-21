/**
 * Cliente HTTP centralizado.
 *
 * - Usa `VITE_API_BASE_URL` si está definida; por defecto `/api`, que
 *   Vite reenvía al backend en desarrollo y Express sirve en producción.
 * - Envía siempre `credentials: "include"` para la cookie HttpOnly.
 * - Normaliza los errores de la API para que las páginas no tengan que
 *   interpretar respuestas HTTP por su cuenta.
 */

const rawBaseUrl = import.meta.env.VITE_API_BASE_URL ?? "/api";

export const API_BASE_URL = rawBaseUrl.replace(/\/+$/, "");

export interface ApiErrorPayload {
  error?: {
    code?: string;
    message?: string;
    fields?: Record<string, string>;
  };
}

export class ApiError extends Error {
  constructor(
    public readonly status: number,
    message: string,
    public readonly code?: string,
    public readonly fields?: Record<string, string>,
  ) {
    super(message);
    this.name = "ApiError";
  }
}

async function readBody(response: Response): Promise<unknown> {
  const text = await response.text();

  if (!text) {
    return null;
  }

  try {
    return JSON.parse(text) as unknown;
  } catch {
    return null;
  }
}

function asErrorPayload(body: unknown): ApiErrorPayload {
  if (typeof body === "object" && body !== null && "error" in body) {
    return body as ApiErrorPayload;
  }

  return {};
}

export async function apiRequest<T>(
  path: string,
  options: RequestInit = {},
): Promise<T> {
  const headers = new Headers(options.headers);
  headers.set("Accept", "application/json");

  if (options.body !== undefined && !headers.has("Content-Type")) {
    headers.set("Content-Type", "application/json");
  }

  let response: Response;

  try {
    response = await fetch(`${API_BASE_URL}${path}`, {
      ...options,
      headers,
      credentials: "include",
    });
  } catch {
    throw new ApiError(
      0,
      "No se pudo conectar con el servidor. Verifica tu conexión e inténtalo de nuevo.",
      "NETWORK_ERROR",
    );
  }

  const body = await readBody(response);

  if (!response.ok) {
    const payload = asErrorPayload(body);

    throw new ApiError(
      response.status,
      payload.error?.message ??
        "Ocurrió un error inesperado. Inténtalo de nuevo.",
      payload.error?.code,
      payload.error?.fields,
    );
  }

  return body as T;
}
