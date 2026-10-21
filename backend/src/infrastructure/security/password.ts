import { randomBytes, scrypt, timingSafeEqual } from 'node:crypto';

/**
 * Hash de contraseñas con scrypt (incluido en Node.js, sin dependencias
 * nativas). El formato almacenado es autocontenido:
 *
 *   scrypt$N$r$p$<saltBase64>$<hashBase64>
 *
 * Así se puede verificar una contraseña sin columnas adicionales y sin
 * guardar nunca el texto plano.
 */

const SCRYPT_N = 16384;
const SCRYPT_R = 8;
const SCRYPT_P = 1;
const KEY_LENGTH = 64;
const SALT_LENGTH = 16;
const MAX_MEMORY = 64 * 1024 * 1024;

interface ScryptParameters {
  N: number;
  r: number;
  p: number;
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

export async function verifyPassword(
  password: string,
  storedHash: string,
): Promise<boolean> {
  const parts = storedHash.split('$');

  if (parts.length !== 6 || parts[0] !== 'scrypt') {
    return false;
  }

  const [, nRaw, rRaw, pRaw, saltRaw, hashRaw] = parts;
  const n = Number(nRaw);
  const r = Number(rRaw);
  const p = Number(pRaw);

  if (
    !Number.isInteger(n) ||
    !Number.isInteger(r) ||
    !Number.isInteger(p) ||
    n <= 1 ||
    r <= 0 ||
    p <= 0
  ) {
    return false;
  }

  const salt = Buffer.from(saltRaw, 'base64');
  const expected = Buffer.from(hashRaw, 'base64');

  if (salt.length === 0 || expected.length === 0) {
    return false;
  }

  try {
    const derivedKey = await deriveKey(password, salt, expected.length, {
      N: n,
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
