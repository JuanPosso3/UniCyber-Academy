# JWT, sesiones, CORS y CSRF

## JWT y validación

`jose` emite HS256 con `sub`, `role`, `iss=unicyber-academy`, `aud=unicyber-academy-web`, `iat` y `exp`. La verificación fija el algoritmo, exige `sub`, `iat`, `exp`, `iss` y `aud`, valida que `sub` sea decimal y un entero seguro, comprueba el rol contra el dominio y tolera 5 segundos de desfase de reloj.

El token no contiene correo, nombre ni datos sensibles. El middleware consulta el usuario en cada petición protegida, comprueba `ACTIVE` y usa el rol persistido en BD; un claim administrativo fabricado no concede permisos.

## Cookie y duración

Cookie `unicyber_session`: HttpOnly, host-only (sin `Domain`), `Path=/`, `SameSite=Lax` y `Secure` cuando `NODE_ENV=production` o `COOKIE_SECURE=true`. `Max-Age` deriva de `JWT_EXPIRES_IN`, que permanece en **2 h**.

La marca `pwd` guarda el valor exacto de `passwordChangedAt` al emitir el token, lo que permite invalidar tokens anteriores con precisión de milisegundos. Los tokens antiguos conservan un fallback por `iat`. La deshabilitación de la cuenta se comprueba contra BD. El rehash transparente no altera esa marca.

## Expiración, logout y replay

El frontend restaura la sesión con `/api/auth/me`. Un 401 en una operación protegida —excepto login, bootstrap y recuperación— emite `SESSION_EXPIRED_EVENT`; `AuthContext` limpia el usuario y muestra el aviso en español. En navegador se comprobó la secuencia completa: 401 → evento → redirección a `/login` → aviso visible → datos del usuario retirados.

Logout elimina la cookie. Una copia del JWT sigue siendo válida: la integración lo confirmó. No hay lista de revocación ni refresh token. Reducir la duración disminuiría la ventana de replay pero no revocaría tokens ya copiados; las sesiones revocables exigirían almacenamiento compartido o cambio de esquema, fuera del alcance autorizado. Se mantienen dos horas.

Un fallo de red durante logout puede conservar la cookie HttpOnly aunque el estado React se limpie; el frontend informa del error.

## Trust proxy

La configuración anterior `app.set('trust proxy', 1)` asumía una sola capa de proxy sin evidencia verificable. Se sustituyó por `configureTrustProxy`, que solo confía en `X-Forwarded-For` cuando `TRUSTED_PROXY_CIDRS` contiene CIDR explícitos; por defecto no confía en ninguna cabecera reenviada. Así, un cliente que alcance Render directamente no puede falsificar su IP.

Prueba ejecutada: con la variable vacía, `X-Forwarded-For: 203.0.113.77` se ignora y `req.ip` sigue siendo `127.0.0.1`; con `127.0.0.1/32`, se acepta el valor. La cadena real Vercel → Render **no fue inspeccionada**: es necesario verificar qué direcciones aparecen como par inmediato y qué hace cada plataforma con XFF antes de fijar los CIDR. Hasta entonces, los límites por IP pueden agrupar a usuarios detrás de un mismo proxy; los límites por correo mitigan parcialmente ese efecto.

## CORS

La API no habilita lectura cross-origin: no se emiten `Access-Control-Allow-Origin` ni `Access-Control-Allow-Credentials`, incluidas las respuestas a preflight. En el despliegue documentado, `/api` se reescribe desde Vercel al mismo alojamiento de Render, de modo que el navegador opera con origen Vercel.

Definir `VITE_API_BASE_URL` apuntando directamente a Render cambiaría este modelo a cross-site; con `SameSite=Lax` la cookie no se enviaría en fetch cross-site y la autenticación dejaría de funcionar. No se recomienda sin rediseñar la estrategia de sesión.

## CSRF

La protección se implementó en `backend/src/infrastructure/http/csrf.middleware.ts` para todas las rutas `/api` y métodos de escritura:

1. Se ignora en GET, HEAD y OPTIONS.
2. Si hay `Origin`, debe coincidir **exactamente** con un origen de `APP_ORIGINS`. `Origin: null`, listas, coincidencias por sufijo y orígenes externos se rechazan aunque se añada una cabecera.
3. Si no hay `Origin` pero hay `Referer`, se compara el origen del Referer.
4. Sin ambas cabeceras, se exige `X-UniCyber-Request: 1` y que `Sec-Fetch-Site` no sea `cross-site` ni `same-site`. Un formulario HTML no puede añadir esa cabecera; un fetch cross-origin provocaría preflight sin CORS.

Se añadieron además `Cross-Origin-Resource-Policy: same-origin`, SameSite=Lax, cookie host-only y ausencia de CORS. El cliente frontend envía la cabecera personalizada en todas las peticiones.

Verificación local en navegador: escrituras same-origin aceptadas; fetch con cabecera personalizada bloqueado por preflight; fetch simple, formulario cross-origin y formulario con `Origin: null` rechazados sin aumentar el contador de escrituras del servidor.

El valor predeterminado de `APP_ORIGINS` en producción es `https://unicyber-academy.vercel.app`, deducido del despliegue documentado y **no verificado en el panel de Vercel**. Debe confirmarse el dominio real —incluidas preview URLs si se usan— y configurarse explícitamente antes de desplegar. La protección CSRF queda demostrada para el código, no para el dominio público.
