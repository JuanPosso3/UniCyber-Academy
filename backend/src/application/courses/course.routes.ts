import { Router } from 'express';
import { requireAuth } from '../../infrastructure/http/auth.middleware.js';
import {
  listAvailableCourses,
  listAvailableModules,
} from './course.controller.js';
import {
  checkActivityAnswer,
  completeTheoryLesson,
  executeTerminalCommand,
  finalizeLaboratory,
  getStudentCourse,
  getStudentLesson,
} from '../lessons/lesson.controller.js';

/**
 * Rutas de consulta y aprendizaje para estudiantes y usuarios
 * autenticados. La disponibilidad y el desbloqueo se comprueban siempre
 * en el servidor.
 */
export const courseRouter = Router();

courseRouter.use(requireAuth);
courseRouter.get('/', listAvailableCourses);
courseRouter.get('/:courseId', getStudentCourse);
courseRouter.get('/:courseId/modules', listAvailableModules);
courseRouter.get('/:courseId/lessons/:lessonId', getStudentLesson);
courseRouter.post(
  '/:courseId/lessons/:lessonId/complete',
  completeTheoryLesson,
);
courseRouter.post(
  '/:courseId/lessons/:lessonId/activities/:activityId/check',
  checkActivityAnswer,
);
courseRouter.post(
  '/:courseId/lessons/:lessonId/activities/:activityId/terminal',
  executeTerminalCommand,
);
courseRouter.post(
  '/:courseId/lessons/:lessonId/finalize',
  finalizeLaboratory,
);
