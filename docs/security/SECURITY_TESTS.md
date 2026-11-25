# Pruebas de seguridad y regresión

Todas las ejecuciones registradas ocurrieron después de las últimas modificaciones de código. No se inventaron resultados.

## Resultados ejecutados

| Comando / procedimiento | Resultado |
|---|---|
| `pnpm --filter backend test:security` | 10/10 pasan; sin conexión a base de datos |
| `pnpm --filter backend test:security:integration` con `DATABASE_URL` aislada | 3/3 pasan |
| `pnpm test` en backend con `DATABASE_URL` aislada | 8/8 pasan |
| Pruebas de navegador con `test/browser-security.fixture.ts` | CSRF, headers y expiración de sesión: correctos |
| `pnpm typecheck:all` | Pasa |
| `pnpm build:all` | Pasa con Vite 6.4.6 |
| `pnpm audit` | 0 vulnerabilidades conocidas |
| `pnpm audit --prod` | 0 vulnerabilidades conocidas |
| `git diff --check` | Pasa; solo avisos de normalización LF/CRLF |

El backend expone los scripts `test`, `test:security`, `test:security:integration` y `test:security:browser:fixture`. La suite de integración de seguridad falla antes de importar Prisma si la base no es local y su nombre no comienza con `unicyber_security_isolated_`.

## Cobertura automatizada

`backend/test/security.test.ts` (10 casos, sin base de datos):

- JWT válido con marca `pwd`; rechazo por expiración, firma, algoritmo HS512, issuer, audience, rol inválido, `sub` no decimal, `sub` fuera de rango seguro y claims `exp`/`iat` ausentes.
- Cookies de producción: HttpOnly, Secure, SameSite=Lax, Path=/, borrado con `Expires=Thu, 01 Jan 1970`.
- Cabeceras: CSP con `frame-ancestors 'none'`, XFO DENY, nosniff, no-store, HSTS en producción y contrato `error.details` sin stack.
- JSON malformado (400) y cuerpo excesivo (413).
- Limitador local: 429 y `Retry-After`.
- Validación de registro: descarta `role`/`status` y rechaza tipos incorrectos.
- CSRF: allowlist exacta, Referer, `Origin: null`, sufijos engañosos, origen externo con cabecera, ausencia de CORS en preflight, formularios y `sec-fetch-site`.
- Trust proxy: XFF ignorado por defecto y aceptado solo desde CIDR explícitamente configurado.
- Error inesperado: ni la respuesta ni los logs contienen el secreto ficticio.

`backend/test/security-integration.test.ts` (3 casos, base aislada):

- Registro real sin escalado de rol; login correcto/incorrecto/inexistente; cookie ausente o manipulada; `/me` sin hash; permisos administrativos; recurso ajeno; logout y replay documentado; cuenta deshabilitada; cambio de contraseña; login posterior; 8 verificaciones concurrentes de recuperación; límite agotado; recuperación y uso único.
- Limitador compartido: 10 llamadas concurrentes con límite 3 → 3 permitidas y 7 rechazadas; contador en PostgreSQL = 4; borrar solo memoria no reinicia el límite; `clearRateLimit` lo reinicia.
- Rehash concurrente: la actualización condicional no sobrescribe la contraseña cambiada; la contraseña nueva sigue funcionando.

## Pruebas de navegador

Se usó un fixture local que sirve el build de Vite y una API ficticia, sin Prisma, correos ni datos reales. Resultados:

- Escrituras same-origin con `X-UniCyber-Request`: **204**; sin esa cabecera, el navegador envía Origin de mismo sitio y la petición también se aceptó.
- `fetch` cross-origin con cabecera personalizada: bloqueado por preflight sin CORS.
- `fetch` cross-origin simple (`no-cors`) y envío de formulario desde otro origen: bloqueados por CSRF y por `Cross-Origin-Resource-Policy: same-origin`; el contador de escrituras del servidor no aumentó.
- Formulario desde iframe con `Origin: null`: rechazado; escrituras sin cambios.
- Expiración: tras forzar un 401 en una petición protegida, el evento global limpió el usuario, redirigió a `/login` y mostró «Tu sesión ha expirado. Inicia sesión nuevamente.».
- Headers observados: CSP con frame-ancestors, XFO DENY, nosniff, Referrer no-referrer, Permissions, CORP same-origin, Cache-Control no-store y sin X-Powered-By. HSTS no aparece en el fixture porque `NODE_ENV=test`; en producción se emite desde el código.

Estas pruebas son evidencia del comportamiento local del código, **no** del despliegue en Vercel o Render.

## Entorno aislado

Se creó `unicyber_security_isolated_20261122` en PostgreSQL local desde el esquema y los metadatos del contrato, sin importar datos de usuarios. Se cargó `ACADEMIC_ACHIEVEMENTS` desde código y se usaron solo datos ficticios. `RESEND_API_KEY` quedó vacía; no se enviaron correos. La base temporal fue eliminada al terminar. Ni la base local de origen ni Neon recibieron escrituras.

## Criterios que aún requieren entorno real

- Comprobar headers y CSP en el dominio público tras el despliegue autorizado.
- Repetir CSRF con el dominio real de Vercel y la cadena de proxies real.
- Medir scrypt bajo concurrencia en staging.
- Verificar el fail-closed del limitador compartido si el almacén no está disponible, en un entorno de staging autorizado.
- Smoke de Neon tras el despliegue; la verificación de la migración anterior no sirve como evidencia de esta versión.
