import type { Request, Response } from 'express';
import { AppError } from '../http/errors.js';

/**
 * Limitador de intentos para endpoints sensibles.
 *
 * Modos:
 * - `memory` (predeterminado): Map acotado por proceso. Es una defensa
 *   local; no coordina instancias ni sobrevive reinicios.
 * - `postgres`: contador atómico en la base de datos compartida. Requiere
 *   crear la tabla con `pnpm --filter backend rate-limit:init` y activar
 *   `RATE_LIMIT_STORE=postgres`. Si el almacén no está disponible, las
 *   solicitudes se rechazan (fail closed) en lugar de omitir el límite.
 *
 * La topología de Render no está verificada. Activar el modo compartido y
 * verificar la cadena de proxies son acciones de despliegue que requieren
 * autorización del responsable.
 */

interface RateLimitBucket {
  count: number;
  resetAt: number;
}

export interface RateLimitResult {
  allowed: boolean;
  retryAfterSeconds: number;
}

type RateLimitStore = 'memory' | 'postgres';

const buckets = new Map<string, RateLimitBucket>();
const MAX_BUCKETS = 20_000;
const CLEANUP_INTERVAL = 500;
const POSTGRES_CLEANUP_INTERVAL = 1_000;
let operationsSinceCleanup = 0;
let postgresOperationsSinceCleanup = 0;

function selectedStore(): RateLimitStore {
  const value = (process.env['RATE_LIMIT_STORE'] ?? 'memory')
    .trim()
    .toLowerCase();

  if (value !== 'memory' && value !== 'postgres') {
    throw new Error(
      'RATE_LIMIT_STORE debe ser "memory" o "postgres".',
    );
  }

  return value;
}

function removeExpiredBuckets(now: number): void {
  for (const [key, bucket] of buckets) {
    if (bucket.resetAt <= now) {
      buckets.delete(key);
    }
  }

  if (buckets.size <= MAX_BUCKETS) {
    return;
  }

  const excess = buckets.size - MAX_BUCKETS;
  let removed = 0;

  for (const key of buckets.keys()) {
    buckets.delete(key);
    removed += 1;

    if (removed >= excess) {
      break;
    }
  }
}

function maybeCleanup(now: number): void {
  operationsSinceCleanup += 1;

  if (
    operationsSinceCleanup % CLEANUP_INTERVAL === 0 ||
    buckets.size > MAX_BUCKETS
  ) {
    removeExpiredBuckets(now);
  }
}

function consumeFromMemory(
  key: string,
  limit: number,
  windowMs: number,
  now: number,
): RateLimitResult {
  maybeCleanup(now);

  const current = buckets.get(key);

  if (!current || current.resetAt <= now) {
    buckets.set(key, { count: 1, resetAt: now + windowMs });

    return { allowed: true, retryAfterSeconds: 0 };
  }

  if (current.count >= limit) {
    return {
      allowed: false,
      retryAfterSeconds: Math.max(
        1,
        Math.ceil((current.resetAt - now) / 1000),
      ),
    };
  }

  current.count += 1;

  return { allowed: true, retryAfterSeconds: 0 };
}

async function loadDb(): Promise<typeof import('../../prisma/db.js').db> {
  const { db } = await import('../../prisma/db.js');

  return db;
}

async function cleanupPostgres(now: number): Promise<void> {
  postgresOperationsSinceCleanup += 1;

  if (postgresOperationsSinceCleanup % POSTGRES_CLEANUP_INTERVAL !== 0) {
    return;
  }

  try {
    const db = await loadDb();
    const plan = db.raw.sql`
      DELETE FROM unicyber_rate_limit
      WHERE reset_at < ${new Date(now).toISOString()}::timestamptz
    `
      .affectedCount()
      .build();

    await db.runtime().execute(plan);
  } catch {
    // La limpieza es oportunista; un fallo no debe habilitar intentos.
    console.error(
      'No se pudieron limpiar los límites de intentos caducados.',
    );
  }
}

