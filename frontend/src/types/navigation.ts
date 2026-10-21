/**
 * Navegación mínima para la integración de autenticación.
 *
 * Se mantiene el patrón original basado en estado, sin añadir React
 * Router. Las tres rutas se sincronizan con la URL para que recargar
 * /login, /register o /dashboard funcione en desarrollo y producción.
 */
export type Page = "login" | "register" | "dashboard";

export type NavigateFn = (page: Page) => void;
