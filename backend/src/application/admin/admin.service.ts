import { db } from '../../prisma/db.js';
import { AppError } from '../../infrastructure/http/errors.js';
import { isAdminRole, isUserRole } from '../../domain/user.js';
import type { ContentStatus } from '../../domain/content.js';
import type {
  AdminDashboardStatistics,
  AdminUserSummary,
  RegistrationPoint,
  UpdateManagedUserInput,
} from './admin.types.js';

const USER_NOT_FOUND_MESSAGE = 'El usuario no existe.';
const USERNAME_ALREADY_EXISTS = 'Ya existe un usuario con ese nombre de usuario.';
const USERNAME_TOO_SHORT =
  'El nombre de usuario debe tener al menos 3 caracteres.';
const USERNAME_TOO_LONG =
  'El nombre de usuario no puede superar los 100 caracteres.';
const INVALID_ROLE = 'El rol indicado no es válido.';
const LAST_ADMIN_MESSAGE =
  'La plataforma debe conservar al menos un administrador activo.';
const SELF_ROLE_MESSAGE = 'No puedes cambiar tu propio rol.';
const PASSING_SCORE = 80;
const REGISTRATION_MONTHS = 6;

const MONTH_LABELS = [
  'ene',
  'feb',
  'mar',
  'abr',
  'may',
  'jun',
  'jul',
  'ago',
  'sep',
  'oct',
  'nov',
  'dic',
] as const;

interface UserRow {
  id: number;
  firstName: string;
  lastName: string;
  username: string | null;
  email: string;
  role: string;
  status: string;
  createdAt: string;
}

interface CourseRow {
  id: number;
  title: string;
  status: ContentStatus;
  createdAt: string;
}

interface ModuleRow {
  id: number;
  courseId: number;
  status: ContentStatus;
}

interface LessonRow {
  id: number;
  moduleId: number;
  type: string;
  status: ContentStatus;
}

interface ProgressRow {
  userId: number;
  lessonId: number;
}

interface AssessmentRow {
  id: number;
  courseId: number | null;
  type: string;
}

interface AttemptRow {
  userId: number;
  assessmentId: number;
  score: unknown;
}

/* ----------------------------- Utilidades ----------------------------- */

function toAdminUser(user: UserRow): AdminUserSummary {
  return {
    id: user.id,
    firstName: user.firstName,
    lastName: user.lastName,
    username: user.username ?? null,
    email: user.email,
    role: user.role as AdminUserSummary['role'],
    status: user.status as AdminUserSummary['status'],
    createdAt: user.createdAt,
  };
}

function scoreIsPassing(score: unknown): boolean {
  const numeric = Number(score);

  return Number.isFinite(numeric) && numeric >= PASSING_SCORE;
}

/** Últimos seis meses, del más antiguo al actual, con etiquetas en español. */
function registrationPeriods(now: Date): Array<{ period: string; label: string }> {
  const periods: Array<{ period: string; label: string }> = [];

  for (let offset = REGISTRATION_MONTHS - 1; offset >= 0; offset -= 1) {
    const date = new Date(now.getFullYear(), now.getMonth() - offset, 1);
    const year = date.getFullYear();
    const month = date.getMonth();
    const key = `${year}-${String(month + 1).padStart(2, '0')}`;

    periods.push({
      period: key,
      label: `${MONTH_LABELS[month]} ${year}`,
    });
  }

  return periods;
}

/* ------------------------- Estadísticas del panel ------------------------- */

/**
 * Calcula las estadísticas administrativas con una carga acotada de datos.
 *
 * Definiciones:
 * - Cursos publicados: status ACTIVE. No publicados: cualquier otro estado.
 * - Participación: estudiantes con al menos una lección completada del curso.
 * - Aprobación: estudiantes con intento de evaluación final cuyo puntaje
 *   es mayor o igual a 80. Cada estudiante cuenta una sola vez por curso
 *   porque AssessmentAttempt es único por (usuario, evaluación).
 * - Cursos completados: pares únicos (estudiante, curso) con todas las
 *   lecciones activas completadas y la evaluación final aprobada.
 */
