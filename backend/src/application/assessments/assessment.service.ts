import { db } from '../../prisma/db.js';
import {
  canTransitionContent,
  isAvailableToStudents,
  type ContentStatus,
} from '../../domain/content.js';
import {
  FINAL_ASSESSMENT_QUESTION_COUNT,
  isQuestionType,
  isScorePassing,
  scoreFromCorrectAnswers,
  validateAssessmentQuestions,
  type QuestionInput,
} from '../../domain/assessment.js';
import { AppError } from '../../infrastructure/http/errors.js';
import { evaluateAndUnlockAchievements } from '../achievements/achievement.service.js';
import type { CourseProgressSummary } from '../lessons/lesson.types.js';
import type {
  AdminCourseFinalAssessmentResponse,
  AdminFinalAssessment,
  AdminQuestion,
  AdminQuestionOption,
  AttemptQuestionReview,
  CourseFinalAssessmentSummary,
  StudentAssessmentAttemptSummary,
  StudentAssessmentResponse,
  StudentAssessmentResults,
  StudentFinalAssessment,
  SubmitAssessmentResponse,
} from './assessment.types.js';

const COURSE_NOT_FOUND_MESSAGE = 'El curso no existe.';
const COURSE_NOT_AVAILABLE_MESSAGE =
  'El curso no está disponible para estudiantes.';
const ASSESSMENT_NOT_FOUND_MESSAGE =
  'Este curso todavía no tiene una evaluación final registrada.';
const ASSESSMENT_ALREADY_EXISTS_MESSAGE =
  'El curso ya tiene una evaluación final registrada.';
const ASSESSMENT_HAS_ATTEMPTS_MESSAGE =
  'No se puede modificar el contenido de la evaluación porque ya ha sido realizada por estudiantes.';
const ASSESSMENT_NOT_READY_MESSAGE =
  'La evaluación final debe cumplir todos los requisitos antes de publicarse.';
const ASSESSMENT_NOT_AVAILABLE_FOR_STUDENT_MESSAGE =
  'La evaluación final no está disponible.';
const ASSESSMENT_LESSONS_PENDING_MESSAGE =
  'Debes completar todas las lecciones del curso antes de presentar la evaluación final.';
const ATTEMPT_NOT_FOUND_MESSAGE =
  'Aún no has presentado esta evaluación.';
const ASSESSMENT_CONTENT_INVALID_MESSAGE =
  'La evaluación final no cumple los requisitos académicos.';
const ASSESSMENT_ATTEMPT_FAILED_MESSAGE =
  'No se pudo registrar el intento de evaluación.';

/** Contexto transaccional del cliente Prisma. */
type TransactionContext = Parameters<Parameters<typeof db.transaction>[0]>[0];

interface CourseRow {
  id: number;
  title: string;
  description: string | null;
  status: ContentStatus;
  createdAt: string;
  updatedAt: string;
}

interface AssessmentRow {
  id: number;
  title: string;
  description: string | null;
  courseId: number | null;
  moduleId: number | null;
  status: ContentStatus;
  createdAt: string;
  updatedAt: string;
}

interface QuestionRow {
  id: number;
  assessmentId: number;
  statement: string;
  type: string;
  order: number;
  status: ContentStatus;
  explanation: string | null;
  hint: string | null;
}

interface OptionRow {
  id: number;
  questionId: number;
  text: string;
  isCorrect: boolean;
  order: number;
}

interface AttemptRow {
  id: number;
  userId: number;
  assessmentId: number;
  score: unknown;
  completedAt: string;
}

/* ---------------------------- Consultas internas --------------------------- */

async function findCourse(courseId: number): Promise<CourseRow> {
  const course = await db.orm.public.Course.first({ id: courseId });

  if (!course) {
    throw new AppError(404, 'COURSE_NOT_FOUND', COURSE_NOT_FOUND_MESSAGE);
  }

  return course as unknown as CourseRow;
}