async function consumeFromPostgres(
  key: string,
  limit: number,
  windowMs: number,
  now: number,
): Promise<RateLimitResult> {
  const nowIso = new Date(now).toISOString();
  const windowEndIso = new Date(now + windowMs).toISOString();

  try {
    const db = await loadDb();
    // Una sola sentencia atómica: dos instancias que compiten por la misma
    // clave observan incrementos consistentes. `LEAST` evita que el
    // contador crezca sin límite mientras el bloqueo está activo.
    const plan = db.raw.sql`
      INSERT INTO unicyber_rate_limit (bucket_key, hit_count, reset_at)
      VALUES (${key}, 1, ${windowEndIso}::timestamptz)
      ON CONFLICT (bucket_key) DO UPDATE SET
        hit_count = CASE
          WHEN unicyber_rate_limit.reset_at <= ${nowIso}::timestamptz
            THEN 1
          ELSE LEAST(unicyber_rate_limit.hit_count + 1, ${limit + 1})
        END,
        reset_at = CASE
          WHEN unicyber_rate_limit.reset_at <= ${nowIso}::timestamptz
            THEN EXCLUDED.reset_at
          ELSE unicyber_rate_limit.reset_at
        END
      RETURNING
        hit_count,
        (EXTRACT(EPOCH FROM reset_at))::int4 AS reset_at_seconds
    `
      .returnsRow({
        hit_count: 'pg/int4@1',
        reset_at_seconds: 'pg/int4@1',
      })
      .build();

    const rows = (await db.runtime().query(plan)) as Array<{
      hit_count: number;
      reset_at_seconds: number;
    }>;
    const row = rows[0];

    if (!row) {
      throw new Error('El limitador compartido no devolvió resultado.');
    }

    void cleanupPostgres(now);

    if (row.hit_count <= limit) {
      return { allowed: true, retryAfterSeconds: 0 };
    }

    return {
      allowed: false,
      retryAfterSeconds: Math.max(
        1,
        row.reset_at_seconds - Math.floor(now / 1000),
      ),
    };
  } catch (error) {
    if (error instanceof AppError) {
      throw error;
    }

    // Fail closed: no se concede el intento si no se puede contabilizar.
    // El mensaje no incluye la clave ni datos personales.
    console.error(
      'El almacén compartido de límites de intentos no está disponible.',
    );

    throw new AppError(
      503,
      'RATE_LIMIT_UNAVAILABLE',
      'El servicio no está disponible temporalmente. Inténtalo nuevamente más tarde.',
    );
  }
}

export async function consumeRateLimit(
  key: string,
  limit: number,
  windowMs: number,
  now: number = Date.now(),
): Promise<RateLimitResult> {
  if (selectedStore() === 'postgres') {
    return consumeFromPostgres(key, limit, windowMs, now);
  }

  return consumeFromMemory(key, limit, windowMs, now);
}

export async function enforceRateLimit(
  res: Response,
  key: string,
  limit: number,
  windowMs: number,
): Promise<void> {
  const result = await consumeRateLimit(key, limit, windowMs);

  if (!result.allowed) {
    res.setHeader('Retry-After', String(result.retryAfterSeconds));

    throw new AppError(
      429,
      'TOO_MANY_REQUESTS',
      'Has realizado demasiados intentos. Inténtalo nuevamente más tarde.',
    );
  }
}

export async function clearRateLimit(key: string): Promise<void> {
  if (selectedStore() === 'memory') {
    buckets.delete(key);
    return;
  }

  try {
    const db = await loadDb();
    const plan = db.raw.sql`
      DELETE FROM unicyber_rate_limit WHERE bucket_key = ${key}
    `
      .affectedCount()
      .build();

    await db.runtime().execute(plan);
  } catch {
    // Un login correcto no debe fallar porque no se pudo limpiar el
    // contador; el límite caducará por su ventana.
    console.error('No se pudo limpiar el límite compartido de intentos.');
  }
}

export function clientIp(req: Request): string {
  return req.ip || req.socket.remoteAddress || 'unknown';
}

/**
 * Crea la tabla del limitador compartido. Es una operación explícita y
 * separada del contrato Prisma; no se ejecuta automáticamente al arrancar.
 */
export async function initializeRateLimitTable(): Promise<void> {
  const db = await loadDb();

  await db.runtime().execute(
    db.raw.sql`
      CREATE TABLE IF NOT EXISTS unicyber_rate_limit (
        bucket_key text PRIMARY KEY,
        hit_count integer NOT NULL,
        reset_at timestamptz NOT NULL
      )
    `
      .affectedCount()
      .build(),
  );

  await db.runtime().execute(
    db.raw.sql`
      CREATE INDEX IF NOT EXISTS unicyber_rate_limit_reset_at_idx
      ON unicyber_rate_limit (reset_at)
    `
      .affectedCount()
      .build(),
  );
}

/** Solo para pruebas automatizadas: limpia únicamente el estado local. */
export function resetMemoryRateLimitsForTests(): void {
  buckets.clear();
  operationsSinceCleanup = 0;
  postgresOperationsSinceCleanup = 0;
}

/** Solo para pruebas automatizadas. */
export async function resetRateLimitsForTests(): Promise<void> {
  resetMemoryRateLimitsForTests();

  if (selectedStore() !== 'postgres') {
    return;
  }

  try {
    const db = await loadDb();
    await db.runtime().execute(
      db.raw.sql`DELETE FROM unicyber_rate_limit`.affectedCount().build(),
    );
  } catch {
    // La prueba debe fallar en su aserción si el almacén no está operativo.
  }
}
