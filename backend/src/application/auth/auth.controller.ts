import type { Request, Response } from 'express';
import { signAccessToken } from '../../infrastructure/security/jwt.js';
import {
  clearRateLimit,
  clientIp,
  enforceRateLimit,
} from '../../infrastructure/security/rate-limit.js';
import {
  clearSessionCookie,
  setSessionCookie,
} from '../../infrastructure/http/cookies.js';
import type { AuthenticatedRequest } from '../../infrastructure/http/auth.middleware.js';
import {
  loginUser,
  registerUser,
  toPublicUser,
} from './auth.service.js';
import { validateLogin, validateRegister } from './auth.validation.js';
import type { FieldErrors } from './auth.validation.js';
import { verifyRecaptcha } from '../../infrastructure/security/recaptcha.js';

const LOGIN_WINDOW_MS = 15 * 60 * 1000;
const LOGIN_MAX_ATTEMPTS_PER_EMAIL = 10;
const LOGIN_MAX_ATTEMPTS_PER_EMAIL_IP = 5;
const LOGIN_MAX_ATTEMPTS_PER_IP = 300;

const REGISTER_WINDOW_MS = 60 * 60 * 1000;
const REGISTER_MAX_ATTEMPTS_PER_IP = 20;
const REGISTER_MAX_ATTEMPTS_PER_EMAIL = 5;

function sendValidationErrors(
  res: Response,
  fields: FieldErrors,
): void {
  res.status(400).json({
    error: {
      code: 'VALIDATION_ERROR',
      message: 'Los datos enviados no son válidos.',
      fields,
    },
  });
}

export async function register(
  req: Request,
  res: Response,
): Promise<void> {
  const result = validateRegister(req.body);

  if (!result.ok) {
    sendValidationErrors(res, result.errors);
    return;
  }

  const ip = clientIp(req);
  await enforceRateLimit(
    res,
    `register:ip:${ip}`,
    REGISTER_MAX_ATTEMPTS_PER_IP,
    REGISTER_WINDOW_MS,
  );
  await enforceRateLimit(
    res,
    `register:email:${result.data.email}`,
    REGISTER_MAX_ATTEMPTS_PER_EMAIL,
    REGISTER_WINDOW_MS,
  );

  const user = await registerUser(result.data);
  await clearRateLimit(`register:email:${result.data.email}`);

  res.status(201).json({ user });
}

async function performLogin(
  authenticate: typeof loginUser,
  req: Request,
  res: Response,
): Promise<void> {
  const result = validateLogin(req.body);

  if (!result.ok) {
    sendValidationErrors(res, result.errors);
    return;
  }

  const email = result.data.email;
  const ip = clientIp(req);
  const emailKey = `login:email:${email}`;
  const emailIpKey = `login:email-ip:${email}:${ip}`;

  await enforceRateLimit(
    res,
    emailIpKey,
    LOGIN_MAX_ATTEMPTS_PER_EMAIL_IP,
    LOGIN_WINDOW_MS,
  );
  await enforceRateLimit(
    res,
    emailKey,
    LOGIN_MAX_ATTEMPTS_PER_EMAIL,
    LOGIN_WINDOW_MS,
  );
  await enforceRateLimit(
    res,
    `login:ip:${ip}`,
    LOGIN_MAX_ATTEMPTS_PER_IP,
    LOGIN_WINDOW_MS,
  );

  await verifyRecaptcha(result.data.recaptchaToken);
  const user = await authenticate({ email: result.data.email, password: result.data.password });
  const token = await signAccessToken({
    id: user.id,
    role: user.role,
    passwordChangedAt: user.passwordChangedAt,
  });

  await clearRateLimit(emailKey);
  await clearRateLimit(emailIpKey);
  setSessionCookie(res, token);

  res.status(200).json({ user: toPublicUser(user) });
}

export function createLoginHandler(authenticate: typeof loginUser = loginUser) {
  return (req: Request, res: Response): Promise<void> => performLogin(authenticate, req, res);
}

export const login = createLoginHandler();

export function me(req: Request, res: Response): void {
  const { authUser } = req as AuthenticatedRequest;

  res.status(200).json({ user: toPublicUser(authUser) });
}

export function logout(_req: Request, res: Response): void {
  clearSessionCookie(res);
  res.status(204).end();
}
