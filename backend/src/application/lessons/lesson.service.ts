import type { JsonValue } from '@prisma/orm-postgres/target/codec-types';
import { db } from '../../prisma/db.js';
import { isAvailableToStudents, type ContentStatus } from '../../domain/content.js';
import {
  canTransitionLessonStatus,
  type LessonType,
} from '../../domain/lesson.js';
import {
  collectLeafActivities,
  findLeafActivity,
  getTerminalCommandOutput,
  isActivityAnswerCorrect,
  isLabContent,
  isTheoryContent,
  sanitizeLabContent,
  validateLessonContent,
  type ContentValidationIssue,
  type LabActivity,
  type LabContent,
  type TerminalActivity,
  type TheoryContent,
} from '../../domain/lesson-content.js';
import { AppError } from '../../infrastructure/http/errors.js';
import { getCourseFinalAssessmentSummary } from '../assessments/assessment.service.js';
import { evaluateAndUnlockAchievements } from '../achievements/achievement.service.js';
import type { ModuleSummary } from '../courses/course.types.js';
import type {
  ActivityCheckResponse,
  AdminLesson,
  AdminLessonList,
  AdminLessonResponse,
  AdminLessonSummary,
  CourseProgressSummary,
  CreateLessonInput,
  LearningCourse,
  LearningLesson,
  LearningModule,
  LessonCompletionResponse,
  LessonContentValidationResponse,
  LessonSummary,
  MoveLessonInput,
  StudentLesson,
  StudentLessonResponse,
  TerminalResponse,
  UpdateLessonInput,
  ValidateLessonContentInput,
} from './lesson.types.js';

const COURSE_NOT_FOUND_MESSAGE = 'El curso no existe.';
const COURSE_NOT_AVAILABLE_MESSAGE =
  'El curso no está disponible para estudiantes.';
const MODULE_NOT_FOUND_MESSAGE = 'El módulo no existe en este curso.';
const LESSON_NOT_FOUND_MESSAGE =
  'La lección no existe en este módulo.';
const LESSON_NOT_AVAILABLE_MESSAGE =
  'La lección no está disponible para estudiantes.';
const LESSON_LOCKED_MESSAGE =
  'Debes completar las lecciones anteriores para acceder a esta lección.';
const ARCHIVED_COURSE_MESSAGE =
  'No se pueden modificar las lecciones de un curso archivado.';
const INVALID_CONTENT_MESSAGE =
  'El contenido de la lección no es válido.';
const LAB_NOT_COMPLETED_MESSAGE =
  'Aún no has completado todas las actividades obligatorias.';
const ACTIVITY_NOT_FOUND_MESSAGE =
  'La actividad no existe en este laboratorio.';

interface CourseRow {
  id: number;
  title: string;
  description: string | null;
  status: ContentStatus;
  createdAt: string;
  updatedAt: string;
}

interface ModuleRow {
  id: number;
  courseId: number;
  title: string;
  description: string | null;
  order: number;
  status: ContentStatus;
  createdAt: string;
  updatedAt: string;
}

interface LessonRow {
  id: number;
  moduleId: number;
  title: string;
  content: unknown;
  type: LessonType;
  order: number;
  status: ContentStatus;
  createdAt: string;
  updatedAt: string;
}

interface ProgressRow {
  userId: number;
  lessonId: number;
  completedAt: string;
}

function toCourseSummaryBase(course: CourseRow) {
  return {
    id: course.id,
    title: course.title,
    description: course.description,
    status: course.status,
    createdAt: course.createdAt,
    updatedAt: course.updatedAt,
  };
}

function toModuleSummary(module: ModuleRow): ModuleSummary {
  return {
    id: module.id,
    courseId: module.courseId,
    title: module.title,
    description: module.description,
    order: module.order,
    status: module.status,
    createdAt: module.createdAt,
    updatedAt: module.updatedAt,
  };
}

function toLessonSummary(lesson: LessonRow): LessonSummary {
  return {
    id: lesson.id,
    moduleId: lesson.moduleId,
    title: lesson.title,
    type: lesson.type,
    order: lesson.order,
    status: lesson.status,
    createdAt: lesson.createdAt,
    updatedAt: lesson.updatedAt,
  };
}

