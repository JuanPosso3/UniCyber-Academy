import { randomBytes } from 'node:crypto';
import { db } from '../../prisma/db.js';
import { hashPassword, verifyPassword } from '../../infrastructure/security/password.js';
import { AppError } from '../../infrastructure/http/errors.js';
import { Resend } from 'resend';

const RECOVERY_CODE_BYTES = 4; // 8 caracteres hexadecimales
const CODE_TTL_MS = 15 * 60 * 1000; // 15 minutos
const MAX_VERIFICATION_ATTEMPTS = 5;
// Límite de solicitudes por correo para evitar abuso del envío de emails.
const MAX_REQUESTS_PER_WINDOW = 3;
const REQUEST_WINDOW_MS = 15 * 60 * 1000;
// Remitente de pruebas de Resend; en producción debe configurarse un
// dominio verificado mediante RESEND_FROM_EMAIL.
const RESEND_FROM_EMAIL =
  process.env['RESEND_FROM_EMAIL'] ?? 'onboarding@resend.dev';

const RECOVERY_REQUEST_OK =
  'Si la cuenta existe y está activa, se ha enviado un código de recuperación a su correo.';
const RECOVERY_RESET_OK =
  'Si el código es válido y no ha expirado, tu contraseña se ha actualizado.';
const INVALID_OR_EXPIRED_CODE =
  'El código es inválido o ha expirado. Solicita uno nuevo si lo necesitas.';

interface RequestWindow {
  count: number;
  startedAt: number;
}

const requestWindows = new Map<string, RequestWindow>();

let resendClient: Resend | null = null;

function getResendClient(): Resend {
  if (!resendClient) {
    const apiKey = process.env['RESEND_API_KEY'];
    if (!apiKey) {
      throw new AppError(
        500,
        'EMAIL_NOT_CONFIGURED',
        'El servicio de correo no está configurado.',
      );
    }

    resendClient = new Resend(apiKey);
  }

  return resendClient;
}

function generateRecoveryCode(): string {
  return randomBytes(RECOVERY_CODE_BYTES).toString('hex');
}

/**
 * Controla cuántas solicitudes de recuperación acepta un correo dentro de
 * una ventana de tiempo. Al superar el límite se responde igual que en el
 * caso normal (sin enviar correo) para no revelar información de la cuenta.
 */
function isRequestAllowed(email: string): boolean {
  const now = Date.now();
  const current = requestWindows.get(email);

  if (!current || now - current.startedAt > REQUEST_WINDOW_MS) {
    requestWindows.set(email, { count: 1, startedAt: now });

    return true;
  }

  if (current.count >= MAX_REQUESTS_PER_WINDOW) {
    return false;
  }

  current.count += 1;

  return true;
}

/**
 * Solicita un código de recuperación de contraseña.
 *
 * Siempre responde de forma genérica, independientemente de si el
 * correo existe, para evitar la enumeración de cuentas.
 */
export async function requestRecoveryCode(
  email: string,
): Promise<void> {
  const normalizedEmail = email.trim().toLowerCase();

  if (!isRequestAllowed(normalizedEmail)) {
    return;
  }

  const user = await db.orm.public.User
    .where((user) => user.email.eq(normalizedEmail))
    .first();

  if (!user) {
    return;
  }

  const userId = (user as { id: number }).id;

  // Invalida códigos previos sin usar para este usuario y evita reenviar
  // correos mientras haya uno vigente.
  const existing = await db.orm.public.PasswordReset
    .where({
      userId,
    })
    .where((reset) => reset.usedAt.isNull())
    .where((reset) => reset.expiresAt.gt(new Date().toISOString()))
    .first();

  if (existing) {
    return;
  }

  await db.orm.public.PasswordReset
    .where({ userId })
    .where((reset) => reset.usedAt.isNull())
    .deleteAll();

  const code = generateRecoveryCode();
  const codeHash = await hashPassword(code);
  const expiresAt = new Date(Date.now() + CODE_TTL_MS).toISOString();

  const created = await db.orm.public.PasswordReset.create({
    userId,
    codeHash,
    expiresAt,
  });

  try {
    await sendRecoveryEmail(normalizedEmail, code);
  } catch {
    // Si el envío falla se elimina el código para que la persona pueda
    // reintentar y no quede un código vigente que nunca llegó.
    await db.orm.public.PasswordReset
      .where({ id: created.id })
      .deleteAll();

    throw new AppError(
      502,
      'EMAIL_DELIVERY_FAILED',
      'No se pudo enviar el correo de recuperación. Inténtalo de nuevo más tarde.',
    );
  }
}