export async function getAdminDashboardStatistics(): Promise<AdminDashboardStatistics> {
  const [
    users,
    courses,
    modules,
    lessons,
    progressRows,
    assessments,
    attempts,
  ] = await Promise.all([
    db.orm.public.User.all(),
    db.orm.public.Course.all(),
    db.orm.public.Module.all(),
    db.orm.public.Lesson.all(),
    db.orm.public.LessonProgress.all(),
    db.orm.public.Assessment
      .where((assessment) => assessment.type.eq('COURSE_FINAL'))
      .all(),
    db.orm.public.AssessmentAttempt.all(),
  ]);

  const userRows = users as unknown as UserRow[];
  const courseRows = courses as unknown as CourseRow[];
  const moduleRows = modules as unknown as ModuleRow[];
  const lessonRows = lessons as unknown as LessonRow[];
  const progress = progressRows as unknown as ProgressRow[];
  const assessmentRows = assessments as unknown as AssessmentRow[];
  const attemptRows = attempts as unknown as AttemptRow[];

  const students = userRows.filter((user) => user.role === 'STUDENT');
  const studentIds = new Set(students.map((student) => student.id));

  const activeCourses = courseRows.filter((course) => course.status === 'ACTIVE');
  const activeCourseIds = new Set(activeCourses.map((course) => course.id));

  const activeModules = moduleRows.filter(
    (module) =>
      module.status === 'ACTIVE' && activeCourseIds.has(module.courseId),
  );
  const activeModuleIds = new Set(activeModules.map((module) => module.id));
  const moduleCourseId = new Map(
    activeModules.map((module) => [module.id, module.courseId] as const),
  );

  const activeLessons = lessonRows.filter(
    (lesson) =>
      lesson.status === 'ACTIVE' && activeModuleIds.has(lesson.moduleId),
  );

  const lessonCourseId = new Map<number, number>();

  for (const lesson of activeLessons) {
    const courseId = moduleCourseId.get(lesson.moduleId);

    if (courseId !== undefined) {
      lessonCourseId.set(lesson.id, courseId);
    }
  }

  const completedLessonByUser = new Map<number, Set<number>>();

  for (const row of progress) {
    if (!studentIds.has(row.userId)) {
      continue;
    }

    const completed = completedLessonByUser.get(row.userId) ?? new Set<number>();
    completed.add(row.lessonId);
    completedLessonByUser.set(row.userId, completed);
  }

  // Evaluación final y su intento por estudiante.
  const finalAssessmentByCourse = new Map<number, number>();

  for (const assessment of assessmentRows) {
    if (assessment.courseId !== null) {
      finalAssessmentByCourse.set(assessment.courseId, assessment.id);
    }
  }

  const attemptByUserAndAssessment = new Map<string, AttemptRow>();

  for (const attempt of attemptRows) {
    if (!studentIds.has(attempt.userId)) {
      continue;
    }

    attemptByUserAndAssessment.set(
      `${attempt.userId}:${attempt.assessmentId}`,
      attempt,
    );
  }

  const lessonIdsByCourse = new Map<number, number[]>();

  for (const lesson of activeLessons) {
    const courseId = lessonCourseId.get(lesson.id);

    if (courseId === undefined) {
      continue;
    }

    const ids = lessonIdsByCourse.get(courseId) ?? [];
    ids.push(lesson.id);
    lessonIdsByCourse.set(courseId, ids);
  }

  const topCourses = activeCourses
    .map((course) => {
      const courseLessonIds = lessonIdsByCourse.get(course.id) ?? [];
      let participating = 0;

      for (const student of students) {
        const completed = completedLessonByUser.get(student.id);

        if (
          completed &&
          courseLessonIds.some((lessonId) => completed.has(lessonId))
        ) {
          participating += 1;
        }
      }

      return {
        courseId: course.id,
        title: course.title,
        students: participating,
      };
    })
    .sort((a, b) => b.students - a.students || a.title.localeCompare(b.title))
    .slice(0, 5);

  let completedCourses = 0;

  for (const course of activeCourses) {
    const courseLessonIds = lessonIdsByCourse.get(course.id) ?? [];
    const assessmentId = finalAssessmentByCourse.get(course.id);

    if (courseLessonIds.length === 0 || assessmentId === undefined) {
      continue;
    }

    for (const student of students) {
      const completed = completedLessonByUser.get(student.id);

      if (
        !completed ||
        !courseLessonIds.every((lessonId) => completed.has(lessonId))
      ) {
        continue;
      }

      const attempt = attemptByUserAndAssessment.get(
        `${student.id}:${assessmentId}`,
      );

      if (attempt && scoreIsPassing(attempt.score)) {
        completedCourses += 1;
      }
    }
  }

  let attemptedStudents = 0;
  let passedStudents = 0;
  let assessmentAttempts = 0;

  for (const assessment of assessmentRows) {
    if (assessment.courseId === null || !activeCourseIds.has(assessment.courseId)) {
      continue;
    }

    for (const attempt of attemptRows) {
      if (attempt.assessmentId !== assessment.id) {
        continue;
      }

      if (!studentIds.has(attempt.userId)) {
        continue;
      }

      assessmentAttempts += 1;
      attemptedStudents += 1;

      if (scoreIsPassing(attempt.score)) {
        passedStudents += 1;
      }
    }
  }

  // Registros de estudiantes por mes (últimos seis meses).
  const periods = registrationPeriods(new Date());
  const countsByPeriod = new Map<string, number>();

  for (const student of students) {
    const date = new Date(student.createdAt);

    if (Number.isNaN(date.getTime())) {
      continue;
    }

    const key = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
    countsByPeriod.set(key, (countsByPeriod.get(key) ?? 0) + 1);
  }

  const registrations: RegistrationPoint[] = periods.map((period) => ({
    period: period.period,
    label: period.label,
    count: countsByPeriod.get(period.period) ?? 0,
  }));

  const publishedCourses = courseRows.filter(
    (course) => course.status === 'ACTIVE',
  ).length;

  return {
    students: {
      total: students.length,
      active: students.filter((student) => student.status === 'ACTIVE').length,
      disabled: students.filter((student) => student.status === 'DISABLED').length,
    },
    registrations,
    courses: {
      total: courseRows.length,
      published: publishedCourses,
      unpublished: courseRows.length - publishedCourses,
    },
    modules: moduleRows.length,
    lessons: {
      theory: lessonRows.filter((lesson) => lesson.type === 'THEORY').length,
      laboratory: lessonRows.filter((lesson) => lesson.type === 'LABORATORY').length,
    },
    topCourses,
    passingRate: {
      attemptedStudents,
      passedStudents,
      rate:
        attemptedStudents === 0
          ? 0
          : Math.round((passedStudents / attemptedStudents) * 100),
    },
    completedCourses,
    assessmentAttempts,
  };
}

