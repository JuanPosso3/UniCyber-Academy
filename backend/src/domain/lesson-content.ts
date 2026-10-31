import type { LessonType } from './lesson.js';

/**
 * Contrato JSON de las lecciones.
 *
 * El contenido se guarda en `Lesson.content` (columna JSON existente).
 * No se crean tablas para bloques ni actividades. Este archivo contiene
 * los tipos y la validación de la capa de dominio; Express y React no
 * participan en estas reglas.
 */

export const THEORY_BLOCK_TYPES = [
  'heading',
  'paragraph',
  'list',
  'table',
  'code',
  'callout',
  'link',
] as const;

export type TheoryBlockType = (typeof THEORY_BLOCK_TYPES)[number];

export const CALLOUT_VARIANTS = [
  'IMPORTANT',
  'WARNING',
  'TIP',
  'COMMON_MISTAKE',
  'INFO',
] as const;

export type CalloutVariant = (typeof CALLOUT_VARIANTS)[number];

export interface TheoryHeadingBlock {
  id: string;
  type: 'heading';
  content: string;
  level?: 2 | 3;
}

export interface TheoryParagraphBlock {
  id: string;
  type: 'paragraph';
  content: string;
}

export interface TheoryListBlock {
  id: string;
  type: 'list';
  style?: 'ordered' | 'unordered';
  items: string[];
}

export interface TheoryTableBlock {
  id: string;
  type: 'table';
  headers: string[];
  rows: string[][];
  caption?: string;
}

export interface TheoryCodeBlock {
  id: string;
  type: 'code';
  content: string;
  language?: string;
}

export interface TheoryCalloutBlock {
  id: string;
  type: 'callout';
  variant: CalloutVariant;
  content: string;
}

export interface TheoryLinkBlock {
  id: string;
  type: 'link';
  label: string;
  url: string;
  description?: string;
}

export type TheoryBlock =
  | TheoryHeadingBlock
  | TheoryParagraphBlock
  | TheoryListBlock
  | TheoryTableBlock
  | TheoryCodeBlock
  | TheoryCalloutBlock
  | TheoryLinkBlock;

export interface TheoryContent {
  schemaVersion: 1;
  blocks: TheoryBlock[];
}

export const LAB_ACTIVITY_TYPES = [
  'SINGLE_CHOICE',
  'IDENTIFY_SUSPICIOUS',
  'MULTIPLE_SELECT',
  'DECISION_STEPS',
  'ORDER_PROCEDURE',
  'CHAINED',
  'TERMINAL',
] as const;

export type LabActivityType = (typeof LAB_ACTIVITY_TYPES)[number];

export interface LabOption {
  id: string;
  text: string;
}

export interface DecisionStep {
  id: string;
  prompt: string;
  options: LabOption[];
}

export interface DecisionAnswer {
  stepId: string;
  optionId: string;
}

export interface TerminalCommand {
  command: string;
  output: string;
  description?: string;
}

export interface LabActivityBase {
  id: string;
  title: string;
  instructions: string;
  required?: boolean;
  hints?: string[];
}

export interface SingleChoiceActivity extends LabActivityBase {
  type: 'SINGLE_CHOICE';
  options: LabOption[];
  solution: { optionId: string };
}

export interface IdentifySuspiciousActivity extends LabActivityBase {
  type: 'IDENTIFY_SUSPICIOUS';
  elements: LabOption[];
  solution: { elementIds: string[] };
}

export interface MultipleSelectActivity extends LabActivityBase {
  type: 'MULTIPLE_SELECT';
  options: LabOption[];
  solution: { optionIds: string[] };
}

export interface DecisionStepsActivity extends LabActivityBase {
  type: 'DECISION_STEPS';
  steps: DecisionStep[];
  solution: { answers: DecisionAnswer[] };
}

export interface OrderProcedureActivity extends LabActivityBase {
  type: 'ORDER_PROCEDURE';
  items: LabOption[];
  solution: { order: string[] };
}

export interface ChainedActivity extends LabActivityBase {
  type: 'CHAINED';
  activities: LabActivity[];
}

export interface TerminalActivity extends LabActivityBase {
  type: 'TERMINAL';
  prompt?: string;
  welcome?: string;
  commands: TerminalCommand[];
  solution: { requiredCommands: string[] };
}

export type LabActivity =
  | SingleChoiceActivity
  | IdentifySuspiciousActivity
  | MultipleSelectActivity
  | DecisionStepsActivity
  | OrderProcedureActivity
  | ChainedActivity
  | TerminalActivity;

export interface LabContent {
  schemaVersion: 1;
  introduction: string;
  objective: string;
  scenario: string;
  activities: LabActivity[];
  completion?: { requiredActivityIds?: string[] };
}

export type LessonContent = TheoryContent | LabContent;

export interface ContentValidationIssue {
  path: string;
  code: string;
  message: string;
  blockId?: string;
  activityId?: string;
}

