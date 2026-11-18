import type { UserRole, UserStatus } from '../../domain/user.js';

/**
 * Representación interna del usuario, alineada con el modelo `User`
 * del contrato de Prisma. Solo se usa dentro del backend.
 */
export interface AuthUser {
  id: number;
  firstName: string;
  lastName: string;
  email: string;
  passwordHash: string;
  role: UserRole;
  status: UserStatus;
  createdAt: string;
  updatedAt: string;
  /** Marca cuándo se cambió por última vez la contraseña. */
  passwordChangedAt: string | null;
  /** Nombre de usuario público opcional. */
  username: string | null;
}

/**
 * Datos del usuario que se devuelven al cliente.
 * Nunca incluye `passwordHash`.
 */
export interface PublicUser {
  id: number;
  firstName: string;
  lastName: string;
  email: string;
  role: UserRole;
  status: UserStatus;
  /** Nombre de usuario público opcional. */
  username: string | null;
}

export interface AuthResponse {
  user: PublicUser;
}