/* ----------------------------- Usuarios ----------------------------- */

/** Lista de usuarios para la gestión administrativa, con búsqueda opcional. */
export async function listAdminUsers(search?: string): Promise<AdminUserSummary[]> {
  const rows = await db.orm.public.User
    .orderBy((user) => user.createdAt.desc())
    .all();

  const users = (rows as unknown as UserRow[]).map(toAdminUser);
  const term = search?.trim().toLowerCase();

  if (!term) {
    return users;
  }

  return users.filter((user) => {
    const haystack = [
      user.firstName,
      user.lastName,
      user.username ?? '',
      user.email,
    ]
      .join(' ')
      .toLowerCase();

    return haystack.includes(term);
  });
}

/**
 * Actualiza el nombre de usuario y/o el rol de una cuenta.
 *
 * No se permite eliminar usuarios: la plataforma conserva los registros
 * académicos asociados. Tampoco se permite quitar el rol al último
 * administrador activo ni cambiar el propio rol.
 */
export async function updateManagedUser(
  actorId: number,
  userId: number,
  input: UpdateManagedUserInput,
): Promise<AdminUserSummary> {
  const target = await db.orm.public.User.first({ id: userId });

  if (!target) {
    throw new AppError(404, 'USER_NOT_FOUND', USER_NOT_FOUND_MESSAGE);
  }

  const changes: Record<string, unknown> = {};

  if (input.username !== undefined) {
    const username = input.username.trim();

    if (username.length < 3) {
      throw new AppError(400, 'USERNAME_TOO_SHORT', USERNAME_TOO_SHORT);
    }

    if (username.length > 100) {
      throw new AppError(400, 'USERNAME_TOO_LONG', USERNAME_TOO_LONG);
    }

    const existing = await db.orm.public.User
      .where((user) => user.username.eq(username))
      .first();

    if (existing && (existing as { id: number }).id !== userId) {
      throw new AppError(
        409,
        'USERNAME_ALREADY_EXISTS',
        USERNAME_ALREADY_EXISTS,
      );
    }

    changes['username'] = username;
  }

  if (input.role !== undefined && input.role !== target.role) {
    if (userId === actorId) {
      throw new AppError(400, 'SELF_ROLE_CHANGE', SELF_ROLE_MESSAGE);
    }

    if (!isUserRole(input.role)) {
      throw new AppError(400, 'INVALID_ROLE', INVALID_ROLE);
    }

    const targetIsActiveAdmin =
      isAdminRole(target.role as AdminUserSummary['role']) &&
      target.status === 'ACTIVE';

    if (targetIsActiveAdmin && !isAdminRole(input.role)) {
      const activeAdmins = await db.orm.public.User
        .where((user) => user.role.eq('ADMINISTRATIVE'))
        .where((user) => user.status.eq('ACTIVE'))
        .all();

      if (activeAdmins.length <= 1) {
        throw new AppError(409, 'LAST_ADMIN', LAST_ADMIN_MESSAGE);
      }
    }

    changes['role'] = input.role;
  }

  if (Object.keys(changes).length === 0) {
    return toAdminUser(target as unknown as UserRow);
  }

  const updated = await db.orm.public.User
    .where({ id: userId })
    .update(changes);

  if (!updated) {
    throw new AppError(404, 'USER_NOT_FOUND', USER_NOT_FOUND_MESSAGE);
  }

  return toAdminUser(updated as unknown as UserRow);
}
