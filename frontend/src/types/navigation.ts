/**
 * Navegación basada en URLs sin añadir React Router.
 *
 * `App.tsx` sincroniza el estado con `window.history`, de modo que las
 * rutas profundas (`/courses/3`, `/admin/courses/2/modules`) funcionan
 * al recargar tanto en Vite como en el build servido por Express.
 */
export type NavigateFn = (path: string) => void;
