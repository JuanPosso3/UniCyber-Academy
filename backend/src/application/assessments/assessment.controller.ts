import type { Request, Response } from 'express';
import { AppError } from '../../infrastructure/http/errors.js';
import type { AuthenticatedRequest } from '../../infrastructure/http/auth.middleware.js';
import {
  changeCourseFinalAssessmentStatus as changeAssessmentStatusService,
  createCourseFinalAssessment as createAssessmentService,
  getAdminCourseFinalAssessment as getAdminAssessmentService,
  getStudentAssessmentResults as getResultsService,
  getStudentFinalAssessment as getStudentAssessmentService,
  replaceCourseFinalAssessmentQuestions as replaceQuestionsService,
  submitFinalAssessment as submitAssessmentService,
  updateCourseFinalAssessmentMetadata as updateAssessmentMetadataService,
} from './assessment.service.js';
import {
  validateAssessmentStatus,
  validateCreateAssessment,
  validateReplaceQuestions,
  validateSubmitAnswers,
  validateUpdateAssessment,
  type FieldErrors,
} from './assessment.validation.js';

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

function sendValidationErrors(res: Response, fields: FieldErrors): void {
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
/* Administración de la evaluación final                                      */
/* -------------------------------------------------------------------------- */

export async function getAdminCourseAssessment(
  req: Request,
  res: Response,
): Promise<void> {
  const courseId = parseId(req.params['courseId']);
  const payload = await getAdminAssessmentService(courseId);

  res.json(payload);
}

export async function createCourseAssessment(
  req: Request,
  res: Response,
): Promise<void> {
  const courseId = parseId(req.params['courseId']);
  const result = validateCreateAssessment(req.body);

  if (!result.ok) {
    sendValidationErrors(res, result.errors);

    return;
  }

  const payload = await createAssessmentService(courseId, result.data);

  res.status(201).json(payload);
}

export async function updateCourseAssessmentMetadata(
  req: Request,
  res: Response,
): Promise<void> {
  const courseId = parseId(req.params['courseId']);
  const result = validateUpdateAssessment(req.body);

  if (!result.ok) {
    sendValidationErrors(res, result.errors);

    return;
  }

  const payload = await updateAssessmentMetadataService(
    courseId,
    result.data,
  );

  res.json(payload);
}

export async function replaceCourseAssessmentQuestions(
  req: Request,
  res: Response,
): Promise<void> {
  const courseId = parseId(req.params['courseId']);
  const result = validateReplaceQuestions(req.body);

  if (!result.ok) {
    sendValidationErrors(res, result.errors);

    return;
  }

  const payload = await replaceQuestionsService(
    courseId,
    result.data.questions,
  );

  res.json(payload);
}

export async function changeCourseAssessmentStatus(
  req: Request,
  res: Response,
): Promise<void> {
  const courseId = parseId(req.params['courseId']);
  const result = validateAssessmentStatus(req.body);

  if (!result.ok) {
    sendValidationErrors(res, result.errors);

    return;
  }

  const payload = await changeAssessmentStatusService(
    courseId,
    result.data.status,
  );

  res.json(payload);
}

/* -------------------------------------------------------------------------- */
/* Examen del estudiante                                                      */
/* -------------------------------------------------------------------------- */

export async function getStudentAssessment(
  req: Request,
  res: Response,
): Promise<void> {
  const courseId = parseId(req.params['courseId']);
  const payload = await getStudentAssessmentService(
    courseId,
    currentUserId(req),
  );

  res.json(payload);
}

export async function submitAssessment(
  req: Request,
  res: Response,
): Promise<void> {
  const courseId = parseId(req.params['courseId']);
  const result = validateSubmitAnswers(req.body);

  if (!result.ok) {
    sendValidationErrors(res, result.errors);

    return;
  }

  const payload = await submitAssessmentService(
    courseId,
    currentUserId(req),
    result.data.answers,
  );

  res.json(payload);
}

export async function getAssessmentResults(
  req: Request,
  res: Response,
): Promise<void> {
  const courseId = parseId(req.params['courseId']);
  const payload = await getResultsService(courseId, currentUserId(req));

  res.json(payload);
}
