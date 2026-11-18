import { Router } from 'express';
import { requireAuth } from '../../infrastructure/http/auth.middleware.js';
import {
  changePassword,
  getMyProfile,
  updateUsername,
} from './user.controller.js';

/**
 * Perfil y gestión de la cuenta del usuario autenticado.
 *
 * Todas las rutas operan sobre la cuenta de quien inicia la petición
 * (identificada por la sesión), nunca sobre un identificador de usuario
 * enviado por el cliente.
 */
export const userRouter = Router();

userRouter.use(requireAuth);

userRouter.get('/me', getMyProfile);
userRouter.patch('/me/username', updateUsername);
userRouter.patch('/me/password', changePassword);
