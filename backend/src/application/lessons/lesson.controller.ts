import type { Request, Response } from 'express';
import { AppError } from '../../infrastructure/http/errors.js';
import type { AuthenticatedRequest } from '../../infrastructure/http/auth.middleware.js';
import {
  changeLessonStatus as changeLessonStatusService,
  checkActivityAnswer as checkActivityAnswerService,
  completeTheoryLesson as completeTheoryLessonService,
  createLesson as createLessonService,
  deleteLesson as deleteLessonService,
  executeTerminalCommand as executeTerminalCommandService,
  finalizeLaboratory as finalizeLaboratoryService,
  getAdminLesson as getAdminLessonService,
  getStudentCourseDetail as getStudentCourseDetailService,
  getStudentLesson as getStudentLessonService,
  listAdminLessons as listAdminLessonsService,
  moveLesson as moveLessonService,
  previewActivityAnswer as previewActivityAnswerService,
  previewTerminalCommand as previewTerminalCommandService,
  updateLesson as updateLessonService,
  validateLessonContentPayload as validateLessonContentPayloadService,
  validateStoredLessonContent as validateStoredLessonContentService,
} from './lesson.service.js';
import {
  validateActivityAnswerRequest,
  validateCreateLesson,
  validateLabAnswersRequest,
  validateLessonContentRequest,
  validateMoveLesson,
  validateTerminalCommandRequest,
  validateUpdateLesson,
  type LessonFieldErrors,
} from './lesson.validation.js';
import { isContentStatus } from '../../domain/content.js';

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

function parseActivityId(value: unknown): string {
  if (typeof value !== 'string' || value.trim().length === 0) {
    throw new AppError(
      400,
      'INVALID_IDENTIFIER',
      'El identificador de la actividad no es válido.',
    );
  }

  return value.trim();
}

function sendValidationErrors(
  res: Response,
  fields: LessonFieldErrors,
): void {
  res.status(400).json({
    error: {
      code: 'VALIDATION_ERROR',
      message: 'Los datos enviados no son válidos.',
      fields,
    },
  });
}

function currentUserId(req: Request): number {
  return (req as AuthenticatedRequest).authUser.id;
}

/* -------------------------------------------------------------------------- */
/* Administración de lecciones                                                */
/* -------------------------------------------------------------------------- */

export async function listAdminLessons(
  req: Request,
  res: Response,
): Promise<void> {
  const courseId = parseId(req.params['courseId']);
  const moduleId = parseId(req.params['moduleId']);
  const result = await listAdminLessonsService(courseId, moduleId);

  res.status(200).json(result);
}

export async function createLesson(
  req: Request,
  res: Response,
): Promise<void> {
  const courseId = parseId(req.params['courseId']);
  const moduleId = parseId(req.params['moduleId']);
  const validation = validateCreateLesson(req.body);

  if (!validation.ok) {
    sendValidationErrors(res, validation.errors);
    return;
  }

  const lesson = await createLessonService(
    courseId,
    moduleId,
    validation.data,
  );

  res.status(201).json({ lesson });
}

export async function getAdminLesson(
  req: Request,
  res: Response,
): Promise<void> {
  const courseId = parseId(req.params['courseId']);
  const moduleId = parseId(req.params['moduleId']);
  const lessonId = parseId(req.params['lessonId']);
  const result = await getAdminLessonService(courseId, moduleId, lessonId);

  res.status(200).json(result);
}

export async function updateLesson(
  req: Request,
  res: Response,
): Promise<void> {
  const courseId = parseId(req.params['courseId']);
  const moduleId = parseId(req.params['moduleId']);
  const lessonId = parseId(req.params['lessonId']);
  const validation = validateUpdateLesson(req.body);

  if (!validation.ok) {
    sendValidationErrors(res, validation.errors);
    return;
  }

  const lesson = await updateLessonService(
    courseId,
    moduleId,
    lessonId,
    validation.data,
  );

  res.status(200).json({ lesson });
}

export async function changeLessonStatus(
  req: Request,
  res: Response,
): Promise<void> {
  const courseId = parseId(req.params['courseId']);
  const moduleId = parseId(req.params['moduleId']);
  const lessonId = parseId(req.params['lessonId']);
  const status = req.body?.['status'];

  if (!isContentStatus(status)) {
    sendValidationErrors(res, {
      status: 'El estado seleccionado no es válido.',
    });
    return;
  }

  const lesson = await changeLessonStatusService(
    courseId,
    moduleId,
    lessonId,
    status,
  );

  res.status(200).json({ lesson });
}

export async function moveLesson(
  req: Request,
  res: Response,
): Promise<void> {
  const courseId = parseId(req.params['courseId']);
  const moduleId = parseId(req.params['moduleId']);
  const lessonId = parseId(req.params['lessonId']);
  const validation = validateMoveLesson(req.body);

  if (!validation.ok) {
    sendValidationErrors(res, validation.errors);
    return;
  }

  const lessons = await moveLessonService(
    courseId,
    moduleId,
    lessonId,
    validation.data,
  );

  res.status(200).json({ lessons });
}

