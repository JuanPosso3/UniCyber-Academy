import { db } from '../../prisma/db.js';
import {
  canTransitionContent,
  isAvailableToStudents,
  type ContentStatus,
} from '../../domain/content.js';
import { AppError } from '../../infrastructure/http/errors.js';
import type {
  CourseDetail,
  CourseModuleList,
  CourseSummary,
  CreateCourseInput,
  CreateModuleInput,
  ModuleSummary,
  MoveModuleInput,
  UpdateCourseInput,
  UpdateModuleInput,
} from './course.types.js';

const COURSE_NOT_FOUND_MESSAGE = 'El curso no existe.';
const COURSE_NOT_AVAILABLE_MESSAGE =
  'El curso no está disponible para estudiantes.';
const MODULE_NOT_FOUND_MESSAGE =
  'El módulo no existe en este curso.';
const ARCHIVED_COURSE_MESSAGE =
  'No se pueden modificar los módulos de un curso archivado.';

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

function toCourseSummary(
  course: CourseRow,
  moduleCount: number,
): CourseSummary {
  return {
    id: course.id,
    title: course.title,
    description: course.description,
    status: course.status,
    moduleCount,
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

async function getModuleCounts(
  courseIds: readonly number[],
  onlyPublished = false,
): Promise<Map<number, number>> {
  const counts = new Map<number, number>();

  if (courseIds.length === 0) {
    return counts;
  }

  let query = db.orm.public.Module.where((module) =>
    module.courseId.in(courseIds),
  );

  if (onlyPublished) {
    query = query.where((module) => module.status.eq('ACTIVE'));
  }

  const modules = await query.all();

  for (const module of modules) {
    counts.set(module.courseId, (counts.get(module.courseId) ?? 0) + 1);
  }

  return counts;
}

function invalidStatusTransition(): never {
  throw new AppError(
    409,
    'INVALID_STATUS_TRANSITION',
    'La transición de estado solicitada no está permitida.',
  );
}

async function findCourse(id: number): Promise<CourseRow> {
  const course = await db.orm.public.Course.first({ id });

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

/* -------------------------------------------------------------------------- */
/* Catálogo y consultas para estudiantes                                      */
/* -------------------------------------------------------------------------- */

export async function listAvailableCourses(): Promise<CourseSummary[]> {
  const courses = await db.orm.public.Course
    .where((course) => course.status.eq('ACTIVE'))
    .orderBy((course) => course.title.asc())
    .all();

  const moduleCounts = await getModuleCounts(
    courses.map((course) => course.id),
    true,
  );

  return courses.map((course) =>
    toCourseSummary(course, moduleCounts.get(course.id) ?? 0),
  );
}

export async function getAvailableCourse(
  courseId: number,
): Promise<CourseDetail> {
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

  return {
    ...toCourseSummary(course, modules.length),
    modules: modules.map(toModuleSummary),
  };
}

export async function listAvailableModules(
  courseId: number,
): Promise<ModuleSummary[]> {
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

  return modules.map(toModuleSummary);
}

/* -------------------------------------------------------------------------- */
/* Administración de cursos                                                   */
/* -------------------------------------------------------------------------- */

export async function listAdminCourses(): Promise<CourseSummary[]> {
  const courses = await db.orm.public.Course
    .orderBy((course) => course.updatedAt.desc())
    .all();

  const moduleCounts = await getModuleCounts(
    courses.map((course) => course.id),
  );

  return courses.map((course) =>
    toCourseSummary(course, moduleCounts.get(course.id) ?? 0),
  );
}

export async function getAdminCourse(
  courseId: number,
): Promise<CourseDetail> {
  const course = await findCourse(courseId);
  const modules = await db.orm.public.Module
    .where({ courseId })
    .orderBy((module) => module.order.asc())
    .all();

  return {
    ...toCourseSummary(course, modules.length),
    modules: modules.map(toModuleSummary),
  };
}

export async function createCourse(
  input: CreateCourseInput,
): Promise<CourseSummary> {
  const course = await db.orm.public.Course.create({
    title: input.title,
    description: input.description,
    status: 'DRAFT',
  });

  return toCourseSummary(course, 0);
}

export async function updateCourse(
  courseId: number,
  input: UpdateCourseInput,
): Promise<CourseSummary> {
  await findCourse(courseId);

  const data: {
    title?: string;
    description?: string | null;
  } = {};

  if (input.title !== undefined) {
    data.title = input.title;
  }

  if (input.description !== undefined) {
    data.description = input.description;
  }

  const updated = await db.orm.public.Course
    .where({ id: courseId })
    .update(data);

  if (!updated) {
    throw new AppError(404, 'COURSE_NOT_FOUND', COURSE_NOT_FOUND_MESSAGE);
  }

  const counts = await getModuleCounts([courseId]);

  return toCourseSummary(updated, counts.get(courseId) ?? 0);
}

export async function changeCourseStatus(
  courseId: number,
  nextStatus: ContentStatus,
): Promise<CourseSummary> {
  const course = await findCourse(courseId);

  if (!canTransitionContent(course.status, nextStatus)) {
    invalidStatusTransition();
  }

  const updated = await db.orm.public.Course
    .where({ id: courseId })
    .update({ status: nextStatus });

  if (!updated) {
    throw new AppError(404, 'COURSE_NOT_FOUND', COURSE_NOT_FOUND_MESSAGE);
  }

  const counts = await getModuleCounts([courseId]);

  return toCourseSummary(updated, counts.get(courseId) ?? 0);
}

/* -------------------------------------------------------------------------- */
/* Administración de módulos                                                  */
/* -------------------------------------------------------------------------- */

export async function listAdminModules(
  courseId: number,
): Promise<CourseModuleList> {
  const course = await findCourse(courseId);
  const modules = await db.orm.public.Module
    .where({ courseId })
    .orderBy((module) => module.order.asc())
    .all();

  return {
    course: {
      id: course.id,
      title: course.title,
      status: course.status,
    },
    modules: modules.map(toModuleSummary),
  };
}

export async function createModule(
  courseId: number,
  input: CreateModuleInput,
): Promise<ModuleSummary> {
  const created = await db.transaction(async (tx) => {
    const course = await tx.orm.public.Course.first({ id: courseId });

    if (!course) {
      throw new AppError(404, 'COURSE_NOT_FOUND', COURSE_NOT_FOUND_MESSAGE);
    }

    if (course.status === 'ARCHIVED') {
      throw new AppError(
        409,
        'COURSE_ARCHIVED',
        ARCHIVED_COURSE_MESSAGE,
      );
    }

    const lastModule = await tx.orm.public.Module
      .where({ courseId })
      .orderBy((module) => module.order.desc())
      .first();

    return tx.orm.public.Module.create({
      courseId,
      title: input.title,
      description: input.description,
      order: (lastModule?.order ?? 0) + 1,
      status: 'DRAFT',
    });
  });

  return toModuleSummary(created);
}

export async function getAdminModule(
  courseId: number,
  moduleId: number,
): Promise<ModuleSummary> {
  const module = await findModule(courseId, moduleId);

  return toModuleSummary(module);
}

export async function updateModule(
  courseId: number,
  moduleId: number,
  input: UpdateModuleInput,
): Promise<ModuleSummary> {
  const course = await findCourse(courseId);

  if (course.status === 'ARCHIVED') {
    throw new AppError(409, 'COURSE_ARCHIVED', ARCHIVED_COURSE_MESSAGE);
  }

  await findModule(courseId, moduleId);

  const data: {
    title?: string;
    description?: string | null;
  } = {};

  if (input.title !== undefined) {
    data.title = input.title;
  }

  if (input.description !== undefined) {
    data.description = input.description;
  }

  const updated = await db.orm.public.Module
    .where({ id: moduleId })
    .update(data);

  if (!updated || updated.courseId !== courseId) {
    throw new AppError(404, 'MODULE_NOT_FOUND', MODULE_NOT_FOUND_MESSAGE);
  }

  return toModuleSummary(updated);
}

export async function changeModuleStatus(
  courseId: number,
  moduleId: number,
  nextStatus: ContentStatus,
): Promise<ModuleSummary> {
  const course = await findCourse(courseId);

  if (course.status === 'ARCHIVED') {
    throw new AppError(409, 'COURSE_ARCHIVED', ARCHIVED_COURSE_MESSAGE);
  }

  const module = await findModule(courseId, moduleId);

  if (!canTransitionContent(module.status, nextStatus)) {
    invalidStatusTransition();
  }

  const updated = await db.orm.public.Module
    .where({ id: moduleId })
    .update({ status: nextStatus });

  if (!updated || updated.courseId !== courseId) {
    throw new AppError(404, 'MODULE_NOT_FOUND', MODULE_NOT_FOUND_MESSAGE);
  }

  return toModuleSummary(updated);
}

export async function moveModule(
  courseId: number,
  moduleId: number,
  input: MoveModuleInput,
): Promise<ModuleSummary[]> {
  return db.transaction(async (tx) => {
    const course = await tx.orm.public.Course.first({ id: courseId });

    if (!course) {
      throw new AppError(
        404,
        'COURSE_NOT_FOUND',
        COURSE_NOT_FOUND_MESSAGE,
      );
    }

    if (course.status === 'ARCHIVED') {
      throw new AppError(409, 'COURSE_ARCHIVED', ARCHIVED_COURSE_MESSAGE);
    }

    const modules = await tx.orm.public.Module
      .where({ courseId })
      .orderBy((module) => module.order.asc())
      .all();

    const currentIndex = modules.findIndex(
      (module) => module.id === moduleId,
    );

    if (currentIndex === -1) {
      throw new AppError(404, 'MODULE_NOT_FOUND', MODULE_NOT_FOUND_MESSAGE);
    }

    const targetIndex =
      input.direction === 'up' ? currentIndex - 1 : currentIndex + 1;

    if (targetIndex < 0 || targetIndex >= modules.length) {
      throw new AppError(
        409,
        'MODULE_ORDER_BOUNDARY',
        'El módulo ya está en el extremo de la lista.',
      );
    }

    const current = modules[currentIndex]!;
    const target = modules[targetIndex]!;
    const temporaryOrder = -1;

    await tx.orm.public.Module
      .where({ id: current.id })
      .update({ order: temporaryOrder });

    await tx.orm.public.Module
      .where({ id: target.id })
      .update({ order: current.order });

    await tx.orm.public.Module
      .where({ id: current.id })
      .update({ order: target.order });

    const reordered = await tx.orm.public.Module
      .where({ courseId })
      .orderBy((module) => module.order.asc())
      .all();

    return reordered.map(toModuleSummary);
  });
}