export interface ContentValidationResult {
  valid: boolean;
  issues: ContentValidationIssue[];
}

const MAX_TEXT_LENGTH = 20_000;
const MAX_SHORT_TEXT_LENGTH = 2_000;
const MAX_OPTION_TEXT_LENGTH = 1_000;
const MAX_ID_LENGTH = 100;

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function isNonEmptyString(value: unknown): value is string {
  return typeof value === 'string' && value.trim().length > 0;
}

function addIssue(
  issues: ContentValidationIssue[],
  path: string,
  code: string,
  message: string,
  identifiers: { blockId?: string; activityId?: string } = {},
): void {
  issues.push({ path, code, message, ...identifiers });
}

function validateId(
  value: unknown,
  path: string,
  issues: ContentValidationIssue[],
  seen: Set<string>,
  identifiers: { blockId?: string; activityId?: string } = {},
): string | null {
  if (!isNonEmptyString(value)) {
    addIssue(issues, path, 'REQUIRED', 'El identificador es obligatorio.', identifiers);
    return null;
  }

  const id = value.trim();

  if (id.length > MAX_ID_LENGTH) {
    addIssue(
      issues,
      path,
      'TOO_LONG',
      `El identificador no puede superar los ${MAX_ID_LENGTH} caracteres.`,
      identifiers,
    );
    return id;
  }

  if (seen.has(id)) {
    addIssue(
      issues,
      path,
      'DUPLICATE_ID',
      'El identificador debe ser único en la lección.',
      identifiers,
    );
  } else {
    seen.add(id);
  }

  return id;
}

function validateRequiredString(
  value: unknown,
  path: string,
  issues: ContentValidationIssue[],
  maxLength = MAX_TEXT_LENGTH,
  identifiers: { blockId?: string; activityId?: string } = {},
): string | null {
  if (!isNonEmptyString(value)) {
    addIssue(issues, path, 'REQUIRED', 'Este campo es obligatorio.', identifiers);
    return null;
  }

  const text = value.trim();

  if (text.length > maxLength) {
    addIssue(
      issues,
      path,
      'TOO_LONG',
      `El texto no puede superar los ${maxLength} caracteres.`,
      identifiers,
    );
  }

  return text;
}

function validateOptionalString(
  value: unknown,
  path: string,
  issues: ContentValidationIssue[],
  maxLength = MAX_SHORT_TEXT_LENGTH,
  identifiers: { blockId?: string; activityId?: string } = {},
): void {
  if (value === undefined) {
    return;
  }

  if (typeof value !== 'string') {
    addIssue(issues, path, 'INVALID_TYPE', 'Debe ser un texto.', identifiers);
    return;
  }

  if (value.length > maxLength) {
    addIssue(
      issues,
      path,
      'TOO_LONG',
      `El texto no puede superar los ${maxLength} caracteres.`,
      identifiers,
    );
  }
}

function validateStringArray(
  value: unknown,
  path: string,
  issues: ContentValidationIssue[],
  options: {
    min?: number;
    max?: number;
    maxLength?: number;
    identifiers?: { blockId?: string; activityId?: string };
  } = {},
): string[] | null {
  const { min = 1, max = 200, maxLength = MAX_OPTION_TEXT_LENGTH } = options;

  if (!Array.isArray(value)) {
    addIssue(issues, path, 'INVALID_TYPE', 'Debe ser una lista.', options.identifiers);
    return null;
  }

  if (value.length < min || value.length > max) {
    addIssue(
      issues,
      path,
      'INVALID_LENGTH',
      `La lista debe tener entre ${min} y ${max} elementos.`,
      options.identifiers,
    );
  }

  const result: string[] = [];

  value.forEach((item, index) => {
    if (!isNonEmptyString(item)) {
      addIssue(
        issues,
        `${path}[${index}]`,
        'REQUIRED',
        'El elemento no puede estar vacío.',
        options.identifiers,
      );
      return;
    }

    if (item.length > maxLength) {
      addIssue(
        issues,
        `${path}[${index}]`,
        'TOO_LONG',
        `El elemento no puede superar los ${maxLength} caracteres.`,
        options.identifiers,
      );
    }

    result.push(item);
  });

  return result;
}

function validateUrl(
  value: unknown,
  path: string,
  issues: ContentValidationIssue[],
  identifiers: { blockId?: string; activityId?: string } = {},
): string | null {
  const text = validateRequiredString(
    value,
    path,
    issues,
    MAX_SHORT_TEXT_LENGTH,
    identifiers,
  );

  if (!text) {
    return null;
  }

  try {
    const url = new URL(text);

    if (url.protocol !== 'https:' && url.protocol !== 'http:') {
      addIssue(
        issues,
        path,
        'INVALID_URL',
        'El enlace debe utilizar http o https.',
        identifiers,
      );
    }
  } catch {
    addIssue(
      issues,
      path,
      'INVALID_URL',
      'El enlace no tiene un formato válido.',
      identifiers,
    );
  }

  return text;
}