async function findFinalAssessment(
  courseId: number,
): Promise<AssessmentRow | null> {
  const assessment = await db.orm.public.Assessment
    .where({ courseId })
    .where((assessment) => assessment.type.eq('COURSE_FINAL'))
    .first();

  return (assessment as unknown as AssessmentRow) ?? null;
}

async function mustFindFinalAssessment(
  courseId: number,
): Promise<AssessmentRow> {
  const assessment = await findFinalAssessment(courseId);

  if (!assessment) {
    throw new AppError(
      404,
      'ASSESSMENT_NOT_FOUND',
      ASSESSMENT_NOT_FOUND_MESSAGE,
    );
  }

  return assessment;
}

async function countAssessmentAttempts(assessmentId: number): Promise<number> {
  const attempts = await db.orm.public.AssessmentAttempt
    .where({ assessmentId })
    .all();

  return attempts.length;
}

async function findAttempt(
  userId: number,
  assessmentId: number,
): Promise<AttemptRow | null> {
  const attempt = await db.orm.public.AssessmentAttempt
    .where({ userId })
    .where({ assessmentId })
    .first();

  return (attempt as unknown as AttemptRow) ?? null;
}

async function findQuestions(assessmentId: number): Promise<QuestionRow[]> {
  const questions = await db.orm.public.Question
    .where({ assessmentId })
    .orderBy((question) => question.order.asc())
    .all();

  return questions.map((question) => question as unknown as QuestionRow);
}

async function findOptions(
  questionIds: number[],
): Promise<Map<number, OptionRow[]>> {
  const optionsByQuestionId = new Map<number, OptionRow[]>();

  if (questionIds.length === 0) {
    return optionsByQuestionId;
  }

  const options = await db.orm.public.AnswerOption
    .where((option) => option.questionId.in(questionIds))
    .orderBy((option) => option.order.asc())
    .all();

  for (const rawOption of options) {
    const option = rawOption as unknown as OptionRow;
    const list = optionsByQuestionId.get(option.questionId) ?? [];
    list.push(option);
    optionsByQuestionId.set(option.questionId, list);
  }

  return optionsByQuestionId;
}

async function findResponses(
  attemptId: number,
): Promise<Map<number, { answerOptionId: number }>> {
  const responses = await db.orm.public.QuestionResponse
    .where({ attemptId })
    .all();

  const byQuestionId = new Map<number, { answerOptionId: number }>();

  for (const rawResponse of responses) {
    const response = rawResponse as unknown as {
      questionId: number;
      answerOptionId: number;
    };

    byQuestionId.set(response.questionId, response);
  }

  return byQuestionId;
}

function toQuestionInputs(
  questions: QuestionRow[],
  optionsByQuestionId: Map<number, OptionRow[]>,
): QuestionInput[] {
  return questions.map((question) => ({
    statement: question.statement,
    type: isQuestionType(question.type) ? question.type : 'TRUE_FALSE',
    explanation: question.explanation ?? '',
    hint: question.hint,
    options: (optionsByQuestionId.get(question.id) ?? []).map((option) => ({
      text: option.text,
      isCorrect: option.isCorrect,
    })),
  }));
}

/** Verifica que la evaluación cumpla la regla de 8 preguntas válidas. */
async function isAssessmentComplete(assessmentId: number): Promise<boolean> {
  const questions = await findQuestions(assessmentId);
  const optionsByQuestionId = await findOptions(
    questions.map((question) => question.id),
  );
  const result = validateAssessmentQuestions(
    toQuestionInputs(questions, optionsByQuestionId),
  );

  return (
    result.valid && questions.length === FINAL_ASSESSMENT_QUESTION_COUNT
  );
}

