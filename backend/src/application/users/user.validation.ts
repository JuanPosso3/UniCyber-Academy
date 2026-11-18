/**
 * Validación de los cuerpos de solicitud del perfil de usuario.
 *
 * El servidor es la autoridad: el frontend valida para mejorar la
 * experiencia, pero estas reglas son las que protegen la API.
 */

export type FieldErrors = Record<string, string>;

export type ValidationResult<T> =
  | { ok: true; data: T }
  | { ok: false; errors: FieldErrors };

const MAX_USERNAME_LENGTH = 100;
const MIN_PASSWORD_LENGTH = 8;
const MAX_PASSWORD_LENGTH = 128;

function asRecord(value: unknown): Record<string, unknown> {
  return typeof value === 'object' && value !== null
    ? (value as Record<string, unknown>)
    : {};
}

function readString(
  body: Record<string, unknown>,
  key: string,
): string {
  const value = body[key];

  return typeof value === 'string' ? value : '';
}

export interface UpdateUsernamePayload {
  username: string;
}

export function validateUpdateUsername(
  body: unknown,
): ValidationResult<UpdateUsernamePayload> {
  const raw = asRecord(body);
  const username = readString(raw, 'username').trim();
  const errors: FieldErrors = {};

  if (!username) {
    errors['username'] = 'Este campo es obligatorio.';
  } else if (username.length > MAX_USERNAME_LENGTH) {
    errors['username'] =
      `El nombre de usuario no puede superar los ${MAX_USERNAME_LENGTH} caracteres.`;
  }

  if (Object.keys(errors).length > 0) {
    return { ok: false, errors };
  }

  return { ok: true, data: { username } };
}

export interface ChangePasswordPayload {
  currentPassword: string;
  newPassword: string;
  confirmPassword: string;
}

export function validateChangePassword(
  body: unknown,
): ValidationResult<ChangePasswordPayload> {
  const raw = asRecord(body);
  const currentPassword = readString(raw, 'currentPassword');
  const newPassword = readString(raw, 'newPassword');
  const confirmPassword = readString(raw, 'confirmPassword');
  const errors: FieldErrors = {};

  if (!currentPassword) {
    errors['currentPassword'] = 'Este campo es obligatorio.';
  }

  if (!newPassword) {
    errors['newPassword'] = 'Este campo es obligatorio.';
  } else if (newPassword.length < MIN_PASSWORD_LENGTH) {
    errors['newPassword'] =
      `La contraseña debe tener al menos ${MIN_PASSWORD_LENGTH} caracteres.`;
  } else if (newPassword.length > MAX_PASSWORD_LENGTH) {
    errors['newPassword'] =
      `La contraseña no puede superar los ${MAX_PASSWORD_LENGTH} caracteres.`;
  }

  if (newPassword !== confirmPassword) {
    errors['confirmPassword'] = 'Las contraseñas no coinciden.';
  }

  if (Object.keys(errors).length > 0) {
    return { ok: false, errors };
  }

  return { ok: true, data: { currentPassword, newPassword, confirmPassword } };
}
