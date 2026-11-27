# Protección del login con Google reCAPTCHA v2

## Alcance e integración

`POST /api/auth/login` exige `recaptchaToken` junto con `email` y `password`.
Solo protege el login: registro, recuperación, `/auth/me`, logout y APIs
autenticadas conservan sus contratos. No hay migraciones ni tablas de CAPTCHA.

`auth.validation.ts` valida el cuerpo y un token de tipo cadena, no vacío,
acotado a 8192 caracteres y con caracteres alfanuméricos, guion o guion bajo.
Un campo como `captchaVerified: true` no autoriza ninguna operación.

El controlador ejecuta en orden: validación del cuerpo, límites existentes,
`verifyRecaptcha`, el mismo `loginUser` y, solo tras éxito, firma con `jose`/HS256
y cookie HttpOnly `unicyber_session`. No cambian scrypt, estado de cuentas,
roles, JWT, cookies, restauración ni logout. La factoría interna
`createLoginHandler` permite observar el servicio de credenciales en pruebas;
la ruta utiliza el servicio real y siempre verifica CAPTCHA. No existe bandera
pública, variable de bypass ni excepción automática en producción.

## Configuración y hostname

- `RECAPTCHA_SECRET_KEY`: clave privada del mismo **v2 Checkbox** que la Site Key
  del frontend. Exclusiva del backend en Render; nunca `VITE_*`.
- `FRONTEND_URL`: URL pública donde se genera el token. Se obtiene su `hostname`
  mediante `URL` y se compara exactamente con el devuelto por Google.

Configuración ausente, secreto vacío/con espacios, URL inválida, credenciales
en URL y protocolos ajenos a HTTP/HTTPS bloquean el login. En producción se
exige HTTPS. No se usan el hostname de Render, Host, Referer ni datos del cliente.
Las variables se leen en cada verificación y no se imprimen.

No se permiten subcadenas, sufijos, comodines ni previews implícitos. Para
desarrollo, configurar explícitamente `FRONTEND_URL=http://localhost:5173` y una
clave que autorice localhost. Staging requiere su dominio explícito registrado;
no se amplía producción para aceptar todos los previews de Vercel.

## Verificación HTTPS y fallos

`infrastructure/security/recaptcha.ts` usa `fetch` nativo contra el endpoint fijo
`https://www.google.com/recaptcha/api/siteverify`: POST, formato
`application/x-www-form-urlencoded` y `URLSearchParams` con `secret` y `response`.
No reenvía IP mediante `remoteip`, no sigue redirecciones ni reintenta.

Exige HTTP satisfactorio y JSON objeto con `success` booleano igual a `true`,
hostname autorizado y `challenge_ts` con fecha válida y no excesivamente futura.
Google es la autoridad de caducidad y uso único. Cada login consulta Google otra
vez: no hay caché de éxitos ni autorización reutilizable. `timeout-or-duplicate`
rechaza tokens caducados/usados sin exponer detalles del proveedor.

Un `AbortSignal.timeout(8000)` cubre conexión y lectura del JSON. Red, DNS, TLS,
timeout, HTTP no satisfactorio, JSON inválido y configuración ausente impiden
autenticar. No se registran ni devuelven tokens, secretos, passwords, cuerpos
de Google o excepciones de red.

| Caso | Respuesta |
| --- | --- |
| Token ausente/malformado en el cuerpo | `400 VALIDATION_ERROR`, campo `recaptchaToken` |
| Token rechazado/hostname no autorizado | `403 CAPTCHA_INVALID` |
| Configuración o servicio no verificable | `503 CAPTCHA_UNAVAILABLE` |
| CAPTCHA válido y credenciales incorrectas | `401 INVALID_CREDENTIALS`, mensaje existente |

Ningún fallo de CAPTCHA consulta contraseñas ni establece sesión. Se mantienen
5 intentos por correo/IP, 10 por correo y 300 por IP en 15 minutos. Los fallos de
CAPTCHA consumen límites; solo un login correcto limpia los contadores por
correo y correo/IP, como antes.

## CORS, CSRF y CSP

Se conserva `/api` con proxy del mismo origen en Vercel y cookies `SameSite=Lax`.
No se concede CORS cross-origin ni comodines. `FRONTEND_URL` determina el hostname
de CAPTCHA, no sustituye la allowlist CSRF `APP_ORIGINS`; comprobar ambas si
cambia el dominio. No se trasladaron las peticiones del navegador a Render.

Las CSP de Express y `frontend/vercel.json` añaden solo las rutas específicas
de reCAPTCHA para scripts, frames y conexiones. No permiten scripts inline,
`unsafe-eval` ni `*`; mantienen `frame-ancestors 'none'`.

## Pruebas

`pnpm --filter backend test:recaptcha` ejecuta:

- `recaptcha.test.ts`: Google simulado; token ausente, malformado, rechazado,
  caducado/reutilizado, hostname incorrecto, configuración, HTTP/JSON/red/timeout,
  límites y un espía que comprueba cero llamadas a credenciales y cero cookies
  ante fallos.
- `login-recaptcha.test.ts`: servicio real y usuarios ficticios en PostgreSQL
  local; login correcto/incorrecto, cookie, `/me`, logout, roles y cuenta deshabilitada.

Las suites existentes incorporan token y transporte simulado exclusivo de
`test/helpers/recaptcha.ts`. La suite general se serializa porque comparte base
local y el catálogo puede observar cursos archivados por otra suite. No se
alteró la lógica académica para corregir esa interferencia.

Resultados ejecutados en `../../frontend/docs/RECAPTCHA_LOGIN_INTEGRATION.md`.
Google real, Render, Vercel, claves y dominios requieren comprobación manual;
las simulaciones no acreditan funcionamiento de producción.
