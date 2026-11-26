import { randomBytes } from 'node:crypto';
import { db } from '../../prisma/db.js';
import {
  getDummyPasswordHash,
  hashPassword,
  verifyPassword,
} from '../../infrastructure/security/password.js';
import { consumeRateLimit } from '../../infrastructure/security/rate-limit.js';
import { sendRecoveryEmail } from '../../infrastructure/email/google-apps-script.js';

const RECOVERY_CODE_BYTES = 4; // 8 caracteres hexadecimales
const CODE_TTL_MS = 15 * 60 * 1000; // 15 minutos
const MAX_VERIFICATION_ATTEMPTS = 5;
// Límite de solicitudes por correo para evitar abuso del envío de emails.
const MAX_REQUESTS_PER_WINDOW = 3;
const REQUEST_WINDOW_MS = 15 * 60 * 1000;

function generateRecoveryCode(): string {
  return randomBytes(RECOVERY_CODE_BYTES).toString('hex');
}

/**
 * Consume tiempo de verificación aunque la cuenta o el código no existan.
 * Reduce diferencias de temporización; no garantiza tiempo constante.
 */
async function performDummyVerification(code: string): Promise<void> {
  await verifyPassword(code, await getDummyPasswordHash());
}

/**
 * Solicita un código de recuperación de contraseña.
 *
 * No devuelve información sobre la existencia de la cuenta. El envío se
 * ejecuta en segundo plano desde el controlador para que el tiempo de
 * respuesta sea similar en todos los casos.
 */
export async function requestRecoveryCode(
  email: string,
): Promise<void> {
  const normalizedEmail = email.trim().toLowerCase();
  const limit = await consumeRateLimit(
    `password-reset-request:email:${normalizedEmail}`,
    MAX_REQUESTS_PER_WINDOW,
    REQUEST_WINDOW_MS,
  );

  if (!limit.allowed) {
    return;
  }

  const user = await db.orm.public.User
    .where((candidate) => candidate.email.eq(normalizedEmail))
    .first();

  if (!user || user.status !== 'ACTIVE') {
    return;
  }

  const userId = user.id;

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

  const code = generateRecoveryCode();
  const codeHash = await hashPassword(code);
  const created = await db.transaction(async (tx) => {
    // Serializa únicamente la emisión por cuenta. No se mantiene el bloqueo
    // durante el envío HTTP. Evita que una solicitud concurrente elimine o
    // sustituya un código vigente entre la consulta anterior y la creación.
    const lock = db.raw.sql`SELECT id FROM public."user" WHERE id = ${userId} FOR UPDATE`
      .returnsRow({ id: 'pg/int4@1' }).build();
    await tx.query(lock);
    const currentUser = await tx.orm.public.User.first({ id: userId });
    if (!currentUser || currentUser.status !== 'ACTIVE') return null;
    const now = new Date().toISOString();
    const active = await tx.orm.public.PasswordReset
      .where({ userId })
      .where((reset) => reset.usedAt.isNull())
      .where((reset) => reset.expiresAt.gt(now))
      .first();
    if (active) return null;
    await tx.orm.public.PasswordReset
      .where({ userId })
      .where((reset) => reset.usedAt.isNull())
      .where((reset) => reset.expiresAt.lte(now))
      .deleteAll();
    return tx.orm.public.PasswordReset.create({
      userId,
      codeHash,
      expiresAt: new Date(Date.now() + CODE_TTL_MS).toISOString(),
    });
  });
  if (!created) return;

  try {
    await sendRecoveryEmail(normalizedEmail, code);
  } catch {
    // Si el envío falla se elimina el código para que la persona pueda
    // reintentar y no quede un código vigente que nunca llegó. No se
    // propaga el error al cliente para no revelar la existencia de la
    // cuenta ni el estado del proveedor de correo.
    await db.orm.public.PasswordReset
      .where({ id: created.id })
      .deleteAll();

    console.error(
      'No se pudo enviar el correo de recuperación de contraseña.',
    );
  }
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
    .where((candidate) => candidate.email.eq(normalizedEmail))
    .first();

  if (!user || user.status !== 'ACTIVE') {
    await performDummyVerification(code);
    return;
  }

  const userId = user.id;

  const reset = await db.orm.public.PasswordReset
    .where({ userId })
    .where((reset) => reset.usedAt.isNull())
    .where((reset) => reset.expiresAt.gt(new Date().toISOString()))
    .first();

  if (!reset) {
    await performDummyVerification(code);
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
      .where((row) => row.usedAt.isNull())
      .update({ usedAt: new Date().toISOString() });
    await performDummyVerification(code);
    return;
  }

  // Reserva un intento ANTES de verificar. Una petición que pierde la
  // comparación atómica no obtiene una verificación gratuita del código.
  const reserved = await db.orm.public.PasswordReset
    .where({ id: resetRow.id })
    .where((row) => row.usedAt.isNull())
    .where((row) => row.expiresAt.gt(new Date().toISOString()))
    .where((row) => row.attempts.eq(resetRow.attempts))
    .update({ attempts: resetRow.attempts + 1 });

  if (!reserved) {
    await performDummyVerification(code);
    return;
  }

  const codeIsValid = await verifyPassword(code, resetRow.codeHash);

  if (!codeIsValid) {
    return;
  }

  const now = new Date().toISOString();
  const passwordHash = await hashPassword(newPassword);

  // Consume el código y actualiza la contraseña en una sola transacción.
  // La condición evita que dos peticiones concurrentes usen el mismo
  // código más de una vez.
  await db.transaction(async (tx) => {
    const claimed = await tx.orm.public.PasswordReset
      .where({ id: resetRow.id })
      .where((row) => row.usedAt.isNull())
      .where((row) => row.expiresAt.gt(new Date().toISOString()))
      .update({ usedAt: now });

    if (!claimed) {
      return;
    }

    await tx.orm.public.User
      .where({ id: userId })
      .update({
        passwordHash,
        passwordChangedAt: now,
      });
  });
}