/** Estado de lecciones activas del curso para la persona indicada. */
async function getCourseLessonsState(
  courseId: number,
  userId: number,
): Promise<{
  completedLessons: number;
  totalLessons: number;
  remainingLessons: Array<{
    lessonId: number;
    lessonTitle: string;
    moduleTitle: string;
  }>;
}> {
  const modules = await db.orm.public.Module
    .where({ courseId })
    .orderBy((module) => module.order.asc())
    .all();

  const lessonsByModule = new Map<
    number,
    { moduleTitle: string; lessons: Array<{ id: number; title: string }> }
  >();

  for (const rawModule of modules) {
    const module = rawModule as unknown as {
      id: number;
      title: string;
      status: ContentStatus;
    };

    if (isAvailableToStudents(module.status)) {
      lessonsByModule.set(module.id, {
        moduleTitle: module.title,
        lessons: [],
      });
    }
  }

  const moduleIds = [...lessonsByModule.keys()];

  if (moduleIds.length > 0) {
    const lessons = await db.orm.public.Lesson
      .where((lesson) => lesson.moduleId.in(moduleIds))
      .orderBy((lesson) => lesson.order.asc())
      .all();

    for (const rawLesson of lessons) {
      const lesson = rawLesson as unknown as {
        id: number;
        moduleId: number;
        title: string;
        status: ContentStatus;
      };

      if (lesson.status !== 'ACTIVE') {
        continue;
      }

      const moduleEntry = lessonsByModule.get(lesson.moduleId);

      if (moduleEntry) {
        moduleEntry.lessons.push({ id: lesson.id, title: lesson.title });
      }
    }
  }

  const allLessons = [...lessonsByModule.entries()].flatMap(
    ([moduleId, entry]) =>
      entry.lessons.map((lesson) => ({
        ...lesson,
        moduleTitle: entry.moduleTitle,
      })),
  );

  const lessonIds = allLessons.map((lesson) => lesson.id);
  const completedIds = new Set<number>();

  if (lessonIds.length > 0) {
    const progressRows = await db.orm.public.LessonProgress
      .where({ userId })
      .where((progress) => progress.lessonId.in(lessonIds))
      .all();

    for (const rawProgress of progressRows) {
      completedIds.add(
        (rawProgress as unknown as { lessonId: number }).lessonId,
      );
    }
  }

  return {
    completedLessons: lessonIds.filter((id) => completedIds.has(id)).length,
    totalLessons: lessonIds.length,
    remainingLessons: allLessons
      .filter((lesson) => !completedIds.has(lesson.id))
      .map((lesson) => ({
        lessonId: lesson.id,
        lessonTitle: lesson.title,
        moduleTitle: lesson.moduleTitle,
      })),
  };
}

/**
 * Resumen del estado de la evaluación final, usado por el detalle del
 * curso y por la pantalla del examen del estudiante.
 */
export async function getCourseFinalAssessmentSummary(
  courseId: number,
  userId: number,
  lessonsCompleted: boolean,
): Promise<CourseFinalAssessmentSummary | null> {
  const assessment = await findFinalAssessment(courseId);

  if (!assessment) {
    return null;
  }

  const questions = await findQuestions(assessment.id);
  const optionsByQuestionId = await findOptions(
    questions.map((question) => question.id),
  );
  const { valid } = validateAssessmentQuestions(
    toQuestionInputs(questions, optionsByQuestionId),
  );
  const attempt = await findAttempt(userId, assessment.id);
  const score = attempt !== null ? Number(attempt.score) : null;

  return {
    status: assessment.status,
    questionCount: questions.length,
    complete:
      valid && questions.length === FINAL_ASSESSMENT_QUESTION_COUNT,
    attempted: attempt !== null,
    passed:
      attempt !== null &&
      lessonsCompleted &&
      score !== null &&
      isScorePassing(score),
    score,
    completedAt: attempt?.completedAt ?? null,
  };
}

/* ------------------------------- Administrador ----------------------------- */

function toAdminOption(option: OptionRow): AdminQuestionOption {
  return {
    id: option.id,
    order: option.order,
    text: option.text,
    isCorrect: option.isCorrect,
  };
}

