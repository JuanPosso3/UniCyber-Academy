import { db } from '../../prisma/db.js';
import {
  isAvailableToStudents,
  type ContentStatus,
} from '../../domain/content.js';
import {
  ACHIEVEMENT_RULES,
  COURSE_MEDAL_CODES,
  type GamificationContext,
  type AchievementRule,
  evaluateEligibleAchievements,
} from '../../domain/gamification.js';
import { AppError } from '../../infrastructure/http/errors.js';
import type {
  Achievement,
  AchievementCollection,
  AchievementDashboardSummary,
  AchievementEntry,
  UnlockResult,
  UserAchievement,
} from './achievement.types.js';

const COURSE_NOT_FOUND_MESSAGE = 'El curso no existe.';
const USER_NOT_FOUND_MESSAGE = 'La persona no existe.';
const ACHIEVEMENT_NOT_FOUND_MESSAGE = 'El logro no existe.';

interface CourseRow {
  id: number;
  title: string;
  status: ContentStatus;
}

interface ModuleRow {
  id: number;
  courseId: number;
  status: ContentStatus;
}

interface LessonRow {
  id: number;
  moduleId: number;
  courseId: number;
  type: string;
  status: ContentStatus;
}

interface ProgressRow {
  userId: number;
  lessonId: number;
}

interface AttemptRow {
  id: number;
  userId: number;
  assessmentId: number;
  score: unknown;
}

interface AssessmentRow {
  id: number;
  courseId: number | null;
  type: string;
  status: ContentStatus;
}

interface UserAchievementRow {
  id: number;
  userId: number;
  achievementId: number;
  earnedAt: string;
  notifiedAt: string | null;
}

interface AchievementRow {
  id: number;
  code: string;
  name: string;
  description: string;
  category: string;
  icon: string;
  condition: string | null;
  status: ContentStatus;
  order: number;
  createdAt: string;
  updatedAt: string;
}

/* ---------------------------- Consultas internas --------------------------- */

async function findUser(userId: number): Promise<{ id: number } | null> {
  const user = await db.orm.public.User.first({ id: userId });

  return (user as unknown as { id: number } | null) ?? null;
}

async function findActiveCourses(): Promise<CourseRow[]> {
  const courses = await db.orm.public.Course
    .where((course) => course.status.eq('ACTIVE'))
    .all();

  return courses.map((course) => course as unknown as CourseRow);
}

async function findModules(
  courseIds: number[],
): Promise<ModuleRow[]> {
  if (courseIds.length === 0) {
    return [];
  }

  const modules = await db.orm.public.Module
    .where((module) => module.courseId.in(courseIds))
    .where((module) => module.status.eq('ACTIVE'))
    .all();

  return modules.map((module) => module as unknown as ModuleRow);
}

async function findLessons(
  moduleIds: number[],
): Promise<LessonRow[]> {
  if (moduleIds.length === 0) {
    return [];
  }

  const lessons = await db.orm.public.Lesson
    .where((lesson) => lesson.moduleId.in(moduleIds))
    .where((lesson) => lesson.status.eq('ACTIVE'))
    .all();

  return lessons.map((lesson) => lesson as unknown as LessonRow);
}

async function findLessonProgress(
  userId: number,
  lessonIds: number[],
): Promise<Set<number>> {
  const completed = new Set<number>();

  if (lessonIds.length === 0) {
    return completed;
  }

  const rows = await db.orm.public.LessonProgress
    .where({ userId })
    .where((progress) => progress.lessonId.in(lessonIds))
    .all();

  for (const raw of rows) {
    const progress = raw as unknown as ProgressRow;
    completed.add(progress.lessonId);
  }

  return completed;
}

async function findAssessmentAttempt(
  userId: number,
  assessmentId: number,
): Promise<AttemptRow | null> {
  const attempt = await db.orm.public.AssessmentAttempt
    .where({ userId })
    .where({ assessmentId })
    .first();

  return (attempt as unknown as AttemptRow | null) ?? null;
}

async function findAssessmentsForCourses(
  courseIds: number[],
): Promise<AssessmentRow[]> {
  if (courseIds.length === 0) {
    return [];
  }

  const assessments = await db.orm.public.Assessment
    .where((assessment) => assessment.courseId.in(courseIds))
    .where((assessment) => assessment.type.eq('COURSE_FINAL'))
    .all();

  return assessments.map(
    (assessment) => assessment as unknown as AssessmentRow,
  );
}

