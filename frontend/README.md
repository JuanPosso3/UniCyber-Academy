# Frontend integrado (subconjunto de autenticación)

Este directorio contiene el subconjunto mínimo del frontend necesario para
conectar registro e inicio de sesión con el backend real. Reutiliza las vistas,
componentes, estilos y la identidad visual del frontend original
(`unicyber-academyGuiaDiseñoFrontendd`), que no fue modificado.

Es un proyecto hermano de `backend/` dentro del workspace de la raíz.

## Rutas

| Ruta | Vista |
|---|---|
| `/login` | Inicio de sesión |
| `/register` | Registro |
| `/dashboard` | Ancla protegida posterior al login |

La navegación mantiene el patrón por estado del prototipo y sincroniza la URL,
sin añadir React Router.

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
