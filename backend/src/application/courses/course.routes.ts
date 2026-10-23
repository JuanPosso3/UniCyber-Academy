import { Router } from 'express';
import { requireAuth } from '../../infrastructure/http/auth.middleware.js';
import {
  getAvailableCourse,
  listAvailableCourses,
  listAvailableModules,
} from './course.controller.js';

/**
 * Rutas de consulta para estudiantes y usuarios autenticados.
 * La disponibilidad se comprueba siempre en el servidor.
 */
export const courseRouter = Router();

courseRouter.use(requireAuth);
courseRouter.get('/', listAvailableCourses);
courseRouter.get('/:courseId', getAvailableCourse);
courseRouter.get('/:courseId/modules', listAvailableModules);
