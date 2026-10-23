import { isContentStatus, type ContentStatus } from '../../domain/content.js';
import type {
  CreateCourseInput,
  CreateModuleInput,
  MoveModuleInput,
  UpdateCourseInput,
  UpdateModuleInput,
} from './course.types.js';

export type FieldErrors = Record<string, string>;

export type ValidationResult<T> =
  | { ok: true; data: T }
  | { ok: false; errors: FieldErrors };

const MAX_TITLE_LENGTH = 200;
const MAX_DESCRIPTION_LENGTH = 2000;
const STATUS_FIELD_MESSAGE =
  'Usa las acciones de publicación o archivado para cambiar el estado.';

function asRecord(value: unknown): Record<string, unknown> {
  return typeof value === 'object' && value !== null
    ? (value as Record<string, unknown>)
    : {};
}

function hasOwn(
  body: Record<string, unknown>,
  key: string,
): boolean {
  return Object.prototype.hasOwnProperty.call(body, key);
}

function readString(
  body: Record<string, unknown>,
  key: string,
): string {
  const value = body[key];

  return typeof value === 'string' ? value : '';
}

function normalizeDescription(
  body: Record<string, unknown>,
): string | null {
  const value = body['description'];

  if (value === null || value === undefined) {
    return null;
  }

  if (typeof value !== 'string') {
    return null;
  }

  const trimmed = value.trim();

  return trimmed.length > 0 ? trimmed : null;
}

function validateTitle(title: string, errors: FieldErrors): void {
  if (!title) {
    errors['title'] = 'Este campo es obligatorio.';
  } else if (title.length > MAX_TITLE_LENGTH) {
    errors['title'] =
      `El título no puede superar los ${MAX_TITLE_LENGTH} caracteres.`;
  }
}

function validateDescription(
  description: string | null,
  errors: FieldErrors,
): void {
  if (
    description !== null &&
    description.length > MAX_DESCRIPTION_LENGTH
  ) {
    errors['description'] =
      `La descripción no puede superar los ${MAX_DESCRIPTION_LENGTH} caracteres.`;
  }
}

export function validateCreateCourse(
  body: unknown,
): ValidationResult<CreateCourseInput> {
  const raw = asRecord(body);
  const title = readString(raw, 'title').trim();
  const description = normalizeDescription(raw);
  const errors: FieldErrors = {};

  validateTitle(title, errors);
  validateDescription(description, errors);

  if (hasOwn(raw, 'status')) {
    errors['status'] = STATUS_FIELD_MESSAGE;
  }

  if (Object.keys(errors).length > 0) {
    return { ok: false, errors };
  }

  return { ok: true, data: { title, description } };
}

export function validateUpdateCourse(
  body: unknown,
): ValidationResult<UpdateCourseInput> {
  const raw = asRecord(body);
  const errors: FieldErrors = {};
  const data: UpdateCourseInput = {};

  if (hasOwn(raw, 'title')) {
    const title = readString(raw, 'title').trim();
    validateTitle(title, errors);
    data.title = title;
  }

  if (hasOwn(raw, 'description')) {
    const description = normalizeDescription(raw);
    validateDescription(description, errors);
    data.description = description;
  }

  if (hasOwn(raw, 'status')) {
    errors['status'] = STATUS_FIELD_MESSAGE;
  }

  if (!hasOwn(raw, 'title') && !hasOwn(raw, 'description')) {
    errors['_form'] = 'No hay cambios para guardar.';
  }

  if (Object.keys(errors).length > 0) {
    return { ok: false, errors };
  }

  return { ok: true, data };
}

export function validateContentStatus(
  body: unknown,
): ValidationResult<{ status: ContentStatus }> {
  const raw = asRecord(body);
  const status = raw['status'];

  if (!isContentStatus(status)) {
    return {
      ok: false,
      errors: {
        status: 'El estado seleccionado no es válido.',
      },
    };
  }

  return { ok: true, data: { status } };
}

export function validateCreateModule(
  body: unknown,
): ValidationResult<CreateModuleInput> {
  const raw = asRecord(body);
  const title = readString(raw, 'title').trim();
  const description = normalizeDescription(raw);
  const errors: FieldErrors = {};

  validateTitle(title, errors);
  validateDescription(description, errors);

  if (hasOwn(raw, 'status')) {
    errors['status'] = STATUS_FIELD_MESSAGE;
  }

  if (Object.keys(errors).length > 0) {
    return { ok: false, errors };
  }

  return { ok: true, data: { title, description } };
}

export function validateUpdateModule(
  body: unknown,
): ValidationResult<UpdateModuleInput> {
  const raw = asRecord(body);
  const errors: FieldErrors = {};
  const data: UpdateModuleInput = {};

  if (hasOwn(raw, 'title')) {
    const title = readString(raw, 'title').trim();
    validateTitle(title, errors);
    data.title = title;
  }

  if (hasOwn(raw, 'description')) {
    const description = normalizeDescription(raw);
    validateDescription(description, errors);
    data.description = description;
  }

  if (hasOwn(raw, 'status')) {
    errors['status'] = STATUS_FIELD_MESSAGE;
  }

  if (!hasOwn(raw, 'title') && !hasOwn(raw, 'description')) {
    errors['_form'] = 'No hay cambios para guardar.';
  }

  if (Object.keys(errors).length > 0) {
    return { ok: false, errors };
  }

  return { ok: true, data };
}

export function validateMoveModule(
  body: unknown,
): ValidationResult<MoveModuleInput> {
  const raw = asRecord(body);
  const direction = raw['direction'];

  if (direction !== 'up' && direction !== 'down') {
    return {
      ok: false,
      errors: {
        direction: 'La dirección debe ser "up" o "down".',
      },
    };
  }

  return { ok: true, data: { direction } };
}
