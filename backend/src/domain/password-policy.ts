export const PASSWORD_REQUIREMENTS = 'Tu contraseña debe tener al menos 8 caracteres e incluir una letra mayúscula, una minúscula, un número y un símbolo.';

export function hasPasswordComplexity(password: string): boolean {
  return password.length >= 8 && /\p{Lu}/u.test(password) &&
    /\p{Ll}/u.test(password) && /[0-9]/.test(password) &&
    /[^\p{L}\p{N}\s]/u.test(password);
}
