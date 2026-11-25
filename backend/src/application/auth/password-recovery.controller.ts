import type { Request, Response } from 'express';
import {
  enforceRateLimit,
  clientIp,
} from '../../infrastructure/security/rate-limit.js';
import {
  requestRecoveryCode as sendRecoveryCode,
  resetPasswordWithCode as performPasswordReset,
} from './password-recovery.service.js';

const RECOVERY_REQUEST_WINDOW_MS = 15 * 60 * 1000;
const RECOVERY_REQUEST_MAX_PER_IP = 100;
const RECOVERY_RESET_MAX_PER_EMAIL = 20;
const RECOVERY_RESET_MAX_PER_IP = 100;

function asRecord(value: unknown): Record<string, unknown> {
  return typeof value === 'object' && value !== null
    ? (value as Record<string, unknown>)
    : {};
}

function readString(
  body: Record<string, unknown>,
  key: string,
): string {
  const value = body[key];

  return typeof value === 'string' ? value : '';
}

function validateRequestRecoveryCode(
  body: unknown,
): { ok: true; data: { email: string } } | { ok: false; errors: Record<string, string> } {
  const raw = asRecord(body);
  const email = readString(raw, 'email').trim().toLowerCase();
  const errors: Record<string, string> = {};

  if (!email) {
    errors['email'] = 'Este campo es obligatorio.';
  } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    errors['email'] = 'El correo electrónico no es válido.';
  }

  if (Object.keys(errors).length > 0) {
    return { ok: false, errors };
  }

  return { ok: true, data: { email } };
}

function validateResetPassword(
  body: unknown,
): {
  ok: true;
  data: { email: string; code: string; newPassword: string; confirmPassword: string };
} | { ok: false; errors: Record<string, string> } {
  const raw = asRecord(body);
  const email = readString(raw, 'email').trim().toLowerCase();
  const code = readString(raw, 'code');
  const newPassword = readString(raw, 'newPassword');
  const confirmPassword = readString(raw, 'confirmPassword');
  const errors: Record<string, string> = {};

  if (!email) {
    errors['email'] = 'Este campo es obligatorio.';
  } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    errors['email'] = 'El correo electrónico no es válido.';
  }

  if (!code) {
    errors['code'] = 'Este campo es obligatorio.';
  }

  if (!newPassword) {
    errors['newPassword'] = 'Este campo es obligatorio.';
  } else if (newPassword.length < 8 || newPassword.length > 128) {
    errors['newPassword'] =
      'La contraseña debe tener entre 8 y 128 caracteres.';
  }

  if (newPassword !== confirmPassword) {
    errors['confirmPassword'] = 'Las contraseñas no coinciden.';
  }

  if (Object.keys(errors).length > 0) {
    return { ok: false, errors };
  }

  return {
    ok: true,
    data: { email, code, newPassword, confirmPassword },
  };
}

/**
 * Solicita un código de recuperación de contraseña.
 *
 * Siempre responde de forma genérica, independientemente de si el correo
 * existe, para evitar la enumeración de cuentas.
 */
export async function requestRecoveryCode(
  req: Request,
  res: Response,
): Promise<void> {
  const result = validateRequestRecoveryCode(req.body);

  if (!result.ok) {
    res.status(400).json({
      error: {
        code: 'VALIDATION_ERROR',
        message: 'Los datos enviados no son válidos.',
        fields: result.errors,
      },
    });

    return;
  }

  await enforceRateLimit(
    res,
    `password-reset-request:ip:${clientIp(req)}`,
    RECOVERY_REQUEST_MAX_PER_IP,
    RECOVERY_REQUEST_WINDOW_MS,
  );

  // El trabajo real se ejecuta en segundo plano: la respuesta es idéntica
  // y no espera al proveedor de correo. Cualquier fallo se registra sin
  // datos personales y sin informar al cliente.
  void sendRecoveryCode(result.data.email).catch(() => {
    console.error(
      'No se pudo completar la solicitud de recuperación de contraseña.',
    );
  });

  res.status(200).json({
    message: 'Si la cuenta existe y está activa, se ha enviado un código de recuperación a su correo.',
  });
}

/**
 * Restablece la contraseña tras validar un código de recuperación.
 *
 * Siempre responde de forma genérica para evitar la enumeración de
 * cuentas.
 */
export async function resetPassword(
  req: Request,
  res: Response,
): Promise<void> {
  const result = validateResetPassword(req.body);

  if (!result.ok) {
    res.status(400).json({
      error: {
        code: 'VALIDATION_ERROR',
        message: 'Los datos enviados no son válidos.',
        fields: result.errors,
      },
    });

    return;
  }

  const email = result.data.email;
  const ip = clientIp(req);

  await enforceRateLimit(
    res,
    `password-reset-confirm:email:${email}`,
    RECOVERY_RESET_MAX_PER_EMAIL,
    RECOVERY_REQUEST_WINDOW_MS,
  );
  await enforceRateLimit(
    res,
    `password-reset-confirm:ip:${ip}`,
    RECOVERY_RESET_MAX_PER_IP,
    RECOVERY_REQUEST_WINDOW_MS,
  );

  await performPasswordReset(result.data);

  res.status(200).json({
    message: 'Si el código es válido y no ha expirado, tu contraseña se ha actualizado.',
  });
}
