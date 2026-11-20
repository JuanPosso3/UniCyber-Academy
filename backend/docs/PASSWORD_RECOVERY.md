# Recuperación de contraseña con Resend

## Dependencia y configuración

El backend usa el SDK oficial de Resend (`resend`), instalado en
`backend/package.json`. El cliente se inicializa únicamente en el backend.

Variables de entorno:

| Variable | Obligatoria | Uso |
| --- | --- | --- |
| `RESEND_API_KEY` | Sí | Autenticación con Resend. Ya existe en `backend/.env`. No se expone al frontend ni se registra en logs. |
| `RESEND_FROM_EMAIL` | Recomendada | Dirección remitente. Si no se define se usa `onboarding@resend.dev`, remitente de pruebas de Resend. En producción debe configurarse un remitente de un dominio verificado en Resend. |

Si falta `RESEND_API_KEY`, el servicio responde con un error interno genérico
(`EMAIL_NOT_CONFIGURED`) sin revelar la clave.

## Flujo

1. La persona indica su correo en `/forgot-password`.
2. `POST /api/auth/password-reset/request` normaliza el correo y busca la
   cuenta.
3. Si la cuenta existe, se genera un código aleatorio criptográficamente seguro
   con `crypto.randomBytes(4)` (8 caracteres hexadecimales).
4. Se guarda **solo el hash bcrypt** del código en `PasswordReset.codeHash`,
   junto con `expiresAt`.
5. Se envía el código por Resend a la dirección registrada.
6. La persona ingresa el código y la nueva contraseña en el frontend.
7. `POST /api/auth/password-reset/reset` valida código, expiración, intentos y
   uso previo.
8. Si es válido, se marca el código como usado y se actualiza `passwordHash`
   con el hash existente de autenticación y `passwordChangedAt`.
9. Los tokens emitidos antes del cambio dejan de ser válidos.

## Endpoints

| Método | Ruta | Autenticación |
| --- | --- | --- |
| `POST` | `/api/auth/password-reset/request` | Pública |
| `POST` | `/api/auth/password-reset/reset` | Pública |

### Solicitud

```json
{ "email": "usuario@example.com" }
```

Respuesta genérica (exista o no la cuenta):

```json
{
  "message": "Si la cuenta existe y está activa, se ha enviado un código de recuperación a su correo."
}
```

### Restablecimiento

```json
{
  "email": "usuario@example.com",
  "code": "1a2b3c4d",
  "newPassword": "NuevaClave123",
  "confirmPassword": "NuevaClave123"
}
```

La respuesta también es genérica y no confirma si el código era correcto.

## Reglas de seguridad

- **Expiración:** 15 minutos (`CODE_TTL_MS`).
- **Uso único:** `usedAt` marca el código como consumido; no se reutiliza.
- **Intentos de verificación:** máximo 5 por código. Al superarlo el código se
  invalida.
- **Solicitudes repetidas:** máximo 3 solicitudes por correo en una ventana de
  15 minutos. Al superar el límite se responde igual que en el caso normal y no
  se envía correo. Mientras exista un código vigente no se emite otro.
- **Enumeración de cuentas:** las respuestas públicas son genéricas.
- **Códigos previos:** al emitir uno nuevo se eliminan los códigos no usados
  del usuario.
- **Errores de Resend:** si el proveedor rechaza el envío, el código recién
  creado se elimina y se responde `502` con un mensaje genérico. No se informa
  un envío exitoso cuando el proveedor falló.
- **Contraseñas:** se validan entre 8 y 128 caracteres, deben coincidir y se
  almacenan con el hash existente. Nunca se guardan en texto plano.
- **Sesiones:** `passwordChangedAt` invalida tokens anteriores.

## Persistencia

Se añadió el modelo mínimo `PasswordReset`:

```prisma
model PasswordReset {
  id        Int   @id @default(autoincrement())
  userId    Int
  codeHash  String
  expiresAt TimestamptzString
  usedAt    TimestamptzString?
  attempts  Int   @default(0)

  user User @relation(fields: [userId], references: [id], onDelete: Restrict, onUpdate: Cascade)
}
```

No se usa eliminación en cascada. Los códigos se eliminan manualmente cuando
corresponde (por ejemplo, al emitir uno nuevo).

## Plantilla de correo

El correo se redacta íntegramente en español e incluye:

- Identificación de UniCyber Academy.
- Explicación de que se solicitó un restablecimiento.
- El código en un bloque destacado.
- Vigencia de 15 minutos y uso único.
- Advertencia para ignorar el mensaje si no se solicitó el cambio.

## Verificación

El flujo fue probado contra la base de datos local (validación de códigos,
expiración, intentos y cambio de contraseña). El envío real de correo depende de
credenciales válidas de Resend y de un remitente verificado; no se incluyen
credenciales reales en esta documentación.
