import { db } from '../../prisma/db.js';
import { AppError } from '../../infrastructure/http/errors.js';
import {
  getDummyPasswordHash,
  hashPassword,
  verifyPassword,
} from '../../infrastructure/security/password.js';
import type { AuthUser, PublicUser } from './auth.types.js';
import type { LoginInput, RegisterInput } from './auth.validation.js';

const INVALID_CREDENTIALS = 'Correo electrónico o contraseña incorrectos.';
const EMAIL_ALREADY_REGISTERED =
  'El correo electrónico ya está registrado.';
const ACCOUNT_DISABLED =
  'Tu cuenta está deshabilitada. Contacta al administrador.';

export function toPublicUser(user: AuthUser): PublicUser {
  return {
    id: user.id,
    firstName: user.firstName,
    lastName: user.lastName,
    email: user.email,
    role: user.role,
    status: user.status,
  };
}

export async function registerUser(
  input: RegisterInput,
): Promise<PublicUser> {
  const existing = await db.orm.public.User
    .where((user) => user.email.eq(input.email))
    .first();

  if (existing) {
    throw new AppError(
      409,
      'EMAIL_ALREADY_REGISTERED',
      EMAIL_ALREADY_REGISTERED,
    );
  }

  const passwordHash = await hashPassword(input.password);

  try {
    const created = await db.orm.public.User.create({
      firstName: input.firstName,
      lastName: input.lastName,
      email: input.email,
      passwordHash,
      role: 'STUDENT',
    });

    return toPublicUser(created);
  } catch (error) {
    // Si dos solicitudes simultáneas superan la comprobación previa, la
    // restricción UNIQUE de PostgreSQL sigue siendo la última defensa.
    const duplicate = await db.orm.public.User
      .where((user) => user.email.eq(input.email))
      .first();

    if (duplicate) {
      throw new AppError(
        409,
        'EMAIL_ALREADY_REGISTERED',
        EMAIL_ALREADY_REGISTERED,
      );
    }

    throw error;
  }
}

export async function loginUser(
  input: LoginInput,
): Promise<PublicUser> {
  const user = await db.orm.public.User
    .where((candidate) => candidate.email.eq(input.email))
    .first();

  if (!user) {
    // Mantiene un coste de tiempo similar al caso de usuario existente.
    await verifyPassword(input.password, await getDummyPasswordHash());

    throw new AppError(
      401,
      'INVALID_CREDENTIALS',
      INVALID_CREDENTIALS,
    );
  }

  const passwordIsValid = await verifyPassword(
    input.password,
    user.passwordHash,
  );

  if (!passwordIsValid) {
    throw new AppError(
      401,
      'INVALID_CREDENTIALS',
      INVALID_CREDENTIALS,
    );
  }

  if (user.status !== 'ACTIVE') {
    throw new AppError(403, 'ACCOUNT_DISABLED', ACCOUNT_DISABLED);
  }

  return toPublicUser(user);
}

export async function findActiveUserById(
  id: number,
): Promise<AuthUser | null> {
  const user = await db.orm.public.User.first({ id });

  if (!user || user.status !== 'ACTIVE') {
    return null;
  }

  return user;
}