async function findAllAchievements(): Promise<AchievementRow[]> {
  const achievements = await db.orm.public.Achievement
    .where((achievement) => achievement.status.eq('ACTIVE'))
    .orderBy((achievement) => achievement.order.asc())
    .all();

  return achievements.map(
    (achievement) => achievement as unknown as AchievementRow,
  );
}

async function findUserAchievements(
  userId: number,
): Promise<UserAchievementRow[]> {
  const rows = await db.orm.public.UserAchievement
    .where({ userId })
    .orderBy((userAchievement) => userAchievement.earnedAt.desc())
    .all();

  return rows.map((row) => row as unknown as UserAchievementRow);
}

async function findPendingNotifications(
  userId: number,
): Promise<UserAchievementRow[]> {
  const rows = await db.orm.public.UserAchievement
    .where({ userId })
    .where((userAchievement) =>
      userAchievement.notifiedAt.isNull(),
    )
    .orderBy((userAchievement) => userAchievement.earnedAt.desc())
    .all();

  return rows.map((row) => row as unknown as UserAchievementRow);
}

function toAchievement(row: AchievementRow): Achievement {
  return {
    id: row.id,
    code: row.code,
    name: row.name,
    description: row.description,
    category: row.category,
    icon: row.icon,
    condition: row.condition,
    status: row.status,
    order: row.order,
    createdAt: row.createdAt,
    updatedAt: row.updatedAt,
  };
}

/* ------------------------- Estado académico del usuario ----------------------- */

/**
 * Calcula el contexto de gamificación de una persona a partir de datos de
 * confianza de la base de datos.
 */
async function buildGamificationContext(
  userId: number,
  earnedAchievementCodes: Set<string> = new Set(),
): Promise<GamificationContext> {
  const user = await findUser(userId);

  if (!user) {
    throw new AppError(404, 'USER_NOT_FOUND', USER_NOT_FOUND_MESSAGE);
  }

  const courses = await findActiveCourses();
  const courseIds = courses.map((course) => course.id);
  const modules = await findModules(courseIds);
  const moduleIds = modules.map((module) => module.id);
  const lessons = await findLessons(moduleIds);
  const lessonIds = lessons.map((lesson) => lesson.id);

  const completedLessonIds = await findLessonProgress(userId, lessonIds);
  const lessonIdsByModuleId = new Map<number, number[]>();
  const lessonIdsByCourseId = new Map<number, number[]>();
  const moduleIdToCourseId = new Map<number, number>();

  for (const module of modules) {
    moduleIdToCourseId.set(module.id, module.courseId);
  }

  for (const lesson of lessons) {
    const byModule = lessonIdsByModuleId.get(lesson.moduleId) ?? [];
    byModule.push(lesson.id);
    lessonIdsByModuleId.set(lesson.moduleId, byModule);

    const courseId = moduleIdToCourseId.get(lesson.moduleId);
    if (courseId === undefined) {
      continue;
    }

    const byCourse = lessonIdsByCourseId.get(courseId) ?? [];
    byCourse.push(lesson.id);
    lessonIdsByCourseId.set(courseId, byCourse);
  }

  // Módulos completados: todas sus lecciones activas tienen progreso.
  const completedModuleIds = new Set<number>();

  for (const module of modules) {
    const moduleLessonIds = lessonIdsByModuleId.get(module.id) ?? [];

    if (
      moduleLessonIds.length > 0 &&
      moduleLessonIds.every((lessonId) => completedLessonIds.has(lessonId))
    ) {
      completedModuleIds.add(module.id);
    }
  }

  // Cursos completados: todas las lecciones activas tienen progreso y la
  // evaluación final fue aprobada (puntaje >= 80 %).
  const assessments = await findAssessmentsForCourses(courseIds);
  const attemptsByAssessmentId = new Map<number, AttemptRow>();

  for (const assessment of assessments) {
    if (assessment.courseId === null) {
      continue;
    }

    const attempt = await findAssessmentAttempt(userId, assessment.id);

    if (attempt !== null) {
      attemptsByAssessmentId.set(assessment.id, attempt);
    }
  }

  const completedCourseIds: number[] = [];

  for (const course of courses) {
    const courseLessonIds = lessonIdsByCourseId.get(course.id) ?? [];

    if (
      courseLessonIds.length === 0 ||
      !courseLessonIds.every((lessonId) => completedLessonIds.has(lessonId))
    ) {
      continue;
    }

    const assessment = assessments.find(
      (a) => a.courseId === course.id,
    );

    if (!assessment) {
      continue;
    }

    const attempt = attemptsByAssessmentId.get(assessment.id);

    if (
      !attempt ||
      (typeof attempt.score !== 'string' &&
        typeof attempt.score !== 'number')
    ) {
      continue;
    }

    const score = Number(attempt.score);

    if (Number.isNaN(score) || score < 80) {
      continue;
    }

    completedCourseIds.push(course.id);
  }

  // Asociación curso → medalla, usando los títulos exactos del catálogo.
  const courseIdToMedalCode = new Map<number, string>();

  for (const course of courses) {
    const medalCode = COURSE_MEDAL_CODES[course.title];

    if (medalCode) {
      courseIdToMedalCode.set(course.id, medalCode);
    }
  }

  const hasCompletedLesson = completedLessonIds.size > 0;
  const hasCompletedModule = completedModuleIds.size > 0;
  const hasCompletedLaboratory = lessons.some(
    (lesson) =>
      lesson.type === 'LABORATORY' && completedLessonIds.has(lesson.id),
  );

  return {
    completedCourseIds,
    courseIdToMedalCode,
    earnedAchievementCodes,
    hasCompletedLesson,
    hasCompletedModule,
    hasCompletedLaboratory,
  };
}

