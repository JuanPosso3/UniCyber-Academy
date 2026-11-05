/**
 * Reglas de dominio para las evaluaciones finales de curso.
 *
 * Estas reglas son independientes de HTTP y de la base de datos: operan
 * sobre datos primitivos y devuelven errores de validación descriptivos.
 */

export type QuestionType = 'MULTIPLE_CHOICE' | 'TRUE_FALSE';

export type ContentStatus = 'DRAFT' | 'ACTIVE' | 'ARCHIVED';

/** Cantidad fija de preguntas por evaluación final. */
export const FINAL_ASSESSMENT_QUESTION_COUNT = 8;

/** Cantidad de opciones de una pregunta de selección múltiple. */
export const MULTIPLE_CHOICE_OPTION_COUNT = 4;

/** Cantidad de opciones de una pregunta de verdadero o falso. */
export const TRUE_FALSE_OPTION_COUNT = 2;

/** Puntaje mínimo de aprobación en porcentaje. */
export const FINAL_ASSESSMENT_PASSING_SCORE = 80;

/** Cantidad mínima de respuestas correctas para aprobar. */
export const FINAL_ASSESSMENT_MIN_CORRECT_ANSWERS = 7;

/** Valor porcentual de cada pregunta: 100 / 8. */
export const FINAL_ASSESSMENT_QUESTION_WEIGHT = 12.5;

/** Etiquetas fijas de la opción de verdadero o falso. */
export const TRUE_FALSE_OPTIONS = ['Verdadero', 'Falso'] as const;

/**Cantidad máxima de caracteres del enunciado y textos de pregunta. */
export const MAX_QUESTION_TEXT_LENGTH = 600;

export const MULTIPLE_CHOICE_OPTIONS_LABELS = ['A', 'B', 'C', 'D'] as const;

export interface QuestionOptionInput {
  text: string;
  isCorrect: boolean;
}

export interface QuestionInput {
  statement: string;
  type: QuestionType;
  explanation: string;
  hint: string | null;
  options: QuestionOptionInput[];
}

export interface AssessmentIssue {
  path: string;
  message: string;
}

export function isQuestionType(value: unknown): value is QuestionType {
  return value === 'MULTIPLE_CHOICE' || value === 'TRUE_FALSE';
}

export function isContentStatusValue(value: unknown): value is ContentStatus {
  return value === 'DRAFT' || value === 'ACTIVE' || value === 'ARCHIVED';
}

export function isScorePassing(score: number): boolean {
  return score >= FINAL_ASSESSMENT_MIN_CORRECT_ANSWERS * FINAL_ASSESSMENT_QUESTION_WEIGHT;
}

/**
 * Convierte una cantidad de respuestas correctas en un porcentaje.
 *
 * Cada pregunta vale igual (12.5 %), por lo que 7 de 8 equivalen a 87.5 %
 * (aprobado) y 6 de 8 a 75 % (no aprobado), sin redondeos.
 */
export function scoreFromCorrectAnswers(correctCount: number): number {
  const score =
    correctCount * FINAL_ASSESSMENT_QUESTION_WEIGHT;

  return Math.round(score * 100) / 100;
}

/**
 * Valida la estructura completa de las preguntas de una evaluación
 * final: cantidad fija, integridad de enunciados, explicaciones y
 * opciones, y presencia de ambos tipos de pregunta.
 */