function invalidStatusTransition(): never {
  throw new AppError(
    409,
    'INVALID_STATUS_TRANSITION',
    'La transición de estado solicitada no está permitida.',
  );
}

function invalidContentError(
  issues: ContentValidationIssue[],
  statusCode = 400,
): never {
  throw new AppError(
    statusCode,
    'INVALID_CONTENT',
    INVALID_CONTENT_MESSAGE,
    undefined,
    issues,
  );
}

async function findCourse(courseId: number): Promise<CourseRow> {
  const course = await db.orm.public.Course.first({ id: courseId });

  if (!course) {
    throw new AppError(404, 'COURSE_NOT_FOUND', COURSE_NOT_FOUND_MESSAGE);
  }

  return course;
}

async function findModule(
  courseId: number,
  moduleId: number,
): Promise<ModuleRow> {
  const module = await db.orm.public.Module.first({ id: moduleId });

  if (!module || module.courseId !== courseId) {
    throw new AppError(404, 'MODULE_NOT_FOUND', MODULE_NOT_FOUND_MESSAGE);
  }

  return module;
}

async function findLesson(
  courseId: number,
  moduleId: number,
  lessonId: number,
): Promise<{ lesson: LessonRow; module: ModuleRow; course: CourseRow }> {
  const course = await findCourse(courseId);
  const module = await findModule(courseId, moduleId);
  const lesson = await db.orm.public.Lesson.first({ id: lessonId });

  if (!lesson || lesson.moduleId !== moduleId) {
    throw new AppError(404, 'LESSON_NOT_FOUND', LESSON_NOT_FOUND_MESSAGE);
  }

  return {
    lesson: lesson as LessonRow,
    module,
    course,
  };
}

function ensureCourseEditable(course: CourseRow): void {
  if (course.status === 'ARCHIVED') {
    throw new AppError(409, 'COURSE_ARCHIVED', ARCHIVED_COURSE_MESSAGE);
  }
}

async function getProgressCounts(
  lessonIds: readonly number[],
): Promise<Map<number, number>> {
  const counts = new Map<number, number>();

  if (lessonIds.length === 0) {
    return counts;
  }

  const progressRows = await db.orm.public.LessonProgress
    .where((progress) => progress.lessonId.in(lessonIds))
    .all();

  for (const progress of progressRows) {
    counts.set(progress.lessonId, (counts.get(progress.lessonId) ?? 0) + 1);
  }

  return counts;
}

function toAdminSummary(
  lesson: LessonRow,
  progressCount: number,
): AdminLessonSummary {
  return {
    ...toLessonSummary(lesson),
    progressCount,
  };
}

function parseStoredLabContent(lesson: LessonRow): LabContent {
  if (!isLabContent(lesson.content)) {
    throw new AppError(
      500,
      'INVALID_STORED_CONTENT',
      'El contenido guardado del laboratorio no es válido.',
    );
  }

  return lesson.content;
}

function parseStoredTheoryContent(lesson: LessonRow): TheoryContent {
  if (!isTheoryContent(lesson.content)) {
    throw new AppError(
      500,
      'INVALID_STORED_CONTENT',
      'El contenido guardado de la lección no es válido.',
    );
  }

  return lesson.content;
}

function assertLabActivity(
  content: LabContent,
  activityId: string,
): LabActivity {
  const activity = findLeafActivity(content, activityId);

  if (!activity) {
    throw new AppError(404, 'ACTIVITY_NOT_FOUND', ACTIVITY_NOT_FOUND_MESSAGE);
  }

  return activity;
}

function assertTerminalActivity(
  content: LabContent,
  activityId: string,
): TerminalActivity {
  const activity = assertLabActivity(content, activityId);

  if (activity.type !== 'TERMINAL') {
    throw new AppError(
      409,
      'ACTIVITY_NOT_TERMINAL',
      'La actividad indicada no es una terminal simulada.',
    );
  }

  return activity;
}

function activityCheckMessage(correct: boolean): string {
  return correct
    ? 'Respuesta correcta.'
    : 'Respuesta incorrecta. Inténtalo nuevamente.';
}

/* -------------------------------------------------------------------------- */
/* Administración de lecciones                                                */
/* -------------------------------------------------------------------------- */

