/**
 * Reglas de publicación del contenido educativo.
 *
 * El contrato Prisma almacena `DRAFT`, `ACTIVE` y `ARCHIVED`. Este
 * módulo concentra las transiciones permitidas para que no dependan de
 * Express ni de componentes React.
 */

export const CONTENT_STATUSES = [
  'DRAFT',
  'ACTIVE',
  'ARCHIVED',
] as const;

export type ContentStatus = (typeof CONTENT_STATUSES)[number];

export function isContentStatus(value: unknown): value is ContentStatus {
  return (
    typeof value === 'string' &&
    (CONTENT_STATUSES as readonly string[]).includes(value)
  );
}

/**
 * Un borrador puede publicarse o archivarse. Un curso o módulo activo
 * puede archivarse. La restauración de contenido archivado no forma
 * parte de esta funcionalidad y no se inventa aquí.
 */
export function canTransitionContent(
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

  return false;
}

export function isAvailableToStudents(
  status: ContentStatus,
): boolean {
  return status === 'ACTIVE';
}
