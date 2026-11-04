import { isLessonType, LESSON_TITLE_MAX_LENGTH, type LessonType } from '../../domain/lesson.js';
import type {
  CreateLessonInput,
  MoveLessonInput,
  UpdateLessonInput,
  ValidateLessonContentInput,
} from './lesson.types.js';

export type LessonFieldErrors = Record<string, string>;

export type LessonValidationResult<T> =
  | { ok: true; data: T }
  | { ok: false; errors: LessonFieldErrors };

const STATUS_FIELD_MESSAGE =
  'Usa las acciones de publicación o archivado para cambiar el estado.';
const ORDER_FIELD_MESSAGE =
  'Usa las acciones de reordenamiento para cambiar la posición.';

function asRecord(value: unknown): Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : {};
}

function hasOwn(body: Record<string, unknown>, key: string): boolean {
  return Object.prototype.hasOwnProperty.call(body, key);
}

function readString(body: Record<string, unknown>, key: string): string {
  return typeof body[key] === 'string' ? (body[key] as string) : '';
}

function validateTitle(title: string, errors: LessonFieldErrors): void {
  if (!title) {
    errors['title'] = 'Este campo es obligatorio.';
  } else if (title.length > LESSON_TITLE_MAX_LENGTH) {
    errors['title'] =
      `El título no puede superar los ${LESSON_TITLE_MAX_LENGTH} caracteres.`;
  }
}

function readType(
  value: unknown,
  errors: LessonFieldErrors,
): LessonType | null {
  if (!isLessonType(value)) {
    errors['type'] = 'El tipo de lección debe ser THEORY o LABORATORY.';
    return null;
  }

  return value;
}

function rejectManagedFields(
  body: Record<string, unknown>,
  errors: LessonFieldErrors,
): void {
  if (hasOwn(body, 'status')) {
    errors['status'] = STATUS_FIELD_MESSAGE;
  }

  if (hasOwn(body, 'order')) {
    errors['order'] = ORDER_FIELD_MESSAGE;
  }
}

export function validateCreateLesson(
  body: unknown,
): LessonValidationResult<CreateLessonInput> {
  const raw = asRecord(body);
  const title = readString(raw, 'title').trim();
  const errors: LessonFieldErrors = {};
  const type = readType(raw['type'], errors);

  validateTitle(title, errors);
  rejectManagedFields(raw, errors);

  if (!hasOwn(raw, 'content') || raw['content'] === undefined) {
    errors['content'] = 'El contenido de la lección es obligatorio.';
  }

  if (Object.keys(errors).length > 0 || !type) {
    return { ok: false, errors };
  }

  return {
    ok: true,
    data: {
      title,
      type,
      content: raw['content'] as CreateLessonInput['content'],
    },
  };
}

export function validateUpdateLesson(
  body: unknown,
): LessonValidationResult<UpdateLessonInput> {
  const raw = asRecord(body);
  const errors: LessonFieldErrors = {};
  const data: UpdateLessonInput = {};

  if (hasOwn(raw, 'title')) {
    const title = readString(raw, 'title').trim();
    validateTitle(title, errors);
    data.title = title;
  }

  if (hasOwn(raw, 'type')) {
    const type = readType(raw['type'], errors);

    if (type) {
      data.type = type;
    }
  }

  if (hasOwn(raw, 'content')) {
    data.content = raw['content'] as UpdateLessonInput['content'];
  }

  rejectManagedFields(raw, errors);

  if (
    !hasOwn(raw, 'title') &&
    !hasOwn(raw, 'type') &&
    !hasOwn(raw, 'content')
  ) {
    errors['_form'] = 'No hay cambios para guardar.';
  }

  if (Object.keys(errors).length > 0) {
    return { ok: false, errors };
  }

  return { ok: true, data };
}

export function validateLessonContentRequest(
  body: unknown,
): LessonValidationResult<ValidateLessonContentInput> {
  const raw = asRecord(body);
  const errors: LessonFieldErrors = {};
  const type = readType(raw['type'], errors);

  if (!hasOwn(raw, 'content') || raw['content'] === undefined) {
    errors['content'] = 'El contenido de la lección es obligatorio.';
  }

  if (Object.keys(errors).length > 0 || !type) {
    return { ok: false, errors };
  }

  return {
    ok: true,
    data: {
      type,
      content: raw['content'],
    },
  };
}

export function validateMoveLesson(
  body: unknown,
): LessonValidationResult<MoveLessonInput> {
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

export function validateActivityAnswerRequest(
  body: unknown,
): LessonValidationResult<{ answer: unknown }> {
  const raw = asRecord(body);

  if (!hasOwn(raw, 'answer')) {
    return {
      ok: false,
      errors: {
        answer: 'La respuesta de la actividad es obligatoria.',
      },
    };
  }

  return { ok: true, data: { answer: raw['answer'] } };
}

export function validateLabAnswersRequest(
  body: unknown,
): LessonValidationResult<{ answers: Record<string, unknown> }> {
  const raw = asRecord(body);
  const answers = raw['answers'];

  if (typeof answers !== 'object' || answers === null || Array.isArray(answers)) {
    return {
      ok: false,
      errors: {
        answers: 'Las respuestas del laboratorio deben ser un objeto.',
      },
    };
  }

  return { ok: true, data: { answers: answers as Record<string, unknown> } };
}

export function validateTerminalCommandRequest(
  body: unknown,
): LessonValidationResult<{ command: string }> {
  const raw = asRecord(body);
  const command = readString(raw, 'command').trim();

  if (!command) {
    return {
      ok: false,
      errors: {
        command: 'El comando es obligatorio.',
      },
    };
  }

  if (command.length > 500) {
    return {
      ok: false,
      errors: {
        command: 'El comando no puede superar los 500 caracteres.',
      },
    };
  }

  return { ok: true, data: { command } };
}
