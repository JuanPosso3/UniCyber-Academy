import type { FieldErrors, ValidationResult } from '../courses/course.validation.js';

function asRecord(value: unknown): Record<string, unknown> {
  return typeof value === 'object' && value !== null
    ? (value as Record<string, unknown>)
    : {};
}

interface UserAchievementId {
  userAchievementId: number;
}

function parseUserAchievementId(
  value: unknown,
): { ok: true; data: UserAchievementId } | { ok: false; errors: FieldErrors } {
  const errors: FieldErrors = {};

  if (typeof value !== 'string' || value.trim().length === 0) {
    errors['userAchievementId'] =
      'El identificador de la relación usuario-logro no es válido.';

    return { ok: false, errors };
  }

  const id = Number(value);

  if (!Number.isInteger(id) || id <= 0) {
    errors['userAchievementId'] =
      'El identificador de la relación usuario-logro no es válido.';

    return { ok: false, errors };
  }

  return { ok: true, data: { userAchievementId: id } };
}

export function validateUserAchievementId(
  value: unknown,
): ValidationResult<UserAchievementId> {
  return parseUserAchievementId(value);
}

export type { FieldErrors };