export function validateAssessmentQuestions(
  questions: unknown,
): { valid: boolean; issues: AssessmentIssue[] } {
  const issues: AssessmentIssue[] = [];
  const push = (path: string, message: string): void => {
    issues.push({ path, message });
  };

  if (!Array.isArray(questions)) {
    push('questions', 'Las preguntas deben enviarse en una lista.');

    return { valid: false, issues };
  }

  if (questions.length !== FINAL_ASSESSMENT_QUESTION_COUNT) {
    push(
      'questions',
      `La evaluación final debe tener exactamente ${FINAL_ASSESSMENT_QUESTION_COUNT} preguntas.`,
    );
  }

  const types: QuestionType[] = [];

  questions.forEach((rawQuestion, index) => {
    const path = `questions.${index}`;
    const question = typeof rawQuestion === 'object' && rawQuestion !== null
      ? (rawQuestion as Record<string, unknown>)
      : null;

    if (!question) {
      push(path, 'Cada pregunta debe ser un objeto.');

      return;
    }

    const statement =
      typeof question['statement'] === 'string'
        ? question['statement'].trim()
        : '';
    const type = question['type'];
    const explanation =
      typeof question['explanation'] === 'string'
        ? question['explanation'].trim()
        : '';
    const hintRaw = question['hint'];
    const options = question['options'];

    if (statement.length === 0) {
      push(`${path}.statement`, 'El enunciado es obligatorio.');
    } else if (statement.length > MAX_QUESTION_TEXT_LENGTH) {
      push(
        `${path}.statement`,
        `El enunciado no puede superar los ${MAX_QUESTION_TEXT_LENGTH} caracteres.`,
      );
    }

    if (!isQuestionType(type)) {
      push(
        `${path}.type`,
        'El tipo de pregunta debe ser MULTIPLE_CHOICE o TRUE_FALSE.',
      );

      return;
    }

    types.push(type);

    if (explanation.length === 0) {
      push(
        `${path}.explanation`,
        'Cada pregunta debe tener una explicación del concepto.',
      );
    } else if (explanation.length > MAX_QUESTION_TEXT_LENGTH) {
      push(
        `${path}.explanation`,
        `La explicación no puede superar los ${MAX_QUESTION_TEXT_LENGTH} caracteres.`,
      );
    }

    if (hintRaw !== null && hintRaw !== undefined) {
      if (typeof hintRaw !== 'string') {
        push(`${path}.hint`, 'La orientación debe ser un texto.');
      } else if (hintRaw.trim().length > MAX_QUESTION_TEXT_LENGTH) {
        push(
          `${path}.hint`,
          `La orientación no puede superar los ${MAX_QUESTION_TEXT_LENGTH} caracteres.`,
        );
      }
    }

    if (!Array.isArray(options)) {
      push(`${path}.options`, 'Las opciones deben enviarse en una lista.');

      return;
    }

    const expectedOptions =
      type === 'MULTIPLE_CHOICE'
        ? MULTIPLE_CHOICE_OPTION_COUNT
        : TRUE_FALSE_OPTION_COUNT;

    if (options.length !== expectedOptions) {
      push(
        `${path}.options`,
        type === 'MULTIPLE_CHOICE'
          ? 'Las preguntas de selección múltiple deben tener exactamente 4 opciones.'
          : 'Las preguntas de verdadero o falso deben tener exactamente 2 opciones.',
      );
    }

    const texts: string[] = [];
    let correctCount = 0;

    options.forEach((rawOption, optionIndex) => {
      const optionPath = `${path}.options.${optionIndex}`;
      const option =
        typeof rawOption === 'object' && rawOption !== null
          ? (rawOption as Record<string, unknown>)
          : null;

      if (!option) {
        push(optionPath, 'Cada opción debe ser un objeto.');

        return;
      }

      const text = typeof option['text'] === 'string'
        ? option['text'].trim()
        : '';
      const isCorrect = option['isCorrect'];

      if (text.length === 0) {
        push(`${optionPath}.text`, 'El texto de la opción es obligatorio.');
      } else if (text.length > MAX_QUESTION_TEXT_LENGTH) {
        push(
          `${optionPath}.text`,
          `El texto de la opción no puede superar los ${MAX_QUESTION_TEXT_LENGTH} caracteres.`,
        );
      } else if (texts.includes(text.toLowerCase())) {
        push(`${optionPath}.text`, 'Las opciones no pueden repetirse.');
      } else {
        texts.push(text.toLowerCase());
      }

      if (
        type === 'TRUE_FALSE' &&
        text.length > 0 &&
        !TRUE_FALSE_OPTIONS.some(
          (label) => label.toLowerCase() === text.toLowerCase(),
        )
      ) {
        push(
          `${optionPath}.text`,
          'Las preguntas de verdadero o falso solo pueden tener las opciones "Verdadero" y "Falso".',
        );
      }

      if (typeof isCorrect !== 'boolean') {
        push(
          `${optionPath}.isCorrect`,
          'Debes indicar si la opción es correcta.',
        );
      } else if (isCorrect) {
        correctCount += 1;
      }
    });

    if (correctCount !== 1) {
      push(
        `${path}.options`,
        'Cada pregunta debe tener exactamente una opción correcta.',
      );
    }
  });

  if (types.includes('MULTIPLE_CHOICE') === false) {
    push(
      'questions',
      'La evaluación debe incluir al menos una pregunta de selección múltiple.',
    );
  }

  if (types.includes('TRUE_FALSE') === false) {
    push(
      'questions',
      'La evaluación debe incluir al menos una pregunta de verdadero o falso.',
    );
  }

  return { valid: issues.length === 0, issues };
}
