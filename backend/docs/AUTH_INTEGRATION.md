# Autenticación JWT — UniCyber Academy

Documento de la implementación realizada el **2026-10-19**. Complementa la
documentación histórica del backend (`docs/BACKEND_DOCUMENTATION.md`, apéndices
§16 y §17).

## Alcance

Se implementó únicamente registro e inicio de sesión con JWT, más el
subconjunto de frontend necesario para usarlos. No se modificó el contrato de
Prisma, el modelo `User` ni las rutas de salud existentes.

## Endpoints

Base: `/api/auth`.

| Método | Ruta | Cuerpo | Éxito | Errores |
|---|---|---|---|---|
| `POST` | `/register` | `{ firstName, lastName, email, password }` | `201 { "user": { id, firstName, lastName, email, role, status } }` | `400` validación, `409` correo ya registrado |
| `POST` | `/login` | `{ email, password }` | `200 { "user": ... }` y cookie `unicyber_session` | `400` validación, `401` credenciales inválidas, `403` cuenta deshabilitada |
| `GET` | `/me` | — (cookie) | `200 { "user": ... }` | `401` sin sesión o token inválido/expirado |
| `POST` | `/logout` | — (cookie) | `204` sin cuerpo y cookie expirada | `401` solo si se quiere exigir sesión; actualmente es público |

Formato uniforme de error:

```json
{
  "error": {
    "code": "VALIDATION_ERROR",
    "message": "Los datos enviados no son válidos.",
    "fields": { "email": "El correo electrónico no es válido." }
  }
}
```

Todos los mensajes al usuario están en español.

## Seguridad

- **Hash de contraseñas:** `crypto.scrypt` de Node (`N=16384`, `r=8`, `p=1`) con
  sal aleatoria. Formato almacenado en `User.passwordHash`:
  `scrypt$N$r$p$<salBase64>$<hashBase64>`. No se añadió una columna nueva.
- **Correo:** en registro e inicio de sesión se recorta y normaliza a minúsculas
  antes de comparar, para que la unicidad y el login sean consistentes.
- **JWT:** `jose`, HS256, con `iss`, `aud`, `sub` (id del usuario) y `role`.
  La clave vive en `JWT_SECRET` (no se codifica ningún secreto).
- **Cookie:** `unicyber_session`, `HttpOnly`, `SameSite=Lax`, `Path=/`,
  `Max-Age` alineado con la expiración del JWT y `Secure` cuando
  `NODE_ENV=production`.
- En cada petición protegida el backend vuelve a cargar el usuario desde
  PostgreSQL y exige `status = ACTIVE`; el rol del token no se usa a ciegas.
- Login con correo inexistente ejecuta una verificación de relleno para no
  revelar por tiempo si el correo existe.
- Cabeceras `X-Content-Type-Options`, `X-Frame-Options` y `Referrer-Policy`.

## Variables de entorno

| Variable | Obligatoria | Descripción |
|---|---|---|
| `DATABASE_URL` | Sí | Cadena de conexión de PostgreSQL (ya existía) |
| `JWT_SECRET` | Sí | Secreto de al menos 32 caracteres; preferible 48–64 bytes aleatorios |
| `JWT_EXPIRES_IN` | No | `2h` por defecto; admite `3600`, `30m`, `2h`, `7d` |
| `COOKIE_SECURE` | No | `true` para forzar cookie `Secure`; `production` ya la activa |

`.env` está excluido por `.gitignore`. `.env.example` documenta las variables y
cómo generar el secreto.

## Frontend integrado

Ruta: `frontend/`, proyecto hermano de `backend/` en la raíz del workspace
(subconjunto del frontend original; el original no se modificó). Reutiliza el
layout, los componentes de UI, los estilos y la identidad visual ya existentes.

- `src/lib/api.ts`: cliente HTTP centralizado (`credentials: "include"`,
  `VITE_API_BASE_URL`, errores normalizados).
- `src/context/AuthContext.tsx`: estado de sesión, arranque con `/me`, login y
  logout.
- `src/pages/auth/Login.tsx` y `Register.tsx`: formularios reales con validación,
  estados de carga, prevención de envíos duplicados y mensajes en español.
- `src/pages/dashboard/SessionHome.tsx`: ancla protegida mínima posterior al
  login. No reemplaza al Dashboard completo del prototipo.
- Navegación por estado con sincronización de URL para `/login`, `/register` y
  `/dashboard`, sin añadir React Router.

## Comandos

Desde la raíz del workspace (`unicyber/`):

```bash
pnpm install          # instala backend + frontend (workspace único)
pnpm dev              # backend en http://localhost:3000
pnpm dev:web          # frontend Vite en http://localhost:5173 (proxy /api → 3000)
pnpm typecheck        # TypeScript del backend
pnpm typecheck:all    # TypeScript de backend y frontend
pnpm build            # compila el backend a backend/dist/
pnpm build:all        # compila backend y frontend (frontend/dist/)
pnpm start            # sirve API y build del frontend en http://localhost:3000
```

Los scripts equivalentes del backend siguen disponibles desde `backend/`
(`pnpm dev`, `pnpm dev:web`, `pnpm typecheck:all`, `pnpm build:all`, etc.). El
frontend también puede iniciarse desde `frontend/` con `pnpm dev`.

En desarrollo se abre <http://localhost:5173/login>. En producción, con
`frontend/dist` construido, se abre <http://localhost:3000/login>. La raíz `/`
sigue devolviendo el JSON existente para no romper la ruta original.

## Limitaciones conocidas

- No hay revocación de tokens: `logout` elimina la cookie, pero un token
  copiado sigue siendo válido hasta su expiración.
- No hay autorización por rol ni rutas de administración.
- No hay límite de intentos ni recuperación de contraseña.
- No hay pruebas automatizadas ni lint configurados en el proyecto original;
  la verificación se hizo con comprobaciones manuales y de navegador.
