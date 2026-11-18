import type { PublicUser } from '../auth/auth.types.js';

/** Perfil público del usuario autenticado. */
export interface UserProfile extends PublicUser {}

/** Datos para cambiar el nombre de usuario público. */
export interface UpdateUsernameInput {
  username: string;
}

/** Datos para cambiar la contraseña de la propia cuenta. */
export interface ChangePasswordInput {
  currentPassword: string;
  newPassword: string;
  confirmPassword: string;
}
