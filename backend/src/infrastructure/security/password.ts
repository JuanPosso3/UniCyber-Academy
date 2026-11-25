import { randomBytes, scrypt, timingSafeEqual } from 'node:crypto';

/**
 * Hash de contraseñas con scrypt (incluido en Node.js, sin dependencias
 * nativas). El formato almacenado es autocontenido:
 *
 *   scrypt$N$r$p$<saltBase64>$<hashBase64>
 *
 * Así se puede verificar una contraseña sin columnas adicionales y sin
 * guardar nunca el texto plano.
 *
 * Los parámetros nuevos usan N=65536 (64 MiB por derivación), un valor
 * superior al histórico N=16384. Los hashes anteriores siguen siendo
 * válidos y se actualizan de forma transparente tras un inicio de sesión
 * correcto.
 */

const SCRYPT_N = 65536;
const SCRYPT_R = 8;
const SCRYPT_P = 1;
const KEY_LENGTH = 64;
const SALT_LENGTH = 16;
const MAX_MEMORY = 256 * 1024 * 1024;
const MAX_SCRYPT_N = 1 << 18;
const MAX_SCRYPT_R = 32;
const MAX_SCRYPT_P = 16;

interface ScryptParameters {
  N: number;
  r: number;
  p: number;
}

function isValidScryptParameters(parameters: ScryptParameters): boolean {
  const { N, r, p } = parameters;

  return (
    Number.isInteger(N) &&
    Number.isInteger(r) &&
    Number.isInteger(p) &&
    N > 1 &&
    N <= MAX_SCRYPT_N &&
    (N & (N - 1)) === 0 &&
    r > 0 &&
    r <= MAX_SCRYPT_R &&
    p > 0 &&
    p <= MAX_SCRYPT_P
  );
}

function deriveKey(
  password: string,
  salt: Buffer,
  keyLength: number,
  parameters: ScryptParameters,
): Promise<Buffer> {
  return new Promise((resolve, reject) => {
    scrypt(
      password,
      salt,
      keyLength,
      { ...parameters, maxmem: MAX_MEMORY },
      (error, derivedKey) => {
        if (error) {
          reject(error);
          return;
        }

        resolve(derivedKey);
      },
    );
  });
}

export async function hashPassword(password: string): Promise<string> {
  const salt = randomBytes(SALT_LENGTH);
  const derivedKey = await deriveKey(password, salt, KEY_LENGTH, {
    N: SCRYPT_N,
    r: SCRYPT_R,
    p: SCRYPT_P,
  });

  return [
    'scrypt',
    SCRYPT_N,
    SCRYPT_R,
    SCRYPT_P,
    salt.toString('base64'),
    derivedKey.toString('base64'),
  ].join('$');
}

/**
 * Indica si un hash almacenado usa parámetros anteriores a los actuales.
 * Solo se llama después de verificar correctamente la contraseña.
 */
export function passwordHashNeedsRehash(storedHash: string): boolean {
  const parts = storedHash.split('$');

  if (parts.length !== 6 || parts[0] !== 'scrypt') {
    return true;
  }

  const N = Number(parts[1]);
  const r = Number(parts[2]);
  const p = Number(parts[3]);

  if (!isValidScryptParameters({ N, r, p })) {
    return true;
  }

  return N !== SCRYPT_N || r !== SCRYPT_R || p !== SCRYPT_P;
}

export async function verifyPassword(
  password: string,
  storedHash: string,
): Promise<boolean> {
  const parts = storedHash.split('$');

  if (parts.length !== 6 || parts[0] !== 'scrypt') {
    return false;
  }

  const [, nRaw, rRaw, pRaw, saltRaw, hashRaw] = parts;
  const N = Number(nRaw);
  const r = Number(rRaw);
  const p = Number(pRaw);

  if (!isValidScryptParameters({ N, r, p })) {
    return false;
  }

  const salt = Buffer.from(saltRaw, 'base64');
  const expected = Buffer.from(hashRaw, 'base64');

  if (
    salt.length < 8 ||
    salt.length > 64 ||
    expected.length !== KEY_LENGTH
  ) {
    return false;
  }

  try {
    const derivedKey = await deriveKey(password, salt, expected.length, {
      N,
      r,
      p,
    });

    return (
      derivedKey.length === expected.length &&
      timingSafeEqual(derivedKey, expected)
    );
  } catch {
    return false;
  }
}

let dummyHashPromise: Promise<string> | null = null;

/**
 * Hash de relleno para que un login con correo inexistente tarde un
 * tiempo similar a uno con correo existente y contraseña incorrecta.
 */
export function getDummyPasswordHash(): Promise<string> {
  dummyHashPromise ??= hashPassword('unicyber-dummy-password-not-used');

  return dummyHashPromise;
}
