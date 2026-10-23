# UniCyber Academy

Monorepo del proyecto UniCyber Academy. El backend y el frontend son proyectos
hermanos y se gestionan desde la raíz con pnpm.

```text
unicyber/
├── backend/      API Express + Prisma + autenticación JWT
├── frontend/     React + Vite (autenticación, catálogo y administración)
└── pnpm-workspace.yaml
```

Funcionalidad actual: registro e inicio de sesión, catálogo de cursos publicados
para estudiantes y administración de cursos/módulos para usuarios con rol
`ADMINISTRATIVE`.

La carpeta `unicyber-academyGuiaDiseñoFrontendd/` corresponde al prototipo
original y se conserva sin modificaciones como referencia.

## Requisitos

- Node.js 24+
- pnpm 12.4.2
- PostgreSQL 15+

## Instalación

Desde la raíz `unicyber/`:

```bash
pnpm install
```

Esto instala las dependencias del backend y del frontend en un único workspace.

## Desarrollo

Desde la raíz:

```bash
pnpm dev       # backend en http://localhost:3000
pnpm dev:web   # frontend Vite en http://localhost:5173
```

Abrir <http://localhost:5173/login>. Vite reenvía `/api` a
`http://localhost:3000`, por lo que la cookie `unicyber_session` funciona en el
mismo origen del navegador.

También se pueden ejecutar los scripts existentes desde cada proyecto:

```bash
cd backend
pnpm dev
pnpm dev:web
```

## Verificación de tipos

Desde la raíz:

```bash
pnpm typecheck       # backend
pnpm typecheck:web   # frontend
pnpm typecheck:all   # ambos
```

## Pruebas

```bash
pnpm test
```

Ejecuta la prueba de integración de cursos y módulos contra PostgreSQL real.
Crea datos temporales, usa las rutas HTTP de la aplicación y elimina sus propios
datos al finalizar. Detalle en
`backend/docs/COURSE_CATALOG_AND_MODULE_MANAGEMENT.md`.

## Build

Desde la raíz:

```bash
pnpm build       # compila el backend en backend/dist/
pnpm build:web   # genera el frontend en frontend/dist/
pnpm build:all   # ambos, en orden
```

## Producción

```bash
pnpm start
```

Abrir <http://localhost:3000/login>. Express sirve la API y el build de
`frontend/dist/`; la raíz `/` conserva la respuesta JSON original del backend.

La ruta del build se resuelve desde la ubicación del archivo compilado del
backend, no desde el directorio de trabajo. Por eso funciona tanto si `pnpm
start` se ejecuta desde la raíz como desde `backend/`.

## Documentación

- `backend/docs/AUTH_INTEGRATION.md`: autenticación y convenciones de API.
- `backend/docs/COURSE_CATALOG_AND_MODULE_MANAGEMENT.md`: contrato, reglas y
  pruebas de cursos/módulos.
- `frontend/docs/COURSE_CATALOG_AND_MODULE_MANAGEMENT.md`: rutas, pantallas y
  componentes del catálogo y la administración.

## Variables de entorno

Backend (`backend/.env`, basado en `backend/.env.example`):

- `DATABASE_URL`
- `JWT_SECRET`
- `JWT_EXPIRES_IN`
- `COOKIE_SECURE` (opcional)

Frontend (`frontend/.env`, basado en `frontend/.env.example`):

- `VITE_API_BASE_URL` (opcional; por defecto `/api`)

Los secretos del backend no deben declararse en el frontend. `.env` está
excluido por `.gitignore`.
