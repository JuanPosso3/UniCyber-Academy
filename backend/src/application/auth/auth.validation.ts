/**
 * Validación de los cuerpos de registro e inicio de sesión.
 *
 * El servidor es la autoridad: el frontend valida para mejorar la
 * experiencia, pero estas reglas son las que protegen la API.
 */

export interface RegisterInput {
  firstName: string;
  lastName: string;
  email: string;
  password: string;
}

export interface LoginInput {
  email: string;
  password: string;
}

export type FieldErrors = Record<string, string>;

export type ValidationResult<T> =
  | { ok: true; data: T }
  | { ok: false; errors: FieldErrors };

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const MAX_EMAIL_LENGTH = 254;
const MAX_NAME_LENGTH = 100;
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

export function validateRegister(
  body: unknown,
): ValidationResult<RegisterInput> {
  const raw = asRecord(body);
  const firstName = readString(raw, 'firstName').trim();
  const lastName = readString(raw, 'lastName').trim();
  const email = readString(raw, 'email').trim().toLowerCase();
  const password = readString(raw, 'password');
  const errors: FieldErrors = {};

  if (!firstName) {
    errors['firstName'] = 'Este campo es obligatorio.';
  } else if (firstName.length > MAX_NAME_LENGTH) {
    errors['firstName'] =
      `El nombre no puede superar los ${MAX_NAME_LENGTH} caracteres.`;
  }

  if (!lastName) {
    errors['lastName'] = 'Este campo es obligatorio.';
  } else if (lastName.length > MAX_NAME_LENGTH) {
    errors['lastName'] =
      `El apellido no puede superar los ${MAX_NAME_LENGTH} caracteres.`;
  }

  if (!email) {
    errors['email'] = 'Este campo es obligatorio.';
  } else if (
    email.length > MAX_EMAIL_LENGTH ||
    !EMAIL_PATTERN.test(email)
  ) {
    errors['email'] = 'El correo electrónico no es válido.';
  }

  if (!password) {
    errors['password'] = 'Este campo es obligatorio.';
  } else if (password.length < MIN_PASSWORD_LENGTH) {
    errors['password'] =
      `La contraseña debe tener al menos ${MIN_PASSWORD_LENGTH} caracteres.`;
  } else if (password.length > MAX_PASSWORD_LENGTH) {
    errors['password'] =
      `La contraseña no puede superar los ${MAX_PASSWORD_LENGTH} caracteres.`;
  }

  if (Object.keys(errors).length > 0) {
    return { ok: false, errors };
  }

  return {
    ok: true,
    data: { firstName, lastName, email, password },
  };
}

export function validateLogin(body: unknown): ValidationResult<LoginInput> {
  const raw = asRecord(body);
  const email = readString(raw, 'email').trim().toLowerCase();
  const password = readString(raw, 'password');
  const errors: FieldErrors = {};

  if (!email) {
    errors['email'] = 'Este campo es obligatorio.';
  } else if (
    email.length > MAX_EMAIL_LENGTH ||
    !EMAIL_PATTERN.test(email)
  ) {
    errors['email'] = 'El correo electrónico no es válido.';
  }

  if (!password) {
    errors['password'] = 'Este campo es obligatorio.';
  }

  if (Object.keys(errors).length > 0) {
    return { ok: false, errors };
  }

  return {
    ok: true,
    data: { email, password },
  };
}
