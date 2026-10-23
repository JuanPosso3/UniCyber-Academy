# Frontend integrado

Este directorio contiene el frontend conectado al backend real: autenticación,
catálogo de cursos, detalle de curso y administración de cursos/módulos.
Reutiliza las vistas, componentes, estilos y la identidad visual del frontend
original (`unicyber-academyGuiaDiseñoFrontendd`), que no fue modificado.

Es un proyecto hermano de `backend/` dentro del workspace de la raíz.

## Rutas

| Ruta | Vista |
|---|---|
| `/login` | Inicio de sesión |
| `/register` | Registro |
| `/dashboard` | Panel posterior al login |
| `/courses` | Catálogo de cursos publicados |
| `/courses/:courseId` | Detalle de curso y módulos publicados |
| `/admin/courses` | Gestión de cursos (administrador) |
| `/admin/courses/new` | Crear curso (administrador) |
| `/admin/courses/:courseId/edit` | Editar curso (administrador) |
| `/admin/courses/:courseId/modules` | Gestión de módulos (administrador) |
| `/admin/courses/:courseId/modules/new` | Crear módulo (administrador) |
| `/admin/courses/:courseId/modules/:moduleId/edit` | Editar módulo (administrador) |

La navegación mantiene el patrón por estado del prototipo y sincroniza la URL
con `pushState`, sin añadir React Router. Las rutas profundas sobreviven a una
recarga porque Express sirve el SPA.

El acceso administrativo depende del rol persistido `ADMINISTRATIVE`; la API
también valida los permisos. Detalle en
`docs/COURSE_CATALOG_AND_MODULE_MANAGEMENT.md`.

## Desarrollo

Desde la raíz del repositorio:

```bash
pnpm install
pnpm dev       # backend en http://localhost:3000
pnpm dev:web   # frontend en http://localhost:5173
```

Abrir <http://localhost:5173/login>.

También se puede iniciar solo este proyecto desde `frontend/`:

```bash
pnpm dev
```

Vite reenvía `/api` a `http://localhost:3000` (ver `vite.config.ts`). La cookie
`HttpOnly` funciona igual porque el navegador la ve en el mismo origen
(`localhost:5173`).

## Producción

Desde la raíz:

```bash
pnpm build:all
pnpm start
```

El build del frontend se genera en `frontend/dist/`. Express lo sirve junto con
la API en <http://localhost:3000/login>; `/` conserva la respuesta JSON original
del backend.

## Variables de entorno

`VITE_API_BASE_URL` es opcional. Por defecto vale `/api`. Solo se necesita
definirla si el frontend se despliega separado del backend (ver `.env.example`).
