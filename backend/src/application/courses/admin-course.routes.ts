import { Router } from 'express';
import { requireAuth } from '../../infrastructure/http/auth.middleware.js';
import { requireAdmin } from '../../infrastructure/http/admin.middleware.js';
import {
  changeCourseStatus,
  changeModuleStatus,
  createCourse,
  createModule,
  getAdminCourse,
  getAdminModule,
  listAdminCourses,
  listAdminModules,
  moveModule,
  updateCourse,
  updateModule,
} from './course.controller.js';

/**
 * Rutas administrativas de cursos y módulos.
 *
 * `requireAuth` carga el usuario real desde PostgreSQL y
 * `requireAdmin` verifica su rol persistido antes de cualquier acción.
 */
export const adminCourseRouter = Router();

adminCourseRouter.use(requireAuth, requireAdmin);

adminCourseRouter.get('/', listAdminCourses);
adminCourseRouter.post('/', createCourse);
adminCourseRouter.get('/:courseId', getAdminCourse);
adminCourseRouter.patch('/:courseId', updateCourse);
adminCourseRouter.patch('/:courseId/status', changeCourseStatus);
adminCourseRouter.get('/:courseId/modules', listAdminModules);
adminCourseRouter.post('/:courseId/modules', createModule);
adminCourseRouter.get('/:courseId/modules/:moduleId', getAdminModule);
adminCourseRouter.patch('/:courseId/modules/:moduleId', updateModule);
adminCourseRouter.patch(
  '/:courseId/modules/:moduleId/status',
  changeModuleStatus,
);
adminCourseRouter.patch(
  '/:courseId/modules/:moduleId/order',
  moveModule,
);