function toAdminQuestion(
  question: QuestionRow,
  options: OptionRow[],
): AdminQuestion {
  return {
    id: question.id,
    order: question.order,
    statement: question.statement,
    type: isQuestionType(question.type) ? question.type : 'TRUE_FALSE',
    status: question.status,
    explanation: question.explanation,
    hint: question.hint,
    options: options.map(toAdminOption),
  };
}

export async function getAdminCourseFinalAssessment(
  courseId: number,
): Promise<AdminCourseFinalAssessmentResponse> {
  const course = await findCourse(courseId);
  const assessment = await findFinalAssessment(courseId);

  if (!assessment) {
    return {
      course: {
        id: course.id,
        title: course.title,
        status: course.status,
      },
      assessment: null,
    };
  }

  const questions = await findQuestions(assessment.id);
  const optionsByQuestionId = await findOptions(
    questions.map((question) => question.id),
  );
  const { valid } = validateAssessmentQuestions(
    toQuestionInputs(questions, optionsByQuestionId),
  );
  const attemptCount = await countAssessmentAttempts(assessment.id);

  const adminAssessment: AdminFinalAssessment = {
    id: assessment.id,
    title: assessment.title,
    description: assessment.description,
    status: assessment.status,
    questionCount: questions.length,
    complete:
      valid && questions.length === FINAL_ASSESSMENT_QUESTION_COUNT,
    attemptCount,
    questions: questions.map((question) =>
      toAdminQuestion(question, optionsByQuestionId.get(question.id) ?? []),
    ),
  };

  return {
    course: {
      id: course.id,
      title: course.title,
      status: course.status,
    },
    assessment: adminAssessment,
  };
}

function invalidAssessmentContentError(issues: Array<{
  path: string;
  message: string;
}>): AppError {
  return new AppError(
    400,
    'ASSESSMENT_CONTENT_INVALID',
    ASSESSMENT_CONTENT_INVALID_MESSAGE,
    undefined,
    { issues },
  );
}

async function createQuestionsInsideTransaction(
  tx: TransactionContext,
  assessmentId: number,
  questions: unknown,
): Promise<void> {
  const questionList = questions as Array<Record<string, unknown>>;
  let order = 0;

  for (const question of questionList) {
    order += 1;

    const createdQuestion = (await tx.orm.public.Question.create({
      assessmentId,
      statement: String(question['statement']).trim(),
      type: question['type'] as 'MULTIPLE_CHOICE' | 'TRUE_FALSE',
      order,
      status: 'ACTIVE',
      explanation:
        typeof question['explanation'] === 'string'
          ? question['explanation'].trim()
          : '',
      hint:
        typeof question['hint'] === 'string' &&
        question['hint'].trim().length > 0
          ? question['hint'].trim()
          : null,
    })) as unknown as { id: number };

    const optionList = question['options'] as Array<{
      text: string;
      isCorrect: boolean;
    }>;
    let optionOrder = 0;

    for (const option of optionList) {
      optionOrder += 1;

      await tx.orm.public.AnswerOption.create({
        questionId: createdQuestion.id,
        text: option.text.trim(),
        isCorrect: option.isCorrect === true,
        order: optionOrder,
      });
    }
  }
}

export async function createCourseFinalAssessment(
  courseId: number,
  input: { title: string; description: string | null; questions: unknown },
): Promise<AdminCourseFinalAssessmentResponse> {
  const course = await findCourse(courseId);
  const existing = await findFinalAssessment(courseId);

  if (existing) {
    throw new AppError(
      409,
      'ASSESSMENT_ALREADY_EXISTS',
      ASSESSMENT_ALREADY_EXISTS_MESSAGE,
    );
  }

  const validationResult = validateAssessmentQuestions(input.questions);

  if (!validationResult.valid) {
    throw invalidAssessmentContentError(validationResult.issues);
  }

  await db.transaction(async (tx) => {
    const createdAssessment = (await tx.orm.public.Assessment.create({
      title: input.title,
      description: input.description,
      type: 'COURSE_FINAL',
      courseId,
      moduleId: null,
      status: 'DRAFT',
    })) as unknown as { id: number };

    await createQuestionsInsideTransaction(tx, createdAssessment.id, input.questions);
  });

  return getAdminCourseFinalAssessment(courseId);
}