export async function listAdminLessons(
  courseId: number,
  moduleId: number,
): Promise<AdminLessonList> {
  const course = await findCourse(courseId);
  const module = await findModule(courseId, moduleId);
  const lessons = await db.orm.public.Lesson
    .where({ moduleId })
    .orderBy((lesson) => lesson.order.asc())
    .all();
  const counts = await getProgressCounts(lessons.map((lesson) => lesson.id));

  return {
    course: {
      id: course.id,
      title: course.title,
      status: course.status,
    },
    module: toModuleSummary(module),
    lessons: lessons.map((lesson) =>
      toAdminSummary(lesson as LessonRow, counts.get(lesson.id) ?? 0),
    ),
  };
}

export async function getAdminLesson(
  courseId: number,
  moduleId: number,
  lessonId: number,
): Promise<AdminLessonResponse> {
  const { lesson, module, course } = await findLesson(
    courseId,
    moduleId,
    lessonId,
  );
  const counts = await getProgressCounts([lesson.id]);

  return {
    course: {
      id: course.id,
      title: course.title,
      status: course.status,
    },
    module: toModuleSummary(module),
    lesson: {
      ...toAdminSummary(lesson, counts.get(lesson.id) ?? 0),
      content: lesson.content as unknown as AdminLesson['content'],
    },
  };
}

export async function createLesson(
  courseId: number,
  moduleId: number,
  input: CreateLessonInput,
): Promise<AdminLessonSummary> {
  const validation = validateLessonContent(input.type, input.content);

  if (!validation.valid) {
    invalidContentError(validation.issues);
  }

  const created = await db.transaction(async (tx) => {
    const course = await tx.orm.public.Course.first({ id: courseId });

    if (!course) {
      throw new AppError(404, 'COURSE_NOT_FOUND', COURSE_NOT_FOUND_MESSAGE);
    }

    ensureCourseEditable(course as CourseRow);

    const module = await tx.orm.public.Module.first({ id: moduleId });

    if (!module || module.courseId !== courseId) {
      throw new AppError(404, 'MODULE_NOT_FOUND', MODULE_NOT_FOUND_MESSAGE);
    }

    const lastLesson = await tx.orm.public.Lesson
      .where({ moduleId })
      .orderBy((lesson) => lesson.order.desc())
      .first();

    return tx.orm.public.Lesson.create({
      moduleId,
      title: input.title,
      type: input.type,
      content: input.content as unknown as JsonValue,
      order: (lastLesson?.order ?? 0) + 1,
      status: 'DRAFT',
    });
  });

  return toAdminSummary(created as LessonRow, 0);
}

export async function updateLesson(
  courseId: number,
  moduleId: number,
  lessonId: number,
  input: UpdateLessonInput,
): Promise<AdminLesson> {
  const { lesson, course } = await findLesson(courseId, moduleId, lessonId);
  ensureCourseEditable(course);

  const nextType = input.type ?? lesson.type;
  const shouldValidateContent =
    input.content !== undefined ||
    (input.type !== undefined && input.type !== lesson.type);

  if (shouldValidateContent) {
    const validation = validateLessonContent(
      nextType,
      input.content ?? lesson.content,
    );

    if (!validation.valid) {
      invalidContentError(validation.issues);
    }
  }

  const data: {
    title?: string;
    type?: LessonType;
    content?: JsonValue;
  } = {};

  if (input.title !== undefined) {
    data.title = input.title;
  }

  if (input.type !== undefined) {
    data.type = input.type;
  }

  if (input.content !== undefined) {
    data.content = input.content as unknown as JsonValue;
  }

  const updated = await db.orm.public.Lesson
    .where({ id: lessonId })
    .update(data);

  if (!updated) {
    throw new AppError(404, 'LESSON_NOT_FOUND', LESSON_NOT_FOUND_MESSAGE);
  }

  const counts = await getProgressCounts([lessonId]);

  return {
    ...toAdminSummary(updated as LessonRow, counts.get(lessonId) ?? 0),
    content: updated.content as unknown as AdminLesson['content'],
  };
}

