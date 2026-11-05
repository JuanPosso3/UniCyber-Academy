import { isContentStatus, type ContentStatus } from '../../domain/content.js';
import type {
  FieldErrors,
  ValidationResult,
} from '../courses/course.validation.js';

export type { FieldErrors };

const MAX_TITLE_LENGTH = 200;
const MAX_DESCRIPTION_LENGTH = 2000;
const MAX_ANSWER_COUNT = 8;

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

/**
 * Solo verifica la presencia y el tipo básico del arreglo de
 * preguntas; las reglas académicas (cantidad, tipos y opciones)
 * se aplican en la capa de dominio.
 */
export function validateCreateAssessment(
  body: unknown,
): ValidationResult<{
  title: string;
  description: string | null;
  questions: unknown;
}> {
  const raw = asRecord(body);
  const title = readString(raw, 'title').trim();
  const description = normalizeDescription(raw);
  const errors: FieldErrors = {};

  validateTitle(title, errors);
  validateDescription(description, errors);

  if (!Array.isArray(raw['questions'])) {
    errors['questions'] = 'Envía la lista de preguntas de la evaluación.';
  }

  if (hasOwn(raw, 'status')) {
    errors['status'] =
      'Las evaluaciones se crean en borrador; usa las acciones de publicación para activarlas.';
  }

  if (Object.keys(errors).length > 0) {
    return { ok: false, errors };
  }

  return { ok: true, data: { title, description, questions: raw['questions'] } };
}

export function validateUpdateAssessment(
  body: unknown,
): ValidationResult<{ title?: string; description?: string | null }> {
  const raw = asRecord(body);
  const errors: FieldErrors = {};
  const data: { title?: string; description?: string | null } = {};

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

  if (!hasOwn(raw, 'title') && !hasOwn(raw, 'description')) {
    errors['_form'] = 'No hay cambios para guardar.';
  }

  if (Object.keys(errors).length > 0) {
    return { ok: false, errors };
  }

  return { ok: true, data };
}

export function validateReplaceQuestions(
  body: unknown,
): ValidationResult<{ questions: unknown }> {
  const raw = asRecord(body);

  if (!Array.isArray(raw['questions'])) {
    return {
      ok: false,
      errors: {
        questions: 'Envía la lista de preguntas de la evaluación.',
      },
    };
  }

  return { ok: true, data: { questions: raw['questions'] } };
}

export function validateAssessmentStatus(
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

export interface SubmittedAnswer {
  questionId: number;
  answerOptionId: number;
}

export function validateSubmitAnswers(
  body: unknown,
): ValidationResult<{ answers: SubmittedAnswer[] }> {
  const raw = asRecord(body);
  const answers = raw['answers'];

  if (!Array.isArray(answers)) {
    return {
      ok: false,
      errors: {
        answers: 'Envía las respuestas seleccionadas del examen.',
      },
    };
  }

  if (answers.length > MAX_ANSWER_COUNT) {
    return {
      ok: false,
      errors: {
        answers: `No se pueden enviar más de ${MAX_ANSWER_COUNT} respuestas.`,
      },
    };
  }

  const parsed: SubmittedAnswer[] = [];
  const errors: FieldErrors = {};

  answers.forEach((rawAnswer, index) => {
    const answer =
      typeof rawAnswer === 'object' && rawAnswer !== null
        ? (rawAnswer as Record<string, unknown>)
        : null;

    if (!answer) {
      errors[`answers.${index}`] =
        'Cada respuesta debe incluir la pregunta y la opción seleccionada.';

      return;
    }

    const questionId = answer['questionId'];
    const answerOptionId = answer['answerOptionId'];
    const questionIdValid =
      typeof questionId === 'number' &&
      Number.isInteger(questionId) &&
      questionId > 0;
    const answerOptionIdValid =
      typeof answerOptionId === 'number' &&
      Number.isInteger(answerOptionId) &&
      answerOptionId > 0;

    if (!questionIdValid) {
      errors[`answers.${index}.questionId`] =
        'El identificador de la pregunta no es válido.';
    }

    if (!answerOptionIdValid) {
      errors[`answers.${index}.answerOptionId`] =
        'El identificador de la opción no es válido.';
    }

    if (questionIdValid && answerOptionIdValid) {
      parsed.push({
        questionId: questionId as number,
        answerOptionId: answerOptionId as number,
      });
    }
  });

  if (Object.keys(errors).length > 0) {
    return { ok: false, errors };
  }

  return { ok: true, data: { answers: parsed } };
}
