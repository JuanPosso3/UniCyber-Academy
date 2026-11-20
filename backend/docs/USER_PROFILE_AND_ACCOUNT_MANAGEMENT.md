# Perfil de usuario y gestión de cuenta

## Alcance

El perfil **Mi perfil** permite a cualquier usuario autenticado (`STUDENT` o
`ADMINISTRATIVE`) consultar su información, cambiar su nombre de usuario y
cambiar su contraseña. El rol es de solo lectura y no puede modificarse desde
este módulo.

La eliminación de la propia cuenta **no está disponible** en la aplicación.
Esta decisión se tomó para preservar la integridad de los registros académicos
(intentos, respuestas, progreso y logros) y de sus relaciones en la base de
datos. No existe ningún endpoint de autoeliminación y la interfaz no ofrece esa
opción.

## Endpoints

Todos requieren autenticación mediante la cookie de sesión existente y actúan
siempre sobre la cuenta de quien realiza la petición.

| Método | Ruta | Descripción |
| --- | --- | --- |
| `GET` | `/api/users/me` | Devuelve el perfil del usuario autenticado. |
| `PATCH` | `/api/users/me/username` | Actualiza el nombre de usuario. |
| `PATCH` | `/api/users/me/password` | Cambia la contraseña actual. |

### `GET /api/users/me`

Respuesta:

```json
{
  "user": {
    "id": 1,
    "firstName": "Ana",
    "lastName": "Pérez",
    "email": "ana@example.com",
    "role": "STUDENT",
    "status": "ACTIVE",
    "username": "ana_perez"
  }
}
```

No se devuelve `passwordHash` ni información sensible.

### `PATCH /api/users/me/username`

Cuerpo:

```json
{ "username": "ana_perez" }
```

Reglas:

- Obligatorio, entre 3 y 100 caracteres después de aplicar `trim`.
- Único en la base de datos; un nombre usado por otra cuenta responde `409`
  con el código `USERNAME_ALREADY_EXISTS`.
- Si no existe otro usuario con el mismo valor, se actualiza y se devuelve el
  perfil actualizado.

### `PATCH /api/users/me/password`

Cuerpo:

```json
{
  "currentPassword": "ClaveActual123",
  "newPassword": "NuevaClave123",
  "confirmPassword": "NuevaClave123"
}
```

Reglas:

- `currentPassword` se verifica con el mismo mecanismo de hash existente
  (`bcrypt`). Una contraseña incorrecta responde `400`
  (`WRONG_CURRENT_PASSWORD`).
- La nueva contraseña debe tener entre 8 y 128 caracteres y coincidir con la
  confirmación.
- Se usa `hashPassword`, la misma utilidad de autenticación; no existe un
  segundo mecanismo de hash.
- Se registra `passwordChangedAt` con la marca de tiempo del cambio.
- Respuesta correcta: `204 No Content`.

## Invalidación de sesiones

`requireAuth` compara el `iat` del JWT con `passwordChangedAt`. Cualquier token
emitido antes del cambio de contraseña queda inválido y la cookie se elimina.
Esto aplica tanto al cambio desde el perfil como al restablecimiento mediante
recuperación de contraseña.

El frontend cierra la sesión después de un cambio exitoso y redirige al inicio
de sesión con un aviso en español.

## Notas de implementación

- La lógica está en `backend/src/application/users/`.
- Los mensajes de validación y error están en español.
- No se introducen tablas adicionales para el perfil: se reutiliza `User`.
- La lista de roles se mantiene con los valores existentes del contrato
  (`STUDENT`, `TEACHER`, `ADMINISTRATIVE`, `VISITOR`, `MENTOR`).