function validateOptions(
  value: unknown,
  path: string,
  issues: ContentValidationIssue[],
  activityId: string | undefined,
): LabOption[] | null {
  if (!Array.isArray(value)) {
    addIssue(issues, path, 'INVALID_TYPE', 'Las opciones deben ser una lista.', {
      activityId,
    });
    return null;
  }

  if (value.length < 2 || value.length > 50) {
    addIssue(
      issues,
      path,
      'INVALID_LENGTH',
      'La actividad debe tener entre 2 y 50 opciones.',
      { activityId },
    );
  }

  const ids = new Set<string>();
  const options: LabOption[] = [];

  value.forEach((item, index) => {
    const itemPath = `${path}[${index}]`;

    if (!isRecord(item)) {
      addIssue(issues, itemPath, 'INVALID_TYPE', 'La opción debe ser un objeto.', {
        activityId,
      });
      return;
    }

    const id = validateId(item['id'], `${itemPath}.id`, issues, ids, {
      activityId,
    });
    const text = validateRequiredString(
      item['text'],
      `${itemPath}.text`,
      issues,
      MAX_OPTION_TEXT_LENGTH,
      { activityId },
    );

    if (id && text) {
      options.push({ id, text });
    }
  });

  return options;
}

function validateTheoryBlock(
  value: unknown,
  path: string,
  issues: ContentValidationIssue[],
  ids: Set<string>,
): void {
  if (!isRecord(value)) {
    addIssue(issues, path, 'INVALID_TYPE', 'El bloque debe ser un objeto.');
    return;
  }

  const blockId = validateId(value['id'], `${path}.id`, issues, ids);
  const identifiers = blockId ? { blockId } : {};
  const type = value['type'];

  if (
    typeof type !== 'string' ||
    !(THEORY_BLOCK_TYPES as readonly string[]).includes(type)
  ) {
    addIssue(
      issues,
      `${path}.type`,
      'INVALID_TYPE',
      'El tipo de bloque no es válido.',
      identifiers,
    );
    return;
  }

  switch (type as TheoryBlockType) {
    case 'heading': {
      validateRequiredString(
        value['content'],
        `${path}.content`,
        issues,
        MAX_SHORT_TEXT_LENGTH,
        identifiers,
      );
      if (value['level'] !== undefined && value['level'] !== 2 && value['level'] !== 3) {
        addIssue(
          issues,
          `${path}.level`,
          'INVALID_VALUE',
          'El nivel del encabezado debe ser 2 o 3.',
          identifiers,
        );
      }
      break;
    }

    case 'paragraph': {
      validateRequiredString(
        value['content'],
        `${path}.content`,
        issues,
        MAX_TEXT_LENGTH,
        identifiers,
      );
      break;
    }

    case 'list': {
      if (
        value['style'] !== undefined &&
        value['style'] !== 'ordered' &&
        value['style'] !== 'unordered'
      ) {
        addIssue(
          issues,
          `${path}.style`,
          'INVALID_VALUE',
          'El estilo de lista debe ser ordered o unordered.',
          identifiers,
        );
      }
      validateStringArray(value['items'], `${path}.items`, issues, {
        min: 1,
        max: 200,
        identifiers,
      });
      break;
    }

    case 'table': {
      const headers = validateStringArray(
        value['headers'],
        `${path}.headers`,
        issues,
        { min: 1, max: 12, identifiers },
      );

      if (!Array.isArray(value['rows'])) {
        addIssue(
          issues,
          `${path}.rows`,
          'INVALID_TYPE',
          'Las filas deben ser una lista.',
          identifiers,
        );
      } else {
        if (value['rows'].length > 100) {
          addIssue(
            issues,
            `${path}.rows`,
            'INVALID_LENGTH',
            'La tabla no puede superar las 100 filas.',
            identifiers,
          );
        }

        value['rows'].forEach((row, rowIndex) => {
          const rowPath = `${path}.rows[${rowIndex}]`;

          if (!Array.isArray(row)) {
            addIssue(
              issues,
              rowPath,
              'INVALID_TYPE',
              'Cada fila debe ser una lista.',
              identifiers,
            );
            return;
          }

          if (headers && row.length !== headers.length) {
            addIssue(
              issues,
              rowPath,
              'INVALID_LENGTH',
              'Cada fila debe tener la misma cantidad de columnas que los encabezados.',
              identifiers,
            );
          }

          row.forEach((cell, cellIndex) => {
            if (typeof cell !== 'string') {
              addIssue(
                issues,
                `${rowPath}[${cellIndex}]`,
                'INVALID_TYPE',
                'La celda debe ser un texto.',
                identifiers,
              );
            } else if (cell.length > MAX_OPTION_TEXT_LENGTH) {
              addIssue(
                issues,
                `${rowPath}[${cellIndex}]`,
                'TOO_LONG',
                `La celda no puede superar los ${MAX_OPTION_TEXT_LENGTH} caracteres.`,
                identifiers,
              );
            }
          });
        });
      }

      validateOptionalString(
        value['caption'],
        `${path}.caption`,
        issues,
        MAX_SHORT_TEXT_LENGTH,
        identifiers,
      );
      break;
    }

    case 'code': {
      validateRequiredString(
        value['content'],
        `${path}.content`,
        issues,
        MAX_TEXT_LENGTH,
        identifiers,
      );
      validateOptionalString(
        value['language'],
        `${path}.language`,
        issues,
        50,
        identifiers,
      );
      break;
    }

    case 'callout': {
      if (
        typeof value['variant'] !== 'string' ||
        !(CALLOUT_VARIANTS as readonly string[]).includes(value['variant'])
      ) {
        addIssue(
          issues,
          `${path}.variant`,
          'INVALID_VALUE',
          'La variante del recuadro no es válida.',
          identifiers,
        );
      }
      validateRequiredString(
        value['content'],
        `${path}.content`,
        issues,
        MAX_TEXT_LENGTH,
        identifiers,
      );
      break;
    }

    case 'link': {
      validateRequiredString(
        value['label'],
        `${path}.label`,
        issues,
        MAX_SHORT_TEXT_LENGTH,
        identifiers,
      );
      validateUrl(value['url'], `${path}.url`, issues, identifiers);
      validateOptionalString(
        value['description'],
        `${path}.description`,
        issues,
        MAX_SHORT_TEXT_LENGTH,
        identifiers,
      );
      break;
    }
  }
}

