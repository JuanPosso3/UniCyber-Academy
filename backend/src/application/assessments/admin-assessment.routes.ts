import { Router } from 'express';
import { requireAuth } from '../../infrastructure/http/auth.middleware.js';
import { requireAdmin } from '../../infrastructure/http/admin.middleware.js';
import {
  changeCourseAssessmentStatus,
  createCourseAssessment,
  getAdminCourseAssessment,
  replaceCourseAssessmentQuestions,
  updateCourseAssessmentMetadata,
} from './assessment.controller.js';

/**
 * Administración de la evaluación final de cada curso. Se monta bajo
 * `/api/admin/courses` para conservar la jerarquía existente; el
 * middleware exige la sesión de un administrador.
 */
export const adminAssessmentRouter = Router();

adminAssessmentRouter.use(requireAuth, requireAdmin);

adminAssessmentRouter.get(
  '/:courseId/assessment',
  getAdminCourseAssessment,
);
adminAssessmentRouter.post(
  '/:courseId/assessment',
  createCourseAssessment,
);
adminAssessmentRouter.patch(
  '/:courseId/assessment',
  updateCourseAssessmentMetadata,
);
adminAssessmentRouter.put(
  '/:courseId/assessment/questions',
  replaceCourseAssessmentQuestions,
);
adminAssessmentRouter.patch(
  '/:courseId/assessment/status',
  changeCourseAssessmentStatus,
);
