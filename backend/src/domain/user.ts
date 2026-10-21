/**
 * Tipos y constantes del dominio de usuario.
 *
 * Se mantienen alineados con los enums de `src/prisma/contract.prisma`
 * (UserRole y UserStatus). No se duplica lógica de persistencia aquí.
 */

export const USER_ROLES = [
  'STUDENT',
  'TEACHER',
  'ADMINISTRATIVE',
  'VISITOR',
  'MENTOR',
] as const;

export type UserRole = (typeof USER_ROLES)[number];

export const USER_STATUSES = ['ACTIVE', 'DISABLED'] as const;

export type UserStatus = (typeof USER_STATUSES)[number];

export function isUserRole(value: unknown): value is UserRole {
  return (
    typeof value === 'string' &&
    (USER_ROLES as readonly string[]).includes(value)
  );
}

export function isUserStatus(value: unknown): value is UserStatus {
  return (
    typeof value === 'string' &&
    (USER_STATUSES as readonly string[]).includes(value)
  );
}