function validateTheoryContent(
  content: Record<string, unknown>,
  issues: ContentValidationIssue[],
): void {
  if (!Array.isArray(content['blocks'])) {
    addIssue(
      issues,
      'blocks',
      'INVALID_TYPE',
      'La lección debe contener una lista de bloques.',
    );
    return;
  }

  if (content['blocks'].length === 0) {
    addIssue(
      issues,
      'blocks',
      'INVALID_LENGTH',
      'La lección debe contener al menos un bloque.',
    );
  }

  if (content['blocks'].length > 300) {
    addIssue(
      issues,
      'blocks',
      'INVALID_LENGTH',
      'La lección no puede superar los 300 bloques.',
    );
  }

  const ids = new Set<string>();

  content['blocks'].forEach((block, index) => {
    validateTheoryBlock(block, `blocks[${index}]`, issues, ids);
  });
}

function validateHints(
  value: unknown,
  path: string,
  issues: ContentValidationIssue[],
  activityId: string | undefined,
): void {
  if (value === undefined) {
    return;
  }

  if (!Array.isArray(value)) {
    addIssue(issues, path, 'INVALID_TYPE', 'Las pistas deben ser una lista.', {
      activityId,
    });
    return;
  }

  if (value.length > 10) {
    addIssue(issues, path, 'INVALID_LENGTH', 'No se permiten más de 10 pistas.', {
      activityId,
    });
  }

  value.forEach((hint, index) => {
    if (!isNonEmptyString(hint)) {
      addIssue(
        issues,
        `${path}[${index}]`,
        'REQUIRED',
        'La pista no puede estar vacía.',
        { activityId },
      );
    } else if (hint.length > MAX_SHORT_TEXT_LENGTH) {
      addIssue(
        issues,
        `${path}[${index}]`,
        'TOO_LONG',
        `La pista no puede superar los ${MAX_SHORT_TEXT_LENGTH} caracteres.`,
        { activityId },
      );
    }
  });
}

function validateSolutionId(
  value: unknown,
  path: string,
  issues: ContentValidationIssue[],
  validIds: Set<string>,
  activityId: string | undefined,
): void {
  if (!isNonEmptyString(value) || !validIds.has(value)) {
    addIssue(
      issues,
      path,
      'INVALID_SOLUTION',
      'La respuesta configurada debe referenciar una opción existente.',
      { activityId },
    );
  }
}

function validateSolutionIds(
  value: unknown,
  path: string,
  issues: ContentValidationIssue[],
  validIds: Set<string>,
  activityId: string | undefined,
  min = 1,
): void {
  if (!Array.isArray(value) || value.length < min) {
    addIssue(
      issues,
      path,
      'INVALID_SOLUTION',
      'La respuesta configurada debe contener al menos un identificador.',
      { activityId },
    );
    return;
  }

  const seen = new Set<string>();

  value.forEach((item, index) => {
    if (!isNonEmptyString(item) || !validIds.has(item)) {
      addIssue(
        issues,
        `${path}[${index}]`,
        'INVALID_SOLUTION',
        'La respuesta configurada debe referenciar un elemento existente.',
        { activityId },
      );
      return;
    }

    if (seen.has(item)) {
      addIssue(
        issues,
        `${path}[${index}]`,
        'DUPLICATE_ID',
        'La respuesta no debe repetir identificadores.',
        { activityId },
      );
    }

    seen.add(item);
  });
}

