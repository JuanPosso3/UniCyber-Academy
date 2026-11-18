import { db } from '../../prisma/db.js';
import { AppError } from '../../infrastructure/http/errors.js';
import {
  hashPassword,
  verifyPassword,
} from '../../infrastructure/security/password.js';
import type { PublicUser } from '../auth/auth.types.js';
import type { UserRole, UserStatus } from '../../domain/user.js';
import type {
  ChangePasswordInput,
  UpdateUsernameInput,
  UserProfile,
} from './user.types.js';

const USER_NOT_FOUND_MESSAGE = 'El usuario no existe.';
const USERNAME_ALREADY_EXISTS = 'Ya existe un usuario con ese nombre de usuario.';
const USERNAME_TOO_SHORT =
  'El nombre de usuario debe tener al menos 3 caracteres.';
const WRONG_CURRENT_PASSWORD = 'La contraseña actual es incorrecta.';
const PASSWORDS_DO_NOT_MATCH = 'Las contraseñas no coinciden.';

function toPublicUser(user: unknown): PublicUser {
  return {
    id: (user as { id: number }).id,
    firstName: (user as { firstName: string }).firstName,
    lastName: (user as { lastName: string }).lastName,
    email: (user as { email: string }).email,
    role: (user as { role: string }).role as UserRole,
    status: (user as { status: string }).status as UserStatus,
    username: (user as { username: string | null }).username ?? null,
  };
}

/**
 * Perfil del usuario autenticado.
 */
export async function getMyProfile(
  userId: number,
): Promise<UserProfile> {
  const user = await db.orm.public.User.first({ id: userId });

  if (!user || (user as { status: string }).status !== 'ACTIVE') {
    throw new AppError(404, 'USER_NOT_FOUND', USER_NOT_FOUND_MESSAGE);
  }

  return toPublicUser(user) as UserProfile;
}

/** Cambia el nombre de usuario público de la cuenta autenticada. */
export async function updateUsername(
  userId: number,
  input: UpdateUsernameInput,
): Promise<UserProfile> {
  const username = input.username.trim();

  if (username.length < 3) {
    throw new AppError(400, 'USERNAME_TOO_SHORT', USERNAME_TOO_SHORT);
  }

  const existing = await db.orm.public.User
    .where((user) => user.username.eq(username))
    .first();

  if (existing && (existing as { id: number }).id !== userId) {
    throw new AppError(
      409,
      'USERNAME_ALREADY_EXISTS',
      USERNAME_ALREADY_EXISTS,
    );
  }

  const updated = await db.orm.public.User
    .where({ id: userId })
    .update({ username });

  if (!updated) {
    throw new AppError(404, 'USER_NOT_FOUND', USER_NOT_FOUND_MESSAGE);
  }

  return toPublicUser(updated) as UserProfile;
}

/**
 * Cambia la contraseña de la cuenta autenticada tras verificar la actual.
 */
export async function changePassword(
  userId: number,
  input: ChangePasswordInput,
): Promise<void> {
  if (input.newPassword !== input.confirmPassword) {
    throw new AppError(
      400,
      'PASSWORDS_DO_NOT_MATCH',
      PASSWORDS_DO_NOT_MATCH,
    );
  }

  const user = await db.orm.public.User.first({ id: userId });

  if (!user) {
    throw new AppError(404, 'USER_NOT_FOUND', USER_NOT_FOUND_MESSAGE);
  }

  const passwordIsValid = await verifyPassword(
    input.currentPassword,
    (user as { passwordHash: string }).passwordHash,
  );

  if (!passwordIsValid) {
    throw new AppError(400, 'WRONG_CURRENT_PASSWORD', WRONG_CURRENT_PASSWORD);
  }

  const now = new Date().toISOString();

  await db.orm.public.User
    .where({ id: userId })
    .update({
      passwordHash: await hashPassword(input.newPassword),
      passwordChangedAt: now,
    });
}
