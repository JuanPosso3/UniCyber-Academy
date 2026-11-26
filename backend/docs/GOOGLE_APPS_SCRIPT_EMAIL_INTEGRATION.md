# Integración de correo con Google Apps Script

## Arquitectura y responsabilidades

La recuperación usa la infraestructura existente:

**Frontend en Vercel → API en Render → Apps Script → proveedor del destinatario.**
Los registros y contraseñas siguen en PostgreSQL (Neon en producción).
Apps Script sustituye el transporte anterior sin SMTP desde Render, sin un
servidor de correo adicional y sin nuevos servicios de pago. Su despliegue y
autorización ya existen según la información proporcionada; no se recrearon.

`src/infrastructure/email/google-apps-script.ts` es el transporte. El servicio
de recuperación mantiene la generación, persistencia y consumo seguro de
códigos. La plantilla, el remitente y la entrega posterior corresponden al
Apps Script existente, cuyo código no está disponible en este repositorio.

## Configuración exclusiva del backend

| Variable | Propósito |
| --- | --- |
| `MAIL_API_URL` | URL HTTPS de la aplicación desplegada en `script.google.com`. |
| `MAIL_API_SECRET` | Secreto compartido que el script valida antes de enviar. |

Ambas son necesarias para enviar; se leen al ejecutar cada envío. Si falta
alguna, el transporte falla de forma segura y la recuperación limpia su
registro nuevo. No impiden el arranque del resto de la API.

El usuario informó que están configuradas en Render. No se accedió al panel
ni se verificaron sus valores en ejecución remota. En local, comprobar solo
presencia mediante booleanos, nunca imprimir valores, URL completa ni cuerpos.
No copiarlas a Vercel ni a variables `VITE_*`. El ejemplo de configuración está
en `backend/.env.example`; el proveedor anterior ya no es una dependencia.

## Contrato HTTP

Se usa `fetch` nativo de Node.js (entorno local verificado: Node 24) con:

- Método inicial `POST` y `Content-Type: application/json`.
- Destino exclusivamente obtenido del entorno, nunca de parámetros del cliente.
- Tres campos JSON: `secret` (de `MAIL_API_SECRET`), `email` (correo validado y
  normalizado) y `code` (código generado en memoria).
- Éxito exclusivamente si la respuesta final tiene estado HTTP 2xx, JSON
  válido de tipo objeto y `success` exactamente igual a `true` booleano.

Un estado 200 con HTML, JSON inesperado, ausencia de `success`, cadenas,
`success: false` o una página de autenticación no acredita aceptación.
El transporte convierte cualquier excepción en `EMAIL_DELIVERY_FAILED`, sin
`cause`, cuerpos ni información del proveedor. No lo devuelve al frontend.

## Timeout, redirecciones y secreto

Un único `AbortSignal.timeout(10000)` cubre conexión, cadena de redirecciones y
lectura del JSON. No hay reintentos: el contrato no ofrece idempotencia y un
timeout no permite saber si el script ya procesó el correo.

Se usa `redirect: manual` con máximo cinco saltos. La política valida HTTPS,
ausencia de credenciales en la URL y puerto estándar. El POST inicial solo
admite `script.google.com`; los destinos siguientes solo admiten los nombres
exactos `script.google.com` y `script.googleusercontent.com`.

Las respuestas 301/302/303 convierten el seguimiento en GET, sin cuerpo ni
cabecera JSON. Nunca se reenvía el secreto en un segundo POST: se rechaza una
redirección 307/308 del POST, pues preservaría el método y podría duplicar el
envío. Esos estados solo se siguen después de haber pasado a GET. Se rechazan
HTTP, hosts externos, credenciales en URL, puertos alternativos, redirecciones
sin destino y bucles. No se deshabilita TLS ni se envían cookies o Referer.

Esta política cubre la respuesta de ContentService de Google mediante GET a
su infraestructura. La cadena real del despliegue existente debe comprobarse
manualmente: si Google exige otro comportamiento, no ampliar destinos ni
reenviar credenciales sin revisar el contrato.

No se registran secretos, códigos, destinatarios, hashes, URL completa ni
respuestas sensibles. El servicio solo registra un aviso genérico de fallo y
elimina el registro nuevo por ID, sin tocar el contador de solicitudes.

## Aceptación no equivale a recepción