function validateActivity(
  value: unknown,
  path: string,
  issues: ContentValidationIssue[],
  globalIds: Set<string>,
  allowChained: boolean,
): void {
  if (!isRecord(value)) {
    addIssue(issues, path, 'INVALID_TYPE', 'La actividad debe ser un objeto.');
    return;
  }

  const activityId = validateId(value['id'], `${path}.id`, issues, globalIds) ?? undefined;
  const identifiers = activityId ? { activityId } : {};
  const type = value['type'];

  if (
    typeof type !== 'string' ||
    !(LAB_ACTIVITY_TYPES as readonly string[]).includes(type)
  ) {
    addIssue(
      issues,
      `${path}.type`,
      'INVALID_TYPE',
      'El tipo de actividad no es válido.',
      identifiers,
    );
    return;
  }

  validateRequiredString(
    value['title'],
    `${path}.title`,
    issues,
    MAX_SHORT_TEXT_LENGTH,
    identifiers,
  );
  validateRequiredString(
    value['instructions'],
    `${path}.instructions`,
    issues,
    MAX_TEXT_LENGTH,
    identifiers,
  );

  if (value['required'] !== undefined && typeof value['required'] !== 'boolean') {
    addIssue(
      issues,
      `${path}.required`,
      'INVALID_TYPE',
      'El campo required debe ser booleano.',
      identifiers,
    );
  }

  validateHints(value['hints'], `${path}.hints`, issues, activityId);

  switch (type as LabActivityType) {
    case 'SINGLE_CHOICE': {
      const options = validateOptions(
        value['options'],
        `${path}.options`,
        issues,
        activityId,
      );
      const solution = isRecord(value['solution']) ? value['solution'] : null;

      if (!solution) {
        addIssue(
          issues,
          `${path}.solution`,
          'REQUIRED',
          'La solución es obligatoria.',
          identifiers,
        );
      } else if (options) {
        validateSolutionId(
          solution['optionId'],
          `${path}.solution.optionId`,
          issues,
          new Set(options.map((option) => option.id)),
          activityId,
        );
      }
      break;
    }

    case 'IDENTIFY_SUSPICIOUS': {
      const elements = validateOptions(
        value['elements'],
        `${path}.elements`,
        issues,
        activityId,
      );
      const solution = isRecord(value['solution']) ? value['solution'] : null;

      if (!solution) {
        addIssue(
          issues,
          `${path}.solution`,
          'REQUIRED',
          'La solución es obligatoria.',
          identifiers,
        );
      } else if (elements) {
        validateSolutionIds(
          solution['elementIds'],
          `${path}.solution.elementIds`,
          issues,
          new Set(elements.map((element) => element.id)),
          activityId,
        );
      }
      break;
    }

    case 'MULTIPLE_SELECT': {
      const options = validateOptions(
        value['options'],
        `${path}.options`,
        issues,
        activityId,
      );
      const solution = isRecord(value['solution']) ? value['solution'] : null;

      if (!solution) {
        addIssue(
          issues,
          `${path}.solution`,
          'REQUIRED',
          'La solución es obligatoria.',
          identifiers,
        );
      } else if (options) {
        validateSolutionIds(
          solution['optionIds'],
          `${path}.solution.optionIds`,
          issues,
          new Set(options.map((option) => option.id)),
          activityId,
        );
      }
      break;
    }

    case 'DECISION_STEPS': {
      if (!Array.isArray(value['steps']) || value['steps'].length === 0) {
        addIssue(
          issues,
          `${path}.steps`,
          'INVALID_TYPE',
          'La actividad debe contener al menos un paso.',
          identifiers,
        );
        break;
      }

      if (value['steps'].length > 20) {
        addIssue(
          issues,
          `${path}.steps`,
          'INVALID_LENGTH',
          'La actividad no puede superar los 20 pasos.',
          identifiers,
        );
      }

      const stepIds = new Set<string>();
      const optionIdsByStep = new Map<string, Set<string>>();

      value['steps'].forEach((step, index) => {
        const stepPath = `${path}.steps[${index}]`;

        if (!isRecord(step)) {
          addIssue(issues, stepPath, 'INVALID_TYPE', 'El paso debe ser un objeto.', identifiers);
          return;
        }

        const stepId = validateId(step['id'], `${stepPath}.id`, issues, stepIds, identifiers);
        validateRequiredString(
          step['prompt'],
          `${stepPath}.prompt`,
          issues,
          MAX_SHORT_TEXT_LENGTH,
          identifiers,
        );
        const options = validateOptions(
          step['options'],
          `${stepPath}.options`,
          issues,
          activityId,
        );

        if (stepId && options) {
          optionIdsByStep.set(stepId, new Set(options.map((option) => option.id)));
        }
      });

      const solution = isRecord(value['solution']) ? value['solution'] : null;

      if (!solution) {
        addIssue(
          issues,
          `${path}.solution`,
          'REQUIRED',
          'La solución es obligatoria.',
          identifiers,
        );
        break;
      }

      if (!Array.isArray(solution['answers'])) {
        addIssue(
          issues,
          `${path}.solution.answers`,
          'INVALID_TYPE',
          'La solución debe contener las respuestas por paso.',
          identifiers,
        );
        break;
      }

      const answeredSteps = new Set<string>();

      solution['answers'].forEach((answer, index) => {
        const answerPath = `${path}.solution.answers[${index}]`;

        if (!isRecord(answer)) {
          addIssue(issues, answerPath, 'INVALID_TYPE', 'La respuesta debe ser un objeto.', identifiers);
          return;
        }

        const stepId = answer['stepId'];
        const optionId = answer['optionId'];

        if (!isNonEmptyString(stepId) || !stepIds.has(stepId)) {
          addIssue(
            issues,
            `${answerPath}.stepId`,
            'INVALID_SOLUTION',
            'La respuesta debe referenciar un paso existente.',
            identifiers,
          );
          return;
        }

        if (answeredSteps.has(stepId)) {
          addIssue(
            issues,
            `${answerPath}.stepId`,
            'DUPLICATE_ID',
            'No se debe responder dos veces el mismo paso.',
            identifiers,
          );
        }

        answeredSteps.add(stepId);

        const validOptions = optionIdsByStep.get(stepId);

        if (!isNonEmptyString(optionId) || !validOptions?.has(optionId)) {
          addIssue(
            issues,
            `${answerPath}.optionId`,
            'INVALID_SOLUTION',
            'La respuesta debe referenciar una opción existente del paso.',
            identifiers,
          );
        }
      });

      for (const stepId of stepIds) {
        if (!answeredSteps.has(stepId)) {
          addIssue(
            issues,
            `${path}.solution.answers`,
            'INVALID_SOLUTION',
            'La solución debe incluir una respuesta para cada paso.',
            identifiers,
          );
          break;
        }
      }
      break;
    }

    case 'ORDER_PROCEDURE': {
      const items = validateOptions(
        value['items'],
        `${path}.items`,
        issues,
        activityId,
      );
      const solution = isRecord(value['solution']) ? value['solution'] : null;

      if (!solution) {
        addIssue(
          issues,
          `${path}.solution`,
          'REQUIRED',
          'La solución es obligatoria.',
          identifiers,
        );
      } else if (items) {
        const order = solution['order'];

        if (!Array.isArray(order)) {
          addIssue(
            issues,
            `${path}.solution.order`,
            'INVALID_TYPE',
            'El orden debe ser una lista.',
            identifiers,
          );
        } else {
          const itemIds = new Set(items.map((item) => item.id));

          if (order.length !== items.length) {
            addIssue(
              issues,
              `${path}.solution.order`,
              'INVALID_LENGTH',
              'El orden debe incluir todos los elementos una sola vez.',
              identifiers,
            );
          }

          const seen = new Set<string>();

          order.forEach((item, index) => {
            if (!isNonEmptyString(item) || !itemIds.has(item)) {
              addIssue(
                issues,
                `${path}.solution.order[${index}]`,
                'INVALID_SOLUTION',
                'El orden debe referenciar elementos existentes.',
                identifiers,
              );
              return;
            }

            if (seen.has(item)) {
              addIssue(
                issues,
                `${path}.solution.order[${index}]`,
                'DUPLICATE_ID',
                'El orden no debe repetir elementos.',
                identifiers,
              );
            }

            seen.add(item);
          });
        }
      }
      break;
    }

    case 'CHAINED': {
      if (!allowChained) {
        addIssue(
          issues,
          `${path}.type`,
          'INVALID_NESTING',
          'Una actividad encadenada no puede contener otra actividad encadenada.',
          identifiers,
        );
        break;
      }

      if (!Array.isArray(value['activities']) || value['activities'].length === 0) {
        addIssue(
          issues,
          `${path}.activities`,
          'INVALID_TYPE',
          'La actividad encadenada debe contener al menos una actividad.',
          identifiers,
        );
        break;
      }

      if (value['activities'].length > 20) {
        addIssue(
          issues,
          `${path}.activities`,
          'INVALID_LENGTH',
          'La actividad encadenada no puede superar las 20 actividades.',
          identifiers,
        );
      }

      value['activities'].forEach((child, index) => {
        validateActivity(
          child,
          `${path}.activities[${index}]`,
          issues,
          globalIds,
          false,
        );
      });
      break;
    }

    case 'TERMINAL': {
      validateOptionalString(
        value['prompt'],
        `${path}.prompt`,
        issues,
        200,
        identifiers,
      );
      validateOptionalString(
        value['welcome'],
        `${path}.welcome`,
        issues,
        MAX_SHORT_TEXT_LENGTH,
        identifiers,
      );

      if (!Array.isArray(value['commands']) || value['commands'].length === 0) {
        addIssue(
          issues,
          `${path}.commands`,
          'INVALID_TYPE',
          'La terminal debe contener al menos un comando.',
          identifiers,
        );
        break;
      }

      if (value['commands'].length > 200) {
        addIssue(
          issues,
          `${path}.commands`,
          'INVALID_LENGTH',
          'La terminal no puede superar los 200 comandos.',
          identifiers,
        );
      }

      const commands = new Set<string>();

      value['commands'].forEach((command, index) => {
        const commandPath = `${path}.commands[${index}]`;

        if (!isRecord(command)) {
          addIssue(issues, commandPath, 'INVALID_TYPE', 'El comando debe ser un objeto.', identifiers);
          return;
        }

        const commandText = validateRequiredString(
          command['command'],
          `${commandPath}.command`,
          issues,
          200,
          identifiers,
        );
        validateRequiredString(
          command['output'],
          `${commandPath}.output`,
          issues,
          MAX_SHORT_TEXT_LENGTH,
          identifiers,
        );
        validateOptionalString(
          command['description'],
          `${commandPath}.description`,
          issues,
          MAX_SHORT_TEXT_LENGTH,
          identifiers,
        );

        if (commandText) {
          if (commands.has(commandText)) {
            addIssue(
              issues,
              `${commandPath}.command`,
              'DUPLICATE_ID',
              'No se debe repetir un comando.',
              identifiers,
            );
          }
          commands.add(commandText);
        }
      });

      const solution = isRecord(value['solution']) ? value['solution'] : null;

      if (!solution) {
        addIssue(
          issues,
          `${path}.solution`,
          'REQUIRED',
          'La solución es obligatoria.',
          identifiers,
        );
      } else {
        validateSolutionIds(
          solution['requiredCommands'],
          `${path}.solution.requiredCommands`,
          issues,
          commands,
          activityId,
        );
      }
      break;
    }
  }
}