export async function changeLessonStatus(
  courseId: number,
  moduleId: number,
  lessonId: number,
  nextStatus: ContentStatus,
): Promise<AdminLessonSummary> {
  const { lesson, course } = await findLesson(courseId, moduleId, lessonId);
  ensureCourseEditable(course);

  if (!canTransitionLessonStatus(lesson.status, nextStatus)) {
    invalidStatusTransition();
  }

  if (nextStatus === 'ACTIVE') {
    const validation = validateLessonContent(lesson.type, lesson.content);

    if (!validation.valid) {
      invalidContentError(validation.issues, 422);
    }
  }

  const updated = await db.orm.public.Lesson
    .where({ id: lessonId })
    .update({ status: nextStatus });

  if (!updated) {
    throw new AppError(404, 'LESSON_NOT_FOUND', LESSON_NOT_FOUND_MESSAGE);
  }

  const counts = await getProgressCounts([lessonId]);

  return toAdminSummary(updated as LessonRow, counts.get(lessonId) ?? 0);
}

export async function moveLesson(
  courseId: number,
  moduleId: number,
  lessonId: number,
  input: MoveLessonInput,
): Promise<AdminLessonSummary[]> {
  const reordered = await db.transaction(async (tx) => {
    const course = await tx.orm.public.Course.first({ id: courseId });

    if (!course) {
      throw new AppError(404, 'COURSE_NOT_FOUND', COURSE_NOT_FOUND_MESSAGE);
    }

    ensureCourseEditable(course as CourseRow);

    const module = await tx.orm.public.Module.first({ id: moduleId });

    if (!module || module.courseId !== courseId) {
      throw new AppError(404, 'MODULE_NOT_FOUND', MODULE_NOT_FOUND_MESSAGE);
    }

    const lessons = await tx.orm.public.Lesson
      .where({ moduleId })
      .orderBy((lesson) => lesson.order.asc())
      .all();

    const currentIndex = lessons.findIndex((lesson) => lesson.id === lessonId);

    if (currentIndex === -1) {
      throw new AppError(404, 'LESSON_NOT_FOUND', LESSON_NOT_FOUND_MESSAGE);
    }

    const targetIndex =
      input.direction === 'up' ? currentIndex - 1 : currentIndex + 1;

    if (targetIndex < 0 || targetIndex >= lessons.length) {
      throw new AppError(
        409,
        'LESSON_ORDER_BOUNDARY',
        'La lección ya está en el extremo de la lista.',
      );
    }

    const current = lessons[currentIndex]!;
    const target = lessons[targetIndex]!;
    const temporaryOrder = Math.min(...lessons.map((lesson) => lesson.order), 0) - 1;

    await tx.orm.public.Lesson
      .where({ id: current.id })
      .update({ order: temporaryOrder });

    await tx.orm.public.Lesson
      .where({ id: target.id })
      .update({ order: current.order });

    await tx.orm.public.Lesson
      .where({ id: current.id })
      .update({ order: target.order });

    return tx.orm.public.Lesson
      .where({ moduleId })
      .orderBy((lesson) => lesson.order.asc())
      .all();
  });

  const counts = await getProgressCounts(reordered.map((lesson) => lesson.id));

  return reordered.map((lesson) =>
    toAdminSummary(lesson as LessonRow, counts.get(lesson.id) ?? 0),
  );
}