/* ---------------------------- Catálogo y colección --------------------------- */

export async function getAchievementCatalog(): Promise<Achievement[]> {
  const rows = await findAllAchievements();

  return rows.map(toAchievement);
}

export async function getStudentAchievementCollection(
  userId: number,
): Promise<AchievementCollection> {
  await findUser(userId); // lanza 404 si no existe

  const [catalogRows, earnedRows] = await Promise.all([
    findAllAchievements(),
    findUserAchievements(userId),
  ]);

  const earnedByAchievementId = new Map<number, UserAchievementRow>();

  for (const earned of earnedRows) {
    earnedByAchievementId.set(earned.achievementId, earned);
  }

  const entries: AchievementEntry[] = catalogRows.map((row) => {
    const earned = earnedByAchievementId.get(row.id);
    const achievement = toAchievement(row);

    return {
      ...achievement,
      earned: earned !== undefined,
      earnedAt: earned?.earnedAt ?? null,
      notifiedAt: earned?.notifiedAt ?? null,
    };
  });

  const courseMedals = entries.filter(
    (entry) => entry.category === 'COURSE_MEDAL',
  );
  const learningRanks = entries.filter(
    (entry) => entry.category === 'LEARNING_RANK',
  );
  const complementary = entries.filter(
    (entry) => entry.category === 'COMPLEMENTARY',
  );

  return { courseMedals, learningRanks, complementary };
}

/* ---------------------------- Desbloqueo automático --------------------------- */

function toUserAchievement(
  row: UserAchievementRow,
  achievement: Achievement,
): UserAchievement {
  return {
    id: row.id,
    userId: row.userId,
    achievementId: row.achievementId,
    achievement,
    earnedAt: row.earnedAt,
    notifiedAt: row.notifiedAt,
  };
}

/**
 * Evalúa los logros elegibles para la persona y persiste los nuevos.
 *
 * Debe invocarse tras confirmar un evento académico (completar una lección,
 * finalizar un laboratorio o aprobar la evaluación final de un curso).
 * Devuelve los logros recién desbloqueados.
 */