function validateLabContent(
  content: Record<string, unknown>,
  issues: ContentValidationIssue[],
): void {
  validateRequiredString(
    content['introduction'],
    'introduction',
    issues,
    MAX_TEXT_LENGTH,
  );
  validateRequiredString(
    content['objective'],
    'objective',
    issues,
    MAX_SHORT_TEXT_LENGTH,
  );
  validateRequiredString(
    content['scenario'],
    'scenario',
    issues,
    MAX_TEXT_LENGTH,
  );

  if (!Array.isArray(content['activities'])) {
    addIssue(
      issues,
      'activities',
      'INVALID_TYPE',
      'El laboratorio debe contener una lista de actividades.',
    );
    return;
  }

  if (content['activities'].length === 0) {
    addIssue(
      issues,
      'activities',
      'INVALID_LENGTH',
      'El laboratorio debe contener al menos una actividad.',
    );
  }

  if (content['activities'].length > 100) {
    addIssue(
      issues,
      'activities',
      'INVALID_LENGTH',
      'El laboratorio no puede superar las 100 actividades.',
    );
  }

  const ids = new Set<string>();

  content['activities'].forEach((activity, index) => {
    validateActivity(activity, `activities[${index}]`, issues, ids, true);
  });

  const completion = content['completion'];

  if (completion !== undefined) {
    if (!isRecord(completion)) {
      addIssue(
        issues,
        'completion',
        'INVALID_TYPE',
        'La configuración de finalización debe ser un objeto.',
      );
    } else if (completion['requiredActivityIds'] !== undefined) {
      validateStringArray(
        completion['requiredActivityIds'],
        'completion.requiredActivityIds',
        issues,
        { min: 1, max: 200 },
      );
    }
  }
}

