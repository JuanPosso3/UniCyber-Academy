import { Router } from 'express';
import { requireAuth } from '../../infrastructure/http/auth.middleware.js';
import { requireAdmin } from '../../infrastructure/http/admin.middleware.js';
import {
  getStatistics,
  listUsers,
  updateUser,
} from './admin.controller.js';

/**
 * Rutas del panel administrativo.
 *
 * `requireAuth` carga el usuario real desde PostgreSQL y `requireAdmin`
 * verifica su rol persistido antes de cualquier acción. Ocultar las
 * opciones en el frontend no sustituye esta autorización.
 */
export const adminRouter = Router();

adminRouter.use(requireAuth, requireAdmin);

adminRouter.get('/statistics', getStatistics);
adminRouter.get('/users', listUsers);
adminRouter.patch('/users/:userId', updateUser);