export async function deleteLesson(
  req: Request,
  res: Response,
): Promise<void> {
  const courseId = parseId(req.params['courseId']);
  const moduleId = parseId(req.params['moduleId']);
  const lessonId = parseId(req.params['lessonId']);
  const lessons = await deleteLessonService(courseId, moduleId, lessonId);

  res.status(200).json({ lessons });
}

export async function validateLessonContent(
  req: Request,
  res: Response,
): Promise<void> {
  const validation = validateLessonContentRequest(req.body);

  if (!validation.ok) {
    sendValidationErrors(res, validation.errors);
    return;
  }

  const result = await validateLessonContentPayloadService(validation.data);

  res.status(200).json(result);
}

export async function validateStoredLessonContent(
  req: Request,
  res: Response,
): Promise<void> {
  const courseId = parseId(req.params['courseId']);
  const moduleId = parseId(req.params['moduleId']);
  const lessonId = parseId(req.params['lessonId']);
  const result = await validateStoredLessonContentService(
    courseId,
    moduleId,
    lessonId,
  );

  res.status(200).json(result);
}

export async function previewActivityAnswer(
  req: Request,
  res: Response,
): Promise<void> {
  const courseId = parseId(req.params['courseId']);
  const moduleId = parseId(req.params['moduleId']);
  const lessonId = parseId(req.params['lessonId']);
  const activityId = parseActivityId(req.params['activityId']);
  const validation = validateActivityAnswerRequest(req.body);

  if (!validation.ok) {
    sendValidationErrors(res, validation.errors);
    return;
  }

  const result = await previewActivityAnswerService(
    courseId,
    moduleId,
    lessonId,
    activityId,
    validation.data.answer,
  );

  res.status(200).json(result);
}

export async function previewTerminalCommand(
  req: Request,
  res: Response,
): Promise<void> {
  const courseId = parseId(req.params['courseId']);
  const moduleId = parseId(req.params['moduleId']);
  const lessonId = parseId(req.params['lessonId']);
  const activityId = parseActivityId(req.params['activityId']);
  const validation = validateTerminalCommandRequest(req.body);

  if (!validation.ok) {
    sendValidationErrors(res, validation.errors);
    return;
  }

  const result = await previewTerminalCommandService(
    courseId,
    moduleId,
    lessonId,
    activityId,
    validation.data.command,
  );

  res.status(200).json(result);
}

/* -------------------------------------------------------------------------- */
/* Experiencia del estudiante                                                */
/* -------------------------------------------------------------------------- */

export async function getStudentCourse(
  req: Request,
  res: Response,
): Promise<void> {
  const courseId = parseId(req.params['courseId']);
  const course = await getStudentCourseDetailService(
    courseId,
    currentUserId(req),
  );

  res.status(200).json({ course });
}

export async function getStudentLesson(
  req: Request,
  res: Response,
): Promise<void> {
  const courseId = parseId(req.params['courseId']);
  const lessonId = parseId(req.params['lessonId']);
  const result = await getStudentLessonService(
    courseId,
    lessonId,
    currentUserId(req),
  );

  res.status(200).json(result);
}

export async function completeTheoryLesson(
  req: Request,
  res: Response,
): Promise<void> {
  const courseId = parseId(req.params['courseId']);
  const lessonId = parseId(req.params['lessonId']);
  const result = await completeTheoryLessonService(
    courseId,
    lessonId,
    currentUserId(req),
  );

  res.status(200).json(result);
}

export async function checkActivityAnswer(
  req: Request,
  res: Response,
): Promise<void> {
  const courseId = parseId(req.params['courseId']);
  const lessonId = parseId(req.params['lessonId']);
  const activityId = parseActivityId(req.params['activityId']);
  const validation = validateActivityAnswerRequest(req.body);

  if (!validation.ok) {
    sendValidationErrors(res, validation.errors);
    return;
  }

  const result = await checkActivityAnswerService(
    courseId,
    lessonId,
    currentUserId(req),
    activityId,
    validation.data.answer,
  );

  res.status(200).json(result);
}

export async function executeTerminalCommand(
  req: Request,
  res: Response,
): Promise<void> {
  const courseId = parseId(req.params['courseId']);
  const lessonId = parseId(req.params['lessonId']);
  const activityId = parseActivityId(req.params['activityId']);
  const validation = validateTerminalCommandRequest(req.body);

  if (!validation.ok) {
    sendValidationErrors(res, validation.errors);
    return;
  }

  const result = await executeTerminalCommandService(
    courseId,
    lessonId,
    currentUserId(req),
    activityId,
    validation.data.command,
  );

  res.status(200).json(result);
}

export async function finalizeLaboratory(
  req: Request,
  res: Response,
): Promise<void> {
  const courseId = parseId(req.params['courseId']);
  const lessonId = parseId(req.params['lessonId']);
  const validation = validateLabAnswersRequest(req.body);

  if (!validation.ok) {
    sendValidationErrors(res, validation.errors);
    return;
  }

  const result = await finalizeLaboratoryService(
    courseId,
    lessonId,
    currentUserId(req),
    validation.data.answers,
  );

  res.status(200).json(result);
}
