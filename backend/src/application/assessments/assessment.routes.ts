import { Router } from 'express';
import { requireAuth } from '../../infrastructure/http/auth.middleware.js';
import {
  getAssessmentResults,
  getStudentAssessment,
  submitAssessment,
} from './assessment.controller.js';

/**
 * Evaluación final para estudiantes. La elegibilidad (curso activo,
 * lecciones completas y evaluación publicada) se comprueba siempre en
 * el servidor.
 */
export const assessmentRouter = Router();

assessmentRouter.use(requireAuth);

assessmentRouter.get(
  '/:courseId/assessment',
  getStudentAssessment,
);
assessmentRouter.post(
  '/:courseId/assessment/submit',
  submitAssessment,
);
assessmentRouter.get(
  '/:courseId/assessment/results',
  getAssessmentResults,
);