export async function evaluateAndUnlockAchievements(
  userId: number,
): Promise<UnlockResult> {
  await findUser(userId); // lanza 404 si no existe

  const [catalogRows, earnedRows] = await Promise.all([
    findAllAchievements(),
    findUserAchievements(userId),
  ]);

  const codeByAchievementId = new Map(
    catalogRows.map(
      (row) => [(row as unknown as { id: number }).id, row.code] as const,
    ),
  );

  const earnedCodes = new Set<string>();

  for (const row of earnedRows) {
    const achievementId = (row as unknown as { achievementId: number })
      .achievementId;
    const code = codeByAchievementId.get(achievementId);

    if (code) {
      earnedCodes.add(code);
    }
  }

  const context = await buildGamificationContext(userId, earnedCodes);

  const rules: AchievementRule[] = ACHIEVEMENT_RULES;
  const eligibleCodes = evaluateEligibleAchievements(rules, context);

  if (eligibleCodes.length === 0) {
    return { newlyUnlocked: [] };
  }

  const eligibleAchievements = catalogRows.filter((row) =>
    eligibleCodes.includes(row.code),
  );

  const now = new Date().toISOString();

  await db.transaction(async (tx) => {
    for (const row of eligibleAchievements) {
      await tx.orm.public.UserAchievement.create({
        userId,
        achievementId: row.id,
        earnedAt: now,
        notifiedAt: null,
      });
    }
  });

  const newlyUnlocked: Achievement[] = eligibleAchievements.map(toAchievement);

  return { newlyUnlocked };
}

/* ---------------------------- Notificaciones --------------------------- */

export async function getPendingAchievementNotifications(
  userId: number,
): Promise<UserAchievement[]> {
  await findUser(userId);

  const [rows, catalog] = await Promise.all([
    findPendingNotifications(userId),
    findAllAchievements(),
  ]);

  const achievementById = new Map<number, Achievement>();

  for (const row of catalog) {
    achievementById.set(row.id, toAchievement(row));
  }

  return rows.map((row) =>
    toUserAchievement(row, achievementById.get(row.achievementId)!),
  );
}

export async function markAchievementNotificationViewed(
  userId: number,
  userAchievementId: number,
): Promise<void> {
  const existing = await db.orm.public.UserAchievement
    .where({ id: userAchievementId })
    .where({ userId })
    .where((userAchievement) =>
      userAchievement.notifiedAt.isNull(),
    )
    .first();

  if (!existing) {
    throw new AppError(404, 'ACHIEVEMENT_NOT_FOUND', ACHIEVEMENT_NOT_FOUND_MESSAGE);
  }

  await db.orm.public.UserAchievement
    .where({ id: userAchievementId })
    .update({ notifiedAt: new Date().toISOString() });
}

/* ---------------------------- Resumen del panel --------------------------- */

export async function getAchievementDashboardSummary(
  userId: number,
): Promise<AchievementDashboardSummary> {
  const [collection, earnedRows, catalogRows, pendingRows] =
    await Promise.all([
      getStudentAchievementCollection(userId),
      findUserAchievements(userId),
      findAllAchievements(),
      findPendingNotifications(userId),
  ]);

  const completedCoursesCount =
    (await buildGamificationContext(userId)).completedCourseIds.length;

  const totalCourses = catalogRows.filter(
    (row) => row.category === 'COURSE_MEDAL',
  ).length;

  const earnedMedals = collection.courseMedals.filter(
    (entry) => entry.earned,
  ).length;

  const totalMedals = collection.courseMedals.length;

  const currentRank = collection.learningRanks
    .filter((entry) => entry.earned)
    .sort(
      (a, b) => b.order - a.order,
    )[0]?.name ?? null;

  const nextAchievement = collection.complementary
    .filter((entry) => !entry.earned)
    .sort((a, b) => a.order - b.order)[0]?.name ?? null;

  const nextRankProgress = (() => {
    const thresholds = [
      { code: 'BASIC_LEARNER', required: 2 },
      { code: 'INTERMEDIATE_LEARNER', required: 3 },
      { code: 'ADVANCED_LEARNER', required: 5 },
    ] as const;

    const earnedRankCodes = new Set(
      collection.learningRanks
        .filter((entry) => entry.earned)
        .map((entry) => entry.code),
    );

    for (const { required } of thresholds) {
      if (!earnedRankCodes.has('ADVANCED_LEARNER') && completedCoursesCount < required) {
        return { completed: completedCoursesCount, required };
      }
    }

    return null;
  })();

  return {
    completedCourses: completedCoursesCount,
    totalCourses,
    earnedMedals,
    totalMedals,
    currentRank,
    nextAchievement,
    nextRankProgress,
    pendingNotifications: pendingRows.length,
  };
}