async function sendRecoveryEmail(email: string, code: string): Promise<void> {
  const resend = getResendClient();
  const { error } = await resend.emails.send({
    from: `UniCyber Academy <${RESEND_FROM_EMAIL}>`,
    to: [email],
    subject: 'Código de recuperación de contraseña — UniCyber Academy',
    text: recoveryEmailText(email, code),
    html: recoveryEmailHtml(email, code),
  });

  if (error) {
    console.error('Resend rechazó el envío del correo de recuperación.');

    throw new Error('EMAIL_DELIVERY_FAILED');
  }
}

function recoveryEmailText(email: string, code: string): string {
  return `Hola,

Has solicitado restablecer la contraseña de tu cuenta de UniCyber Academy.

Tu código de recuperación es: ${code}

Este código expira en 15 minutos y solo se puede usar una vez.

Si no solicitaste este cambio, ignora este mensaje. Tu contraseña no se modificará a menos que ingreses el código en UniCyber Academy.

— Equipo de UniCyber Academy`;
}

function recoveryEmailHtml(email: string, code: string): string {
  return `
    <div style="font-family: system-ui, -apple-system, sans-serif; line-height: 1.6; color: #1e293b; max-width: 560px; margin: 0 auto; padding: 24px;">
      <h2 style="color: #2563eb;">Restablecimiento de contraseña</h2>
      <p>Has solicitado restablecer la contraseña de tu cuenta de UniCyber Academy.</p>
      <p style="font-size: 24px; font-weight: bold; letter-spacing: 4px; text-align: center; background: #f1f5f9; padding: 16px; border-radius: 8px; color: #2563eb;">${code}</p>
      <p>Este código expira en <strong>15 minutos</strong> y solo se puede usar <strong>una vez</strong>.</p>
      <p style="color: #64748b;">Si no solicitaste este cambio, ignora este mensaje. Tu contraseña no se modificará a menos que ingreses el código en UniCyber Academy.</p>
      <hr style="border: none; border-top: 1px solid #e2e8f0; margin: 24px 0;">
      <p style="font-size: 12px; color: #64748b;">— Equipo de UniCyber Academy</p>
    </div>
  `;
}

/**
 * Restablece la contraseña tras validar un código de recuperación.
 *
 * Siempre responde de forma genérica para evitar la enumeración de
 * cuentas: no revela si el correo existe ni si el código era válido.
 */
export async function resetPasswordWithCode(input: {
  email: string;
  code: string;
  newPassword: string;
  confirmPassword: string;
}): Promise<void> {
  const normalizedEmail = input.email.trim().toLowerCase();
  const { code, newPassword, confirmPassword } = input;

  if (newPassword !== confirmPassword) {
    return;
  }

  if (newPassword.length < 8 || newPassword.length > 128) {
    return;
  }

  const user = await db.orm.public.User
    .where((user) => user.email.eq(normalizedEmail))
    .first();

  if (!user) {
    return;
  }

  const userId = (user as { id: number }).id;

  const reset = await db.orm.public.PasswordReset
    .where({ userId })
    .where((reset) => reset.usedAt.isNull())
    .where((reset) => reset.expiresAt.gt(new Date().toISOString()))
    .first();

  if (!reset) {
    return;
  }

  const resetRow = reset as {
    id: number;
    codeHash: string;
    attempts: number;
    usedAt: string | null;
  };

  if (resetRow.attempts >= MAX_VERIFICATION_ATTEMPTS) {
    await db.orm.public.PasswordReset
      .where({ id: resetRow.id })
      .update({ usedAt: new Date().toISOString() });
    return;
  }

  const codeIsValid = await verifyPassword(code, resetRow.codeHash);

  if (!codeIsValid) {
    await db.orm.public.PasswordReset
      .where({ id: resetRow.id })
      .update({ attempts: resetRow.attempts + 1 });
    return;
  }

  const now = new Date().toISOString();

  await db.transaction(async (tx) => {
    await tx.orm.public.PasswordReset
      .where({ id: resetRow.id })
      .update({ usedAt: now });

    await tx.orm.public.User
      .where({ id: userId })
      .update({
        passwordHash: await hashPassword(newPassword),
        passwordChangedAt: now,
      });
  });
}