export async function updateCourseFinalAssessmentMetadata(
  courseId: number,
  input: { title?: string; description?: string | null },
): Promise<AdminCourseFinalAssessmentResponse> {
  const assessment = await mustFindFinalAssessment(courseId);
  const data: Record<string, unknown> = {};

  if (input.title !== undefined) {
    data['title'] = input.title;
  }

  if (input.description !== undefined) {
    data['description'] = input.description;
  }

  if (Object.keys(data).length > 0) {
    await db.orm.public.Assessment.where({ id: assessment.id }).update(data);
  }

  return getAdminCourseFinalAssessment(courseId);
}

export async function replaceCourseFinalAssessmentQuestions(
  courseId: number,
  questions: unknown,
): Promise<AdminCourseFinalAssessmentResponse> {
  const assessment = await mustFindFinalAssessment(courseId);
  const attemptCount = await countAssessmentAttempts(assessment.id);

  if (attemptCount > 0) {
    throw new AppError(
      409,
      'ASSESSMENT_HAS_ATTEMPTS',
      ASSESSMENT_HAS_ATTEMPTS_MESSAGE,
    );
  }

  const validationResult = validateAssessmentQuestions(questions);

  if (!validationResult.valid) {
    throw invalidAssessmentContentError(validationResult.issues);
  }

  await db.transaction(async (tx) => {
    const existingQuestions = await tx.orm.public.Question
      .where({ assessmentId: assessment.id })
      .all();

    for (const rawQuestion of existingQuestions) {
      const question = rawQuestion as unknown as { id: number };

      await tx.orm.public.QuestionResponse
        .where({ questionId: question.id })
        .deleteAll();
      await tx.orm.public.AnswerOption
        .where({ questionId: question.id })
        .deleteAll();
    }

    await tx.orm.public.Question
      .where({ assessmentId: assessment.id })
      .deleteAll();

    await createQuestionsInsideTransaction(
      tx,
      assessment.id,
      questions,
    );
  });

  return getAdminCourseFinalAssessment(courseId);
}

export async function changeCourseFinalAssessmentStatus(
  courseId: number,
  status: ContentStatus,
): Promise<AdminCourseFinalAssessmentResponse> {
  const assessment = await mustFindFinalAssessment(courseId);

  if (!canTransitionContent(assessment.status, status)) {
    throw new AppError(
      400,
      'INVALID_STATUS_TRANSITION',
      'El estado seleccionado no es válido para esta evaluación.',
    );
  }

  if (status === 'ACTIVE') {
    const complete = await isAssessmentComplete(assessment.id);

    if (!complete) {
      throw new AppError(
        409,
        'ASSESSMENT_NOT_READY',
        ASSESSMENT_NOT_READY_MESSAGE,
      );
    }
  }

  await db.orm.public.Assessment
    .where({ id: assessment.id })
    .update({ status });

  return getAdminCourseFinalAssessment(courseId);
}

/* -------------------------------- Estudiante ------------------------------- */

function toStudentQuestion(
  question: QuestionRow,
  options: OptionRow[],
): {
  id: number;
  order: number;
  statement: string;
  type: 'MULTIPLE_CHOICE' | 'TRUE_FALSE';
  options: Array<{ id: number; order: number; text: string }>;
} {
  return {
    id: question.id,
    order: question.order,
    statement: question.statement,
    type: isQuestionType(question.type) ? question.type : 'TRUE_FALSE',
    // Las opciones se envían en su orden almacenado y fijo entre
    // intentos; nunca se incluye la marca de respuesta correcta.
    options: options.map((option) => ({
      id: option.id,
      order: option.order,
      text: option.text,
    })),
  };
}