export async function deleteLesson(
  courseId: number,
  moduleId: number,
  lessonId: number,
): Promise<AdminLessonSummary[]> {
  const remaining = await db.transaction(async (tx) => {
    const course = await tx.orm.public.Course.first({ id: courseId });

    if (!course) {
      throw new AppError(404, 'COURSE_NOT_FOUND', COURSE_NOT_FOUND_MESSAGE);
    }

    ensureCourseEditable(course as CourseRow);

    const module = await tx.orm.public.Module.first({ id: moduleId });

    if (!module || module.courseId !== courseId) {
      throw new AppError(404, 'MODULE_NOT_FOUND', MODULE_NOT_FOUND_MESSAGE);
    }

    const lesson = await tx.orm.public.Lesson.first({ id: lessonId });

    if (!lesson || lesson.moduleId !== moduleId) {
      throw new AppError(404, 'LESSON_NOT_FOUND', LESSON_NOT_FOUND_MESSAGE);
    }

    const progressRows = await tx.orm.public.LessonProgress
      .where({ lessonId })
      .all();

    if (progressRows.length > 0) {
      throw new AppError(
        409,
        'LESSON_HAS_PROGRESS',
        'No se puede eliminar la lección porque tiene registros de progreso. Archívala para retirarla de la experiencia del estudiante.',
      );
    }

    await tx.orm.public.Lesson.where({ id: lessonId }).deleteAll();

    const lessons = await tx.orm.public.Lesson
      .where({ moduleId })
      .orderBy((lessonRow) => lessonRow.order.asc())
      .all();

    for (const [index, lessonRow] of lessons.entries()) {
      await tx.orm.public.Lesson
        .where({ id: lessonRow.id })
        .update({ order: -(index + 1) });
    }

    for (const [index, lessonRow] of lessons.entries()) {
      await tx.orm.public.Lesson
        .where({ id: lessonRow.id })
        .update({ order: index + 1 });
    }

    return lessons.map((lessonRow, index) => ({
      ...lessonRow,
      order: index + 1,
    }));
  });

  return remaining.map((lesson) => toAdminSummary(lesson as LessonRow, 0));
}

export async function validateStoredLessonContent(
  courseId: number,
  moduleId: number,
  lessonId: number,
): Promise<LessonContentValidationResponse> {
  const { lesson } = await findLesson(courseId, moduleId, lessonId);

  return validateLessonContent(lesson.type, lesson.content);
}

export async function validateLessonContentPayload(
  input: ValidateLessonContentInput,
): Promise<LessonContentValidationResponse> {
  return validateLessonContent(input.type, input.content);
}

export async function previewActivityAnswer(
  courseId: number,
  moduleId: number,
  lessonId: number,
  activityId: string,
  answer: unknown,
): Promise<ActivityCheckResponse> {
  const { lesson } = await findLesson(courseId, moduleId, lessonId);

  if (lesson.type !== 'LABORATORY') {
    throw new AppError(
      409,
      'LESSON_NOT_LABORATORY',
      'La lección indicada no es un laboratorio.',
    );
  }

  const content = parseStoredLabContent(lesson);
  const activity = assertLabActivity(content, activityId);
  const correct = isActivityAnswerCorrect(activity, answer);

  return {
    correct,
    message: activityCheckMessage(correct),
  };
}

export async function previewTerminalCommand(
  courseId: number,
  moduleId: number,
  lessonId: number,
  activityId: string,
  command: string,
): Promise<TerminalResponse> {
  const { lesson } = await findLesson(courseId, moduleId, lessonId);

  if (lesson.type !== 'LABORATORY') {
    throw new AppError(
      409,
      'LESSON_NOT_LABORATORY',
      'La lección indicada no es un laboratorio.',
    );
  }

  const content = parseStoredLabContent(lesson);
  const activity = assertTerminalActivity(content, activityId);
  const output = getTerminalCommandOutput(activity, command);

  if (output === null) {
    throw new AppError(
      400,
      'INVALID_TERMINAL_COMMAND',
      'El comando no está disponible en esta simulación.',
    );
  }

  return { command: command.trim(), output };
}

/* -------------------------------------------------------------------------- */
/* Experiencia del estudiante                                                */
/* -------------------------------------------------------------------------- */

function buildProgressSummary(
  completedLessons: number,
  totalLessons: number,
): CourseProgressSummary {
  return {
    completedLessons,
    totalLessons,
    percentage:
      totalLessons === 0
        ? 0
        : Math.round((completedLessons / totalLessons) * 100),
  };
}

