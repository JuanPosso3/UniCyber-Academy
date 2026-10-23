import type { Request, Response } from 'express';
import { AppError } from '../../infrastructure/http/errors.js';
import {
  changeCourseStatus as changeCourseStatusService,
  changeModuleStatus as changeModuleStatusService,
  createCourse as createCourseService,
  createModule as createModuleService,
  getAdminCourse as getAdminCourseService,
  getAdminModule as getAdminModuleService,
  getAvailableCourse as getAvailableCourseService,
  listAdminCourses as listAdminCoursesService,
  listAdminModules as listAdminModulesService,
  listAvailableCourses as listAvailableCoursesService,
  listAvailableModules as listAvailableModulesService,
  moveModule as moveModuleService,
  updateCourse as updateCourseService,
  updateModule as updateModuleService,
} from './course.service.js';
import {
  validateContentStatus,
  validateCreateCourse,
  validateCreateModule,
  validateMoveModule,
  validateUpdateCourse,
  validateUpdateModule,
  type FieldErrors,
} from './course.validation.js';

function parseId(value: unknown): number {
  const id = typeof value === 'string' ? Number(value) : Number.NaN;

  if (!Number.isInteger(id) || id <= 0) {
    throw new AppError(
      400,
      'INVALID_IDENTIFIER',
      'El identificador no es válido.',
    );
  }

  return id;
}

function sendValidationErrors(
  res: Response,
  fields: FieldErrors,
): void {
  res.status(400).json({
    error: {
      code: 'VALIDATION_ERROR',
      message: 'Los datos enviados no son válidos.',
      fields,
    },
  });
}

/* ------------------------------- Estudiantes ------------------------------ */

export async function listAvailableCourses(
  _req: Request,
  res: Response,
): Promise<void> {
  const courses = await listAvailableCoursesService();

  res.status(200).json({ courses });
}

export async function getAvailableCourse(
  req: Request,
  res: Response,
): Promise<void> {
  const courseId = parseId(req.params['courseId']);
  const course = await getAvailableCourseService(courseId);

  res.status(200).json({ course });
}

export async function listAvailableModules(
  req: Request,
  res: Response,
): Promise<void> {
  const courseId = parseId(req.params['courseId']);
  const modules = await listAvailableModulesService(courseId);

  res.status(200).json({ modules });
}

/* ------------------------------ Administración ---------------------------- */

export async function listAdminCourses(
  _req: Request,
  res: Response,
): Promise<void> {
  const courses = await listAdminCoursesService();

  res.status(200).json({ courses });
}

export async function createCourse(
  req: Request,
  res: Response,
): Promise<void> {
  const result = validateCreateCourse(req.body);

  if (!result.ok) {
    sendValidationErrors(res, result.errors);
    return;
  }

  const course = await createCourseService(result.data);

  res.status(201).json({ course });
}

export async function getAdminCourse(
  req: Request,
  res: Response,
): Promise<void> {
  const courseId = parseId(req.params['courseId']);
  const course = await getAdminCourseService(courseId);

  res.status(200).json({ course });
}

export async function updateCourse(
  req: Request,
  res: Response,
): Promise<void> {
  const courseId = parseId(req.params['courseId']);
  const result = validateUpdateCourse(req.body);

  if (!result.ok) {
    sendValidationErrors(res, result.errors);
    return;
  }

  const course = await updateCourseService(courseId, result.data);

  res.status(200).json({ course });
}

export async function changeCourseStatus(
  req: Request,
  res: Response,
): Promise<void> {
  const courseId = parseId(req.params['courseId']);
  const result = validateContentStatus(req.body);

  if (!result.ok) {
    sendValidationErrors(res, result.errors);
    return;
  }

  const course = await changeCourseStatusService(
    courseId,
    result.data.status,
  );

  res.status(200).json({ course });
}

export async function listAdminModules(
  req: Request,
  res: Response,
): Promise<void> {
  const courseId = parseId(req.params['courseId']);
  const result = await listAdminModulesService(courseId);

  res.status(200).json(result);
}

export async function createModule(
  req: Request,
  res: Response,
): Promise<void> {
  const courseId = parseId(req.params['courseId']);
  const result = validateCreateModule(req.body);

  if (!result.ok) {
    sendValidationErrors(res, result.errors);
    return;
  }

  const module = await createModuleService(courseId, result.data);

  res.status(201).json({ module });
}

export async function getAdminModule(
  req: Request,
  res: Response,
): Promise<void> {
  const courseId = parseId(req.params['courseId']);
  const moduleId = parseId(req.params['moduleId']);
  const module = await getAdminModuleService(courseId, moduleId);

  res.status(200).json({ module });
}

export async function updateModule(
  req: Request,
  res: Response,
): Promise<void> {
  const courseId = parseId(req.params['courseId']);
  const moduleId = parseId(req.params['moduleId']);
  const result = validateUpdateModule(req.body);

  if (!result.ok) {
    sendValidationErrors(res, result.errors);
    return;
  }

  const module = await updateModuleService(
    courseId,
    moduleId,
    result.data,
  );

  res.status(200).json({ module });
}

export async function changeModuleStatus(
  req: Request,
  res: Response,
): Promise<void> {
  const courseId = parseId(req.params['courseId']);
  const moduleId = parseId(req.params['moduleId']);
  const result = validateContentStatus(req.body);

  if (!result.ok) {
    sendValidationErrors(res, result.errors);
    return;
  }

  const module = await changeModuleStatusService(
    courseId,
    moduleId,
    result.data.status,
  );

  res.status(200).json({ module });
}

export async function moveModule(
  req: Request,
  res: Response,
): Promise<void> {
  const courseId = parseId(req.params['courseId']);
  const moduleId = parseId(req.params['moduleId']);
  const result = validateMoveModule(req.body);

  if (!result.ok) {
    sendValidationErrors(res, result.errors);
    return;
  }

  const modules = await moveModuleService(
    courseId,
    moduleId,
    result.data,
  );

  res.status(200).json({ modules });
}