`success: true` acredita únicamente aceptación/procesamiento según el contrato
externo, no llegada a una bandeja. Las cuotas de Apps Script y de la cuenta de
Google, filtros antispam y disponibilidad pueden impedir o demorar la entrega.
No se verificaron cuotas, contratos de terceros ni garantías de entrega.

## Plantilla externa y verificación manual pendiente

Con una cuenta de prueba autorizada de Gmail y otra de Outlook/Hotmail:

1. Verificar en Render la presencia de ambas variables sin revelar valores y
   desplegar el backend actualizado. No recrear el script.
2. Solicitar recuperación, localizar el correo (incluido spam) y comprobar
   identidad de UniCyber Academy, asunto y cuerpo en español, propósito de
   recuperación, vigencia de 15 minutos, uso único y aviso para ignorarlo si
   no se solicitó. **No se ha modificado ni inspeccionado la plantilla externa.**
   Si falta un texto, debe ajustarlo el responsable del Apps Script existente;
   el contrato actual no permite enviar asunto o cuerpo desde este backend.
3. Restablecer con el código recibido, comprobar login con la nueva contraseña
   y rechazo del código reutilizado. No registrar el código ni contraseñas.
4. En entorno seguro, probar caducidad, cinco verificaciones fallidas, tres
   solicitudes y fallo controlado del proveedor, conservando respuesta genérica.

No se dispone de cuentas de correo autorizadas, acceso operativo a Render o
Neon ni acceso al Apps Script desplegado. Estas comprobaciones quedan pendientes.
Las pruebas automáticas usan transporte simulado y datos ficticios locales.

## Diagnóstico operativo

- Sin envío: comprobar presencia de variables y despliegue `/exec`, no `/dev`.
- HTML o autenticación: revisar acceso de la aplicación web y respuesta JSON.
- Rechazo del script: revisar coincidencia del secreto sin imprimirlo y sus
  permisos de envío. No propagar su respuesta al cliente.
- Timeout: revisar disponibilidad/cuotas; no repetir automáticamente el POST.
- Código inválido después de recibir correo: comprobar caducidad, agotamiento,
  uso previo o limpieza tras timeout, sin consultar ni divulgar códigos legibles.
- Fallos de almacenamiento: revisar disponibilidad de PostgreSQL y el almacén
  del limitador. No desactivar límites ni borrar historiales para resolverlos.

## Resultados de verificación

Ejecutados el **26 de noviembre de 2026**, desde la raíz:

| Comando | Resultado |
| --- | --- |
| `pnpm --filter backend test:recovery` | 28 pruebas del runner aprobadas (incluye dos contenedores y sus subpruebas); transporte simulado y PostgreSQL local. Repetido tras completar la cobertura. |
| `pnpm test` | 11 pruebas aprobadas: registro/login, cursos, módulos, lecciones, exámenes, logros, perfil y administración. |
| `pnpm --filter backend test:security` | 10 pruebas aprobadas: JWT, cookies, validación, CSRF, límites y errores seguros. |
| `pnpm typecheck:all` | Correcto: backend, pruebas y frontend. |
| `pnpm --filter backend build` | Compilación de producción del backend correcta. |
| `git diff --check` | Sin errores de espacios; avisos de normalización LF/CRLF de Git. |
| `pnpm --filter backend test:security:integration` | Bloqueado por la protección preexistente: exige una base local con nombre `unicyber_security_isolated_*`, no la base local configurada. No se omitió la protección ni se modificó Neon. |

No existe script ni configuración de lint en el backend; no se ejecutó ESLint.
No hubo fallos funcionales en las suites completadas. La suite aislada no llegó
a sus casos de prueba por el requisito de entorno indicado.

La nueva suite verifica POST y payload exactos, lectura de variables, aceptación
explícita, errores HTTP/JSON/aplicación, variables ausentes, URL insegura,
timeout de conexión y lectura, errores de red y redirecciones seguras. La
regresión comprueba hash y TTL de código generado, límite independiente de la
limpieza, mantenimiento de filas ajenas/posteriores, rechazo por expiración,
cinco intentos, reservas concurrentes, una sola emisión concurrente, uso único,
cambio de contraseña y login posterior. Usa cuentas ficticias y borra solo sus
registros temporales; no envía correos reales.

Se comprobó localmente únicamente la **presencia** de las dos variables mediante
booleanos, sin imprimir valores. Esto no demuestra configuración válida,
aceptación del despliegue remoto ni recepción de correo. Gmail, Outlook/Hotmail,
plantilla y ejecución en Render/Neon siguen pendientes de verificación externa.