async function buildLearningState(
  courseId: number,
  userId: number,
): Promise<LearningCourse> {
  const course = await db.orm.public.Course.first({ id: courseId });

  if (!course || !isAvailableToStudents(course.status)) {
    throw new AppError(
      404,
      'COURSE_NOT_AVAILABLE',
      COURSE_NOT_AVAILABLE_MESSAGE,
    );
  }

  const modules = await db.orm.public.Module
    .where({ courseId })
    .where((module) => module.status.eq('ACTIVE'))
    .orderBy((module) => module.order.asc())
    .all();

  const moduleIds = modules.map((module) => module.id);
  const lessons =
    moduleIds.length === 0
      ? []
      : await db.orm.public.Lesson
          .where((lesson) => lesson.moduleId.in(moduleIds))
          .where((lesson) => lesson.status.eq('ACTIVE'))
          .orderBy((lesson) => lesson.order.asc())
          .all();

  const lessonIds = lessons.map((lesson) => lesson.id);
  const progressRows =
    lessonIds.length === 0
      ? []
      : await db.orm.public.LessonProgress
          .where({ userId })
          .where((progress) => progress.lessonId.in(lessonIds))
          .all();

  const progressByLessonId = new Map<number, ProgressRow>();

  for (const progress of progressRows) {
    progressByLessonId.set(progress.lessonId, progress as ProgressRow);
  }

  const lessonsByModuleId = new Map<number, LessonRow[]>();

  for (const lesson of lessons) {
    const list = lessonsByModuleId.get(lesson.moduleId) ?? [];
    list.push(lesson as LessonRow);
    lessonsByModuleId.set(lesson.moduleId, list);
  }

  let previousModuleCompleted = true;
  let completedLessons = 0;
  const learningModules: LearningModule[] = [];

  for (const module of modules) {
    const moduleLessons = lessonsByModuleId.get(module.id) ?? [];
    const completedInModule = moduleLessons.filter((lesson) =>
      progressByLessonId.has(lesson.id),
    ).length;
    const moduleCompleted =
      moduleLessons.length === 0 || completedInModule === moduleLessons.length;
    const moduleUnlocked =
      learningModules.length === 0 || previousModuleCompleted;

    const nextIncompleteIndex = moduleLessons.findIndex(
      (lesson) => !progressByLessonId.has(lesson.id),
    );
    const learningLessons: LearningLesson[] = moduleLessons.map(
      (lesson, index) => {
        const progress = progressByLessonId.get(lesson.id) ?? null;
        const completed = progress !== null;
        const isNext =
          moduleUnlocked &&
          !completed &&
          index === nextIncompleteIndex;
        const locked = !completed && !isNext;

        if (completed) {
          completedLessons += 1;
        }

        return {
          ...toLessonSummary(lesson),
          completed,
          completedAt: progress?.completedAt ?? null,
          locked,
          isNext,
        };
      },
    );

    learningModules.push({
      ...toModuleSummary(module as ModuleRow),
      locked: !moduleUnlocked,
      completed: moduleCompleted,
      lessons: learningLessons,
    });

    previousModuleCompleted = moduleCompleted;
  }

  const courseFinalAssessment = await getCourseFinalAssessmentSummary(
    courseId,
    userId,
    completedLessons === lessonIds.length,
  );

  return {
    ...toCourseSummaryBase(course as CourseRow),
    moduleCount: modules.length,
    progress: buildProgressSummary(completedLessons, lessonIds.length),
    assessment: courseFinalAssessment,
    modules: learningModules,
  };
}

export async function getStudentCourseDetail(
  courseId: number,
  userId: number,
): Promise<LearningCourse> {
  return buildLearningState(courseId, userId);
}

function findLearningLesson(
  course: LearningCourse,
  lessonId: number,
): LearningLesson | null {
  for (const module of course.modules) {
    const lesson = module.lessons.find((item) => item.id === lessonId);

    if (lesson) {
      return lesson;
    }
  }

  return null;
}

