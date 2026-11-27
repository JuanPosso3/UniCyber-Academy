# reCAPTCHA v2 Checkbox en el login

## Componente y configuración

`src/pages/auth/Login.tsx` incorpora `react-google-recaptcha` antes del botón
Ingresar, sin rediseñar la pantalla ni cambiar su lema. Lee
`import.meta.env.VITE_RECAPTCHA_SITE_KEY`, usa `hl="es"`, tema oscuro y tamaño
compacto hasta 400 px, normal por encima. Sin Site Key no se permite enviar.
La clave privada nunca debe incluirse en Vite.

Se instalaron el componente y sus tipos en el workspace frontend. Vitest, jsdom
y Testing Library se usan solo como dependencias de desarrollo para pruebas;
no se incorporan a la compilación de producción.

## Token, envío y reinicio

El token vive solo en estado temporal de React y en el POST de login.
`AuthContext.login(email, password, recaptchaToken)` lo transmite a
`services/auth.ts`. No se almacena en cookies, almacenamiento del navegador ni
base de datos. Las credenciales y `credentials: include` conservan su convención.

Sin token se muestra «Completa la verificación de seguridad para continuar.»
y se enfoca la región de instrucciones si las credenciales tienen formato válido.
Al enviar se descarta el token local; un bloqueo síncrono con ref complementa
`isSubmitting` y evita dos solicitudes simultáneas del mismo intento.

Después de éxito o fallo de autenticación, rechazo de CAPTCHA o error de red,
se reinicia el widget y se borra el token si la pantalla sigue montada. Al
desmontar se descarta el estado; la resolución tardía no actualiza ni navega
desde ese componente. La sesión sigue gestionada por el contexto existente.

`onExpired` limpia y reinicia con «La verificación ha expirado. Inténtalo
nuevamente.». `onErrored` hace lo mismo con un mensaje genérico español.
Un temporizador de 20 segundos informa si el widget no llegó a renderizarse por
red, CSP o bloqueo del script; nunca autoriza omitirlo. Cambiar de tamaño
compacto/normal también descarta el token del widget anterior.

## Accesibilidad y presentación

Región con instrucciones, foco programático, asociación ARIA y mensajes
`aria-live`. Se conservan etiquetas de credenciales, teclado, foco y errores
existentes. Se usan tamaños oficiales, sin escalar los controles mediante CSS.
El compacto evita que los 304 px del normal desborden el formulario móvil.
El reto externo y su accesibilidad final dependen también de Google.

## URL de API y despliegue

El cliente sigue usando `VITE_API_BASE_URL` o `/api`, con rewrite de Vercel hacia
Render. Se conservó ese transporte para mantener cookies del mismo origen y no
alterar CORS/SameSite. `VITE_API_URL` fue indicada como variable del despliegue,
pero **no era ni es consumida por este cliente**. No se copió su valor ni se
solicitaron claves. Usar Render directamente requeriría revisar CORS/cookies en
una tarea separada; no se cambia silenciosamente la configuración existente.

Las CSP de Express y Vercel permiten los recursos específicos del widget. Las
variables públicas Vite deben estar presentes al compilar: cambiarlas requiere
un nuevo despliegue.

## Pruebas automatizadas

`pnpm --filter unicyber-web test` usa Vitest/jsdom con widget simulado, sin red de
Google. Cubre Site Key, español, token ausente, payload, éxito/fallo, mensajes,
caducidad, errores, reinicio, duplicados, desmontaje y tamaño compacto.
`auth-request.test.ts` comprueba el JSON y las convenciones reales del cliente.
El chequeo de tipos incluye las pruebas mediante `tsconfig.test.json`.

Las verificaciones de producción no se sustituyen por jsdom. Seguir
`../../docs/security/PRODUCTION_SECURITY_CHECKLIST.md`: claves del mismo v2
Checkbox, hostname registrado, Site Key en Vercel, secreto y FRONTEND_URL en
Render. Probar reto real, login, errores, caducidad/reutilización, sesión y logout.
No publicar tokens, claves privadas ni capturas de credenciales.

No se accedió a las consolas de Google/Vercel/Render ni se resolvió un CAPTCHA
real con una cuenta autorizada. No se afirma funcionamiento de producción.

## Resultados ejecutados (26 de noviembre de 2026)

| Comando desde la raíz | Resultado real |
| --- | --- |
| `pnpm --filter backend test:recaptcha` | 13 comprobaciones aprobadas del runner, incluido el contenedor de subpruebas. Google simulado; servicio real y sesiones verificados con usuarios ficticios locales. |
| `pnpm --filter unicyber-web test` | 14 pruebas aprobadas en dos archivos. Widget simulado, sin red externa. |
| `pnpm test` | 11 pruebas aprobadas tras serializar las suites que comparten la base local. |
| `pnpm --filter backend test:security` | 10 pruebas aprobadas. |
| `pnpm --filter backend test:recovery` | 28 comprobaciones aprobadas del runner, con transporte de correo simulado. |
| `pnpm typecheck:all` | Correcto: backend, frontend y sus pruebas. |
| `pnpm build:all` | Correcto: compilación de producción de backend y frontend. |
| `git diff --check` | Sin errores; Git avisa de normalización LF/CRLF. |
| `pnpm --filter backend test:security:integration` | Bloqueado antes de sus casos: exige una base local `unicyber_security_isolated_*`. No se omitió esa protección. |

Incidencias corregidas durante la validación: el primer `pnpm test` paralelo
tuvo un 404 de catálogo al compartir fixtures que cambian de estado; la prueba
de evaluación pasó aislada y la suite completa pasó serializada. La nueva
regresión de login tuvo inicialmente un correo ficticio en mayúsculas que no
coincidía con la normalización del endpoint; se corrigió el fixture y volvió
a pasar sin cambiar la lógica de autenticación.

No se ejecutó ESLint porque no existe configuración/script de lint en los
paquetes. Se comprobó la selección de tamaño móvil con pruebas de componente;
la inspección visual del widget real, dispositivos físicos, lector de pantalla
y el recorrido contra Google de producción siguen pendientes.
