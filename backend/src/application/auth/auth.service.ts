import { db } from '../../prisma/db.js';
import { AppError } from '../../infrastructure/http/errors.js';
import {
  getDummyPasswordHash,
  hashPassword,
  passwordHashNeedsRehash,
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
    username: user.username,
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
): Promise<AuthUser> {
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

  // Actualiza hashes creados con parámetros anteriores sin invalidar la
  // contraseña ni la sesión que se está creando.
  if (passwordHashNeedsRehash(user.passwordHash)) {
    await rehashPasswordIfUnchanged(
      user.id,
      user.passwordHash,
      input.password,
    );
  }

  return user;
}

/**
 * Reemplaza un hash antiguo solo si la fila sigue teniendo exactamente el
 * hash leído. Si otra petición cambió la contraseña entretanto, la
 * actualización condicional afecta a cero filas y no sobrescribe el cambio.
 */
export async function rehashPasswordIfUnchanged(
  userId: number,
  previousHash: string,
  password: string,
): Promise<void> {
  try {
    await db.orm.public.User
      .where({ id: userId })
      .where((candidate) => candidate.passwordHash.eq(previousHash))
      .update({ passwordHash: await hashPassword(password) });
  } catch {
    // Un fallo al actualizar el hash no debe impedir un login válido;
    // el hash anterior sigue siendo verificable.
    console.error(
      'No se pudo actualizar el hash de contraseña a los parámetros actuales.',
    );
  }
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