export async function getStudentLesson(
  courseId: number,
  lessonId: number,
  userId: number,
): Promise<StudentLessonResponse> {
  const learningCourse = await buildLearningState(courseId, userId);
  const learningLesson = findLearningLesson(learningCourse, lessonId);

  if (!learningLesson) {
    throw new AppError(
      404,
      'LESSON_NOT_AVAILABLE',
      LESSON_NOT_AVAILABLE_MESSAGE,
    );
  }

  if (learningLesson.locked) {
    throw new AppError(403, 'LESSON_LOCKED', LESSON_LOCKED_MESSAGE);
  }

  const { lesson, module } = await findLesson(
    courseId,
    learningLesson.moduleId,
    lessonId,
  );

  let content: StudentLesson['content'];

  if (lesson.type === 'THEORY') {
    content = parseStoredTheoryContent(lesson);
  } else {
    content = sanitizeLabContent(parseStoredLabContent(lesson));
  }

  const flatLessons = learningCourse.modules.flatMap(
    (moduleItem) => moduleItem.lessons,
  );
  const currentIndex = flatLessons.findIndex((item) => item.id === lessonId);
  const previousLesson = flatLessons
    .slice(0, Math.max(0, currentIndex))
    .reverse()
    .find((item) => !item.locked);
  const nextLesson =
    currentIndex >= 0 ? flatLessons[currentIndex + 1] ?? null : null;

  return {
    lesson: {
      ...toLessonSummary(lesson),
      content,
      completed: learningLesson.completed,
      completedAt: learningLesson.completedAt,
      locked: false,
      isNext: learningLesson.isNext,
    },
    course: {
      id: learningCourse.id,
      title: learningCourse.title,
      progress: learningCourse.progress,
    },
    module: {
      id: module.id,
      title: module.title,
      order: module.order,
    },
    navigation: {
      previousLessonId: previousLesson?.id ?? null,
      nextLessonId: nextLesson?.id ?? null,
      nextLessonLocked: nextLesson?.locked ?? false,
    },
    modules: learningCourse.modules,
  };
}

async function createProgressIfMissing(
  userId: number,
  lessonId: number,
): Promise<ProgressRow> {
  const existing = await db.orm.public.LessonProgress
    .where({ userId })
    .where({ lessonId })
    .first();

  if (existing) {
    return existing as ProgressRow;
  }

  try {
    const created = await db.orm.public.LessonProgress.create({
      userId,
      lessonId,
    });

    return created as ProgressRow;
  } catch (error) {
    const afterRace = await db.orm.public.LessonProgress
      .where({ userId })
      .where({ lessonId })
      .first();

    if (afterRace) {
      return afterRace as ProgressRow;
    }

    throw error;
  }
}

async function completeLessonForStudent(
  courseId: number,
  lessonId: number,
  userId: number,
  expectedType: LessonType,
): Promise<LessonCompletionResponse> {
  const learningCourse = await buildLearningState(courseId, userId);
  const learningLesson = findLearningLesson(learningCourse, lessonId);

  if (!learningLesson) {
    throw new AppError(
      404,
      'LESSON_NOT_AVAILABLE',
      LESSON_NOT_AVAILABLE_MESSAGE,
    );
  }

  if (learningLesson.locked) {
    throw new AppError(403, 'LESSON_LOCKED', LESSON_LOCKED_MESSAGE);
  }

  const { lesson } = await findLesson(
    courseId,
    learningLesson.moduleId,
    lessonId,
  );

  if (lesson.type !== expectedType) {
    throw new AppError(
      409,
      expectedType === 'THEORY' ? 'LESSON_NOT_THEORY' : 'LESSON_NOT_LABORATORY',
      expectedType === 'THEORY'
        ? 'La lección indicada no es una lección teórica.'
        : 'La lección indicada no es un laboratorio.',
    );
  }

  const progress = await createProgressIfMissing(userId, lessonId);
  const updatedCourse = await buildLearningState(courseId, userId);

  // Los logros se otorgan solo tras confirmar el evento académico.
  await evaluateAndUnlockAchievements(userId);

  return {
    lessonProgress: {
      completedAt: progress.completedAt,
    },
    progress: updatedCourse.progress,
  };
}

export async function completeTheoryLesson(
  courseId: number,
  lessonId: number,
  userId: number,
): Promise<LessonCompletionResponse> {
  return completeLessonForStudent(courseId, lessonId, userId, 'THEORY');
}