function countCorrectAnswers(
  questions: QuestionRow[],
  responsesByQuestionId: Map<number, { answerOptionId: number }>,
  optionsByQuestionId: Map<number, OptionRow[]>,
): boolean[] {
  return questions.map((question) => {
    const response = responsesByQuestionId.get(question.id);

    if (!response) {
      return false;
    }

    const options = optionsByQuestionId.get(question.id) ?? [];
    const selected = options.find(
      (option) => option.id === response.answerOptionId,
    );

    return selected !== undefined && selected.isCorrect;
  });
}

function buildAttemptSummary(
  correctFlags: boolean[],
  completedAt: string,
): StudentAssessmentAttemptSummary {
  const correctCount = correctFlags.filter(Boolean).length;

  return {
    score: scoreFromCorrectAnswers(correctCount),
    correctAnswers: correctCount,
    incorrectAnswers: FINAL_ASSESSMENT_QUESTION_COUNT - correctCount,
    passed: isScorePassing(scoreFromCorrectAnswers(correctCount)),
    completedAt,
  };
}

function buildResults(
  attempt: AttemptRow,
  questions: QuestionRow[],
  responsesByQuestionId: Map<number, { answerOptionId: number }>,
  optionsByQuestionId: Map<number, OptionRow[]>,
  correctFlags: boolean[],
): StudentAssessmentResults {
  const reviewRows: AttemptQuestionReview[] = questions.map(
    (question, index) => {
      const response = responsesByQuestionId.get(question.id) ?? null;
      const options = optionsByQuestionId.get(question.id) ?? [];
      const selected = response
        ? (options.find(
            (option) => option.id === response.answerOptionId,
          ) ?? null)
        : null;
      const answeredCorrectly = correctFlags[index];

      return {
        questionId: question.id,
        order: question.order,
        statement: question.statement,
        type: isQuestionType(question.type) ? question.type : 'TRUE_FALSE',
        answeredCorrectly,
        selectedOptionText: selected?.text ?? null,
        // La explicación solo se muestra cuando la respuesta fue
        // correcta; con errores se ofrece una orientación que no
        // revela la opción correcta.
        explanation: answeredCorrectly ? question.explanation : null,
        hint: answeredCorrectly ? null : question.hint,
      };
    },
  );

  return {
    attempt: buildAttemptSummary(correctFlags, attempt.completedAt),
    questions: reviewRows,
  };
}

export async function getStudentFinalAssessment(
  courseId: number,
  userId: number,
): Promise<StudentAssessmentResponse> {
  const course = await findCourse(courseId);

  if (!isAvailableToStudents(course.status)) {
    throw new AppError(
      404,
      'COURSE_NOT_AVAILABLE',
      COURSE_NOT_AVAILABLE_MESSAGE,
    );
  }

  const assessment = await findFinalAssessment(courseId);
  const lessonsState = await getCourseLessonsState(courseId, userId);
  const progress: CourseProgressSummary = {
    completedLessons: lessonsState.completedLessons,
    totalLessons: lessonsState.totalLessons,
    percentage:
      lessonsState.totalLessons === 0
        ? 100
        : Math.round(
            (lessonsState.completedLessons / lessonsState.totalLessons) *
              100,
          ),
  };

  if (!assessment) {
    return {
      course: { id: course.id, title: course.title, status: course.status },
      assessment: null,
      eligibility: {
        available: false,
        reason: 'La evaluación final aún no está disponible.',
        remainingLessons: lessonsState.remainingLessons,
      },
      attempt: null,
      progress,
    };
  }

  const attempt = await findAttempt(userId, assessment.id);
  const questions = await findQuestions(assessment.id);
  const optionsByQuestionId = await findOptions(
    questions.map((question) => question.id),
  );
  const { valid } = validateAssessmentQuestions(
    toQuestionInputs(questions, optionsByQuestionId),
  );
  const complete =
    valid && questions.length === FINAL_ASSESSMENT_QUESTION_COUNT;

  let attemptSummary: StudentAssessmentAttemptSummary | null = null;

  if (attempt) {
    const responsesByQuestionId = await findResponses(attempt.id);
    const correctFlags = countCorrectAnswers(
      questions,
      responsesByQuestionId,
      optionsByQuestionId,
    );

    attemptSummary = buildAttemptSummary(
      correctFlags,
      attempt.completedAt,
    );
  }

  let studentAssessment: StudentFinalAssessment | null = null;
  let eligibilityReason: string | null = null;

  if (!complete) {
    eligibilityReason = 'La evaluación final aún no está disponible.';
  } else if (lessonsState.remainingLessons.length > 0) {
    eligibilityReason = ASSESSMENT_LESSONS_PENDING_MESSAGE;
  } else if (assessment.status !== 'ACTIVE') {
    eligibilityReason = ASSESSMENT_NOT_AVAILABLE_FOR_STUDENT_MESSAGE;
  } else {
    studentAssessment = {
      id: assessment.id,
      title: assessment.title,
      description: assessment.description,
      questions: questions.map((question) =>
        toStudentQuestion(
          question,
          optionsByQuestionId.get(question.id) ?? [],
        ),
      ),
    };
  }

  return {
    course: { id: course.id, title: course.title, status: course.status },
    assessment: studentAssessment,
    eligibility: {
      available: studentAssessment !== null,
      reason: eligibilityReason,
      remainingLessons: lessonsState.remainingLessons,
    },
    attempt: attemptSummary,
    progress,
  };
}

