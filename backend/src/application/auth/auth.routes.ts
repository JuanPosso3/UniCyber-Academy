import { Router } from 'express';
import {
  login,
  logout,
  me,
  register,
} from './auth.controller.js';
import {
  requestRecoveryCode,
  resetPassword,
} from './password-recovery.controller.js';
import { requireAuth } from '../../infrastructure/http/auth.middleware.js';

export const authRouter = Router();

authRouter.post('/register', register);
authRouter.post('/login', login);
authRouter.get('/me', requireAuth, me);
authRouter.post('/logout', logout);
authRouter.post('/password-reset/request', requestRecoveryCode);
authRouter.post('/password-reset/reset', resetPassword);