export function validateLessonContent(
  type: LessonType,
  content: unknown,
): ContentValidationResult {
  const issues: ContentValidationIssue[] = [];

  if (!isRecord(content)) {
    addIssue(
      issues,
      'content',
      'INVALID_TYPE',
      'El contenido debe ser un objeto JSON.',
    );
    return { valid: false, issues };
  }

  if (content['schemaVersion'] !== 1) {
    addIssue(
      issues,
      'schemaVersion',
      'INVALID_VERSION',
      'La versión del esquema debe ser 1.',
    );
  }

  if (type === 'THEORY') {
    validateTheoryContent(content, issues);
  } else {
    validateLabContent(content, issues);
  }

  return { valid: issues.length === 0, issues };
}

/* -------------------------------------------------------------------------- */
/* Representación pública y utilidades de laboratorio                         */
/* -------------------------------------------------------------------------- */

function stripActivitySolution(activity: LabActivity): LabActivity {
  const publicActivity = { ...activity } as LabActivity & {
    solution?: unknown;
  };

  delete publicActivity.solution;

  if (publicActivity.type === 'CHAINED') {
    publicActivity.activities = publicActivity.activities.map(
      stripActivitySolution,
    );
  }

  return publicActivity;
}

/**
 * Genera la representación que puede recibir el navegador del estudiante.
 * Elimina las soluciones y las reglas privadas de validación.
 */
