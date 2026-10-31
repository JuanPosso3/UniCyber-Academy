import type { ContentStatus } from './content.js';

/**
 * Tipos y reglas de estado de las lecciones.
 *
 * El contrato Prisma solo define `THEORY` y `LABORATORY`. Las lecciones
 * sencillas y desarrolladas comparten `THEORY` y la misma estructura JSON.
 */
export const LESSON_TYPES = ['THEORY', 'LABORATORY'] as const;

export type LessonType = (typeof LESSON_TYPES)[number];

export const LESSON_TITLE_MAX_LENGTH = 200;

export function isLessonType(value: unknown): value is LessonType {
  return (
    typeof value === 'string' &&
    (LESSON_TYPES as readonly string[]).includes(value)
  );
}

/**
 * Las lecciones pueden reactivarse después de archivarse. Esta regla es
 * propia del sistema de lecciones y no altera las transiciones de cursos
 * ni de módulos.
 */
export function canTransitionLessonStatus(
  current: ContentStatus,
  next: ContentStatus,
): boolean {
  if (current === next) {
    return false;
  }

  if (current === 'DRAFT') {
    return next === 'ACTIVE' || next === 'ARCHIVED';
  }

  if (current === 'ACTIVE') {
    return next === 'ARCHIVED';
  }

  return next === 'ACTIVE';
}
