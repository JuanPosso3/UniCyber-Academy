# Recuperación de contraseña mediante Google Apps Script

## Propósito y flujo

La pantalla existente `/forgot-password` permite solicitar un código y enviar
después el código con una nueva contraseña. La interfaz, las rutas y los
contratos públicos no cambiaron al sustituir el proveedor de correo.

1. `POST /api/auth/password-reset/request` valida y normaliza el correo.
2. Se aplican los límites de solicitudes; solo una cuenta activa puede recibir
   un código. La respuesta es genérica para cuentas existentes, inexistentes o
   deshabilitadas y no espera al envío en segundo plano.
3. `crypto.randomBytes(4).toString('hex')` genera ocho caracteres hexadecimales.
   `hashPassword` guarda únicamente su hash **scrypt**, con sal aleatoria, en
   el modelo existente `PasswordReset`.
4. Se crea el registro con vigencia de **15 minutos** y se envía el código al
   Apps Script existente mediante HTTPS. No se usa SMTP ni el SDK anterior.
5. `POST /api/auth/password-reset/reset` recibe `email`, `code`, `newPassword`
   y `confirmPassword`. Verifica vigencia, intentos y hash; contraseña y
   confirmación deben coincidir y tener entre 8 y 128 caracteres.
6. Una transacción reclama el código mediante `usedAt IS NULL` y expiración,
   actualiza `passwordHash` con scrypt y `passwordChangedAt`. Dos solicitudes
   no pueden consumir el mismo código correctamente. Los JWT anteriores
   quedan invalidados por los controles existentes de autenticación.

## Respuestas y privacidad

Se conservan los mensajes públicos existentes:

- Solicitud: «Si la cuenta existe y está activa, se ha enviado un código de
  recuperación a su correo.»
- Restablecimiento: «Si el código es válido y no ha expirado, tu contraseña se
  ha actualizado.»

Son respuestas genéricas, no comprobantes de envío ni de cambio. Un fallo del
proveedor no produce una respuesta distinta por cuenta ni devuelve su cuerpo.
Los errores de validación de formato mantienen `400 VALIDATION_ERROR`.
Los límites por IP conservan su respuesta `429`.

## Controles preservados

- Máximo **tres solicitudes por correo normalizado en 15 minutos**, mediante
  `consumeRateLimit` **antes** de consultar la cuenta. También se cuentan las
  solicitudes sin cuenta elegible, con código vigente o con fallo de envío.
- Mientras exista un código no usado y vigente no se envía otro.
- La emisión vuelve a comprobar esa condición dentro de una transacción,
  bloqueando la fila de usuario (`SELECT ... FOR UPDATE`) para serializar
  solicitudes simultáneas. El bloqueo no incluye la llamada HTTP.
- Solo se eliminan códigos anteriores **no usados y caducados** al emitir uno
  nuevo. La comprobación transaccional evita invalidar un código vigente
  creado concurrentemente. Los usados no se borran por esta operación.
- Máximo **cinco verificaciones por código**. Se reserva el intento antes de
  ejecutar scrypt, mediante actualización condicional del contador. Una
  solicitud que pierde la comparación atómica no verifica gratis el código.
  Al llegar a cinco, el código queda agotado; una consulta posterior marca
  `usedAt` y no lo acepta aunque el texto sea correcto.
- Consumo y actualización de contraseña en una sola transacción; si falla la
  escritura, se revierte la transacción. Se conservan verificaciones ficticias
  para reducir diferencias temporales sin afirmar tiempo constante.
- Se conservan los límites adicionales por IP y por correo del controlador,
  CSRF y las reglas existentes de sesión.

## Persistencia y fallos de entrega

No se cambió `PasswordReset`, el contrato Prisma ORM 8 ni la configuración de
Neon; no se crearon migraciones. El código original solo existe temporalmente
en memoria y en la petición HTTPS al proveedor, nunca en una columna legible.

`sendRecoveryEmail` utiliza `MAIL_API_URL` y `MAIL_API_SECRET` únicamente en el
backend. Todo resultado distinto de HTTP satisfactorio y JSON con
`success: true` se considera fallo. Hay un límite de diez segundos y no hay
reintentos automáticos. Véase `GOOGLE_APPS_SCRIPT_EMAIL_INTEGRATION.md`.

Ante fallo, el servicio elimina **solo `created.id`**, no todos los registros
de la cuenta. Una petición anterior fallida no puede eliminar un registro
posterior por compartir usuario. La eliminación no reinicia el limitador,
porque su estado vive separado de `PasswordReset`. Se registra únicamente un
mensaje genérico. Si falla la propia limpieza de base de datos, el controlador
conserva su registro genérico de error; podría quedar un código bloqueando
nuevas emisiones hasta caducar. No se afirma entrega ni se expone el fallo al
cliente.

## Pruebas y límites conocidos

`pnpm --filter backend test:recovery` prueba transporte simulado, configuración,
redirecciones, fallos y timeout, hash y vigencia, límites, limpieza por ID,
cuentas no elegibles, respuestas genéricas y concurrencia de emisión y consumo.
No envía correos reales. Los resultados ejecutados están en el documento de
integración.

- El limitador conserva sus dos modos. `memory` es local al proceso y pierde
  estado al reiniciar; `postgres` requiere la tabla y configuración existentes.
  Esta migración no cambia ese despliegue ni garantiza coordinación entre
  instancias si se mantiene el modo local.
- El trabajo de envío en segundo plano no es una cola durable. Un reinicio del
  proceso durante la operación puede dejar un código sin correo hasta caducar.
- Un timeout puede ocurrir después de que Google haya enviado el correo. Se
  elimina el código local y no se reintenta para evitar duplicados; ese correo
  podría contener un código que ya no sea válido.
- La plantilla y las cuotas pertenecen al Apps Script externo. No se cambió ni
  desplegó ese script. Gmail y Outlook/Hotmail requieren verificación manual
  con cuentas autorizadas; no se verificó la bandeja de entrada ni producción.
