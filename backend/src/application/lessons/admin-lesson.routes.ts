import { Router } from 'express';
import { requireAuth } from '../../infrastructure/http/auth.middleware.js';
import { requireAdmin } from '../../infrastructure/http/admin.middleware.js';
import {
  changeLessonStatus,
  createLesson,
  deleteLesson,
  getAdminLesson,
  listAdminLessons,
  moveLesson,
  previewActivityAnswer,
  previewTerminalCommand,
  updateLesson,
  validateLessonContent,
  validateStoredLessonContent,
} from './lesson.controller.js';

/**
 * Administración de lecciones. Se monta bajo `/api/admin/courses` para
 * conservar la jerarquía curso → módulo → lección existente.
 */
export const adminLessonRouter = Router();

adminLessonRouter.use(requireAuth, requireAdmin);

adminLessonRouter.get(
  '/:courseId/modules/:moduleId/lessons',
  listAdminLessons,
);
adminLessonRouter.post(
  '/:courseId/modules/:moduleId/lessons',
  createLesson,
);
adminLessonRouter.post(
  '/:courseId/modules/:moduleId/lessons/validate',
  validateLessonContent,
);
adminLessonRouter.get(
  '/:courseId/modules/:moduleId/lessons/:lessonId',
  getAdminLesson,
);
adminLessonRouter.patch(
  '/:courseId/modules/:moduleId/lessons/:lessonId',
  updateLesson,
);
adminLessonRouter.patch(
  '/:courseId/modules/:moduleId/lessons/:lessonId/status',
  changeLessonStatus,
);
adminLessonRouter.patch(
  '/:courseId/modules/:moduleId/lessons/:lessonId/order',
  moveLesson,
);
adminLessonRouter.delete(
  '/:courseId/modules/:moduleId/lessons/:lessonId',
  deleteLesson,
);
adminLessonRouter.post(
  '/:courseId/modules/:moduleId/lessons/:lessonId/validate',
  validateStoredLessonContent,
);
adminLessonRouter.post(
  '/:courseId/modules/:moduleId/lessons/:lessonId/preview/activities/:activityId/check',
  previewActivityAnswer,
);
adminLessonRouter.post(
  '/:courseId/modules/:moduleId/lessons/:lessonId/preview/activities/:activityId/terminal',
  previewTerminalCommand,
);