export async function checkActivityAnswer(
  courseId: number,
  lessonId: number,
  userId: number,
  activityId: string,
  answer: unknown,
): Promise<ActivityCheckResponse> {
  const learningCourse = await buildLearningState(courseId, userId);
  const learningLesson = findLearningLesson(learningCourse, lessonId);

  if (!learningLesson) {
    throw new AppError(
      404,
      'LESSON_NOT_AVAILABLE',
      LESSON_NOT_AVAILABLE_MESSAGE,
    );
  }

  if (learningLesson.locked) {
    throw new AppError(403, 'LESSON_LOCKED', LESSON_LOCKED_MESSAGE);
  }

  const { lesson } = await findLesson(
    courseId,
    learningLesson.moduleId,
    lessonId,
  );

  if (lesson.type !== 'LABORATORY') {
    throw new AppError(
      409,
      'LESSON_NOT_LABORATORY',
      'La lección indicada no es un laboratorio.',
    );
  }

  const content = parseStoredLabContent(lesson);
  const activity = assertLabActivity(content, activityId);
  const correct = isActivityAnswerCorrect(activity, answer);

  return {
    correct,
    message: activityCheckMessage(correct),
  };
}

export async function executeTerminalCommand(
  courseId: number,
  lessonId: number,
  userId: number,
  activityId: string,
  command: string,
): Promise<TerminalResponse> {
  const learningCourse = await buildLearningState(courseId, userId);
  const learningLesson = findLearningLesson(learningCourse, lessonId);

  if (!learningLesson) {
    throw new AppError(
      404,
      'LESSON_NOT_AVAILABLE',
      LESSON_NOT_AVAILABLE_MESSAGE,
    );
  }

  if (learningLesson.locked) {
    throw new AppError(403, 'LESSON_LOCKED', LESSON_LOCKED_MESSAGE);
  }

  const { lesson } = await findLesson(
    courseId,
    learningLesson.moduleId,
    lessonId,
  );

  if (lesson.type !== 'LABORATORY') {
    throw new AppError(
      409,
      'LESSON_NOT_LABORATORY',
      'La lección indicada no es un laboratorio.',
    );
  }

  const content = parseStoredLabContent(lesson);
  const activity = assertTerminalActivity(content, activityId);
  const output = getTerminalCommandOutput(activity, command);

  if (output === null) {
    throw new AppError(
      400,
      'INVALID_TERMINAL_COMMAND',
      'El comando no está disponible en esta simulación.',
    );
  }

  return { command: command.trim(), output };
}

export async function finalizeLaboratory(
  courseId: number,
  lessonId: number,
  userId: number,
  answers: Record<string, unknown>,
): Promise<LessonCompletionResponse> {
  const learningCourse = await buildLearningState(courseId, userId);
  const learningLesson = findLearningLesson(learningCourse, lessonId);

  if (!learningLesson) {
    throw new AppError(
      404,
      'LESSON_NOT_AVAILABLE',
      LESSON_NOT_AVAILABLE_MESSAGE,
    );
  }

  if (learningLesson.locked) {
    throw new AppError(403, 'LESSON_LOCKED', LESSON_LOCKED_MESSAGE);
  }

  const { lesson } = await findLesson(
    courseId,
    learningLesson.moduleId,
    lessonId,
  );

  if (lesson.type !== 'LABORATORY') {
    throw new AppError(
      409,
      'LESSON_NOT_LABORATORY',
      'La lección indicada no es un laboratorio.',
    );
  }

  const content = parseStoredLabContent(lesson);
  const leaves = collectLeafActivities(content.activities);
  const explicitRequiredIds = content.completion?.requiredActivityIds;
  const requiredLeaves = explicitRequiredIds
    ? leaves.filter((leaf) => explicitRequiredIds.includes(leaf.activity.id))
    : leaves.filter((leaf) => leaf.required);
  const required = requiredLeaves.length > 0 ? requiredLeaves : leaves;
  const missingActivityIds = required
    .filter((leaf) => !isActivityAnswerCorrect(leaf.activity, answers[leaf.activity.id]))
    .map((leaf) => leaf.activity.id);

  if (missingActivityIds.length > 0) {
    throw new AppError(
      422,
      'LAB_NOT_COMPLETED',
      LAB_NOT_COMPLETED_MESSAGE,
      undefined,
      { missingActivityIds },
    );
  }

  const progress = await createProgressIfMissing(userId, lessonId);
  const updatedCourse = await buildLearningState(courseId, userId);

  // Los logros se otorgan solo tras confirmar el evento académico.
  await evaluateAndUnlockAchievements(userId);

  return {
    lessonProgress: {
      completedAt: progress.completedAt,
    },
    progress: updatedCourse.progress,
  };
}