export async function submitFinalAssessment(
  courseId: number,
  userId: number,
  answers: Array<{ questionId: number; answerOptionId: number }>,
): Promise<SubmitAssessmentResponse> {
  const course = await findCourse(courseId);

  if (!isAvailableToStudents(course.status)) {
    throw new AppError(
      404,
      'COURSE_NOT_AVAILABLE',
      COURSE_NOT_AVAILABLE_MESSAGE,
    );
  }

  const assessment = await mustFindFinalAssessment(courseId);

  if (assessment.status !== 'ACTIVE') {
    throw new AppError(
      404,
      'ASSESSMENT_NOT_AVAILABLE',
      ASSESSMENT_NOT_AVAILABLE_FOR_STUDENT_MESSAGE,
    );
  }

  const questions = await findQuestions(assessment.id);
  const optionsByQuestionId = await findOptions(
    questions.map((question) => question.id),
  );
  const { valid } = validateAssessmentQuestions(
    toQuestionInputs(questions, optionsByQuestionId),
  );
  const lessonsState = await getCourseLessonsState(courseId, userId);

  if (
    !valid ||
    questions.length !== FINAL_ASSESSMENT_QUESTION_COUNT ||
    lessonsState.remainingLessons.length > 0
  ) {
    throw new AppError(
      403,
      'ASSESSMENT_NOT_AVAILABLE',
      ASSESSMENT_LESSONS_PENDING_MESSAGE,
    );
  }

  // Valores enlazados a la evaluación: cualquier pregunta u opción
  // fuera de este examen se rechaza en el servidor.
  const validQuestionIds = new Set(questions.map((question) => question.id));
  const submittedByQuestionId = new Map<number, number>();

  for (const answer of answers) {
    if (!validQuestionIds.has(answer.questionId)) {
      throw new AppError(
        400,
        'INVALID_ANSWER',
        'Una de las respuestas no pertenece a esta evaluación.',
      );
    }

    if (submittedByQuestionId.has(answer.questionId)) {
      throw new AppError(
        400,
        'INVALID_ANSWER',
        'Cada pregunta solo puede enviarse una vez por intento.',
      );
    }

    const options = optionsByQuestionId.get(answer.questionId) ?? [];

    if (!options.some((option) => option.id === answer.answerOptionId)) {
      throw new AppError(
        400,
        'INVALID_ANSWER',
        'La opción seleccionada no pertenece a la pregunta indicada.',
      );
    }

    submittedByQuestionId.set(answer.questionId, answer.answerOptionId);
  }

  let attemptId = 0;
  let correctFlags: boolean[] = [];

  await db.transaction(async (tx) => {
    const existingAttempt = await findAttempt(userId, assessment.id);

    if (existingAttempt) {
      await tx.orm.public.QuestionResponse
        .where({ attemptId: existingAttempt.id })
        .deleteAll();

      await tx.orm.public.AssessmentAttempt
        .where({ id: existingAttempt.id })
        .update({ completedAt: new Date().toISOString() });

      attemptId = existingAttempt.id;
    } else {
      const created = (await tx.orm.public.AssessmentAttempt.create({
        userId,
        assessmentId: assessment.id,
        score: '0',
        completedAt: new Date().toISOString(),
      })) as unknown as { id: number };

      attemptId = created.id;
    }

    for (const [
      questionId,
      answerOptionId,
    ] of submittedByQuestionId) {
      await tx.orm.public.QuestionResponse.create({
        attemptId,
        questionId,
        answerOptionId,
      });
    }

    // Recalcula el puntaje con las respuestas ya persistidas: el
    // servidor es la única fuente de la calificación.
    const persistedResponses = await tx.orm.public.QuestionResponse
      .where({ attemptId })
      .all();

    const questionIndexById = new Map(
      questions.map((question, index) => [question.id, index] as const),
    );

    let correctCount = 0;
    correctFlags = questions.map(() => false);

    for (const rawResponse of persistedResponses) {
      const response = rawResponse as unknown as {
        questionId: number;
        answerOptionId: number;
      };
      const index = questionIndexById.get(response.questionId);

      if (index === undefined) {
        continue;
      }

      const options = optionsByQuestionId.get(response.questionId) ?? [];
      const selected = options.find(
        (option) => option.id === response.answerOptionId,
      );

      if (selected && selected.isCorrect) {
        correctCount += 1;
        correctFlags[index] = true;
      }
    }

    await tx.orm.public.AssessmentAttempt
      .where({ id: attemptId })
      .update({ score: String(scoreFromCorrectAnswers(correctCount)) });
  });

  if (attemptId === 0) {
    throw new AppError(
      500,
      'ASSESSMENT_ATTEMPT_FAILED',
      ASSESSMENT_ATTEMPT_FAILED_MESSAGE,
    );
  }

  const attempt = await findAttempt(userId, assessment.id);

  if (!attempt) {
    throw new AppError(
      500,
      'ASSESSMENT_ATTEMPT_FAILED',
      ASSESSMENT_ATTEMPT_FAILED_MESSAGE,
    );
  }

  // Los logros se otorgan solo tras confirmar el intento de evaluación.
  await evaluateAndUnlockAchievements(userId);

  const responsesByQuestionId = await findResponses(attemptId);
  const results = buildResults(
    attempt,
    questions,
    responsesByQuestionId,
    optionsByQuestionId,
    correctFlags,
  );

  return { results };
}

export async function getStudentAssessmentResults(
  courseId: number,
  userId: number,
): Promise<StudentAssessmentResults> {
  const course = await findCourse(courseId);

  if (!isAvailableToStudents(course.status)) {
    throw new AppError(
      404,
      'COURSE_NOT_AVAILABLE',
      COURSE_NOT_AVAILABLE_MESSAGE,
    );
  }

  const assessment = await mustFindFinalAssessment(courseId);
  const attempt = await findAttempt(userId, assessment.id);

  if (!attempt) {
    throw new AppError(404, 'ATTEMPT_NOT_FOUND', ATTEMPT_NOT_FOUND_MESSAGE);
  }

  const questions = await findQuestions(assessment.id);
  const optionsByQuestionId = await findOptions(
    questions.map((question) => question.id),
  );
  const responsesByQuestionId = await findResponses(attempt.id);
  const correctFlags = countCorrectAnswers(
    questions,
    responsesByQuestionId,
    optionsByQuestionId,
  );

  return buildResults(
    attempt,
    questions,
    responsesByQuestionId,
    optionsByQuestionId,
    correctFlags,
  );
}