export function sanitizeLabContent(content: LabContent): LabContent {
  return {
    ...content,
    activities: content.activities.map(stripActivitySolution),
  };
}

export interface LeafActivity {
  activity: LabActivity;
  required: boolean;
}

/**
 * Aplana las actividades encadenadas y conserva la obligatoriedad
 * heredada del contenedor.
 */
export function collectLeafActivities(
  activities: readonly LabActivity[],
  inheritedRequired = true,
): LeafActivity[] {
  const result: LeafActivity[] = [];

  for (const activity of activities) {
    const required = inheritedRequired && activity.required !== false;

    if (activity.type === 'CHAINED') {
      result.push(...collectLeafActivities(activity.activities, required));
    } else {
      result.push({ activity, required });
    }
  }

  return result;
}

export function findLeafActivity(
  content: LabContent,
  activityId: string,
): LabActivity | null {
  const leaf = collectLeafActivities(content.activities).find(
    (item) => item.activity.id === activityId,
  );

  return leaf?.activity ?? null;
}

function stringArray(value: unknown): string[] | null {
  if (!Array.isArray(value)) {
    return null;
  }

  return value.every((item) => typeof item === 'string')
    ? (value as string[])
    : null;
}

function sameStringSet(left: readonly string[], right: readonly string[]): boolean {
  if (left.length !== right.length) {
    return false;
  }

  const leftSet = new Set(left);
  const rightSet = new Set(right);

  if (leftSet.size !== rightSet.size) {
    return false;
  }

  for (const item of leftSet) {
    if (!rightSet.has(item)) {
      return false;
    }
  }

  return true;
}

function sameStringOrder(left: readonly string[], right: readonly string[]): boolean {
  return (
    left.length === right.length &&
    left.every((item, index) => item === right[index])
  );
}

/**
 * Verificación privada de una respuesta. Nunca devuelve la solución.
 */
export function isActivityAnswerCorrect(
  activity: LabActivity,
  answer: unknown,
): boolean {
  if (!isRecord(answer)) {
    return false;
  }

  switch (activity.type) {
    case 'SINGLE_CHOICE':
      return answer['optionId'] === activity.solution.optionId;

    case 'IDENTIFY_SUSPICIOUS': {
      const selected = stringArray(answer['elementIds']);
      return selected !== null && sameStringSet(selected, activity.solution.elementIds);
    }

    case 'MULTIPLE_SELECT': {
      const selected = stringArray(answer['optionIds']);
      return selected !== null && sameStringSet(selected, activity.solution.optionIds);
    }

    case 'DECISION_STEPS': {
      if (!Array.isArray(answer['answers'])) {
        return false;
      }

      const received = new Map<string, string>();

      for (const item of answer['answers']) {
        if (
          !isRecord(item) ||
          typeof item['stepId'] !== 'string' ||
          typeof item['optionId'] !== 'string' ||
          received.has(item['stepId'])
        ) {
          return false;
        }

        received.set(item['stepId'], item['optionId']);
      }

      if (received.size !== activity.steps.length) {
        return false;
      }

      return activity.solution.answers.every(
        (expected) => received.get(expected.stepId) === expected.optionId,
      );
    }

    case 'ORDER_PROCEDURE': {
      const order = stringArray(answer['order']);
      return order !== null && sameStringOrder(order, activity.solution.order);
    }

    case 'TERMINAL': {
      const commands = stringArray(answer['commands']);

      if (commands === null) {
        return false;
      }

      const allowed = new Set(activity.commands.map((item) => item.command));

      if (!commands.every((command) => allowed.has(command.trim()))) {
        return false;
      }

      const executed = new Set(commands.map((command) => command.trim()));

      return activity.solution.requiredCommands.every((command) =>
        executed.has(command),
      );
    }

    case 'CHAINED':
      return false;
  }
}

export function getTerminalCommandOutput(
  activity: TerminalActivity,
  command: string,
): string | null {
  const normalized = command.trim();
  const match = activity.commands.find(
    (item) => item.command === normalized,
  );

  return match?.output ?? null;
}

export function isTheoryContent(
  content: unknown,
): content is TheoryContent {
  return isRecord(content) && content['schemaVersion'] === 1 && Array.isArray(content['blocks']);
}

export function isLabContent(content: unknown): content is LabContent {
  return (
    isRecord(content) &&
    content['schemaVersion'] === 1 &&
    Array.isArray(content['activities'])
  );
}
