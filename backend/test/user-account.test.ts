import assert from 'node:assert/strict';
import './helpers/recaptcha.js';
import test from 'node:test';
import type { AddressInfo } from 'node:net';
import { createApp } from '../src/app.js';
import { db } from '../src/prisma/db.js';
import { hashPassword } from '../src/infrastructure/security/password.js';

const TEST_PASSWORD = 'ClaveSegura123';
const marker = `prueba-cuenta-${Date.now()}`;
const studentEmail = `${marker}-student@example.com`;

interface ApiErrorResponse {
  error: {
    code: string;
    message?: string;
    fields?: Record<string, string>;
  };
}

interface UserProfileResponse {
  user: {
    id: number;
    email: string;
    role: string;
    status: string;
    username: string | null;
  };
}

interface GenericMessageResponse {
  message: string;
}

let baseUrl = '';

async function requestJson<T>(
  path: string,
  options: {
    cookie?: string;
    method?: string;
    body?: unknown;
  } = {},
): Promise<{ status: number; body: T }> {
  const headers = new Headers();
  headers.set('x-unicyber-request', '1');

  if (options.cookie) {
    headers.set('cookie', options.cookie);
  }

  if (options.body !== undefined) {
    headers.set('content-type', 'application/json');
  }

  const response = await fetch(`${baseUrl}${path}`, {
    method: options.method ?? 'GET',
    headers,
    body:
      options.body === undefined
        ? undefined
        : JSON.stringify(options.body),
  });

  const text = await response.text();
  const body = text.length > 0 ? (JSON.parse(text) as T) : ({} as T);

  return { status: response.status, body };
}

async function registerAndLogin(email: string): Promise<string> {
  await db.orm.public.User.create({
    firstName: 'Usuario',
    lastName: 'Prueba',
    email,
    passwordHash: await hashPassword(TEST_PASSWORD),
    role: 'STUDENT',
    status: 'ACTIVE',
  });

  const response = await fetch(`${baseUrl}/auth/login`, {
    method: 'POST',
    headers: { 'content-type': 'application/json', 'x-unicyber-request': '1' },
    body: JSON.stringify({ email, password: TEST_PASSWORD, recaptchaToken: 'test-recaptcha-token' }),
  });

  assert.equal(response.status, 200);

  const setCookie = response.headers.get('set-cookie');
  assert.ok(setCookie, 'El inicio de sesión debe emitir una cookie.');

  return setCookie.split(';')[0]!;
}

async function login(email: string, password: string = TEST_PASSWORD): Promise<string> {
  const response = await fetch(`${baseUrl}/auth/login`, {
    method: 'POST',
    headers: { 'content-type': 'application/json', 'x-unicyber-request': '1' },
    body: JSON.stringify({ email, password, recaptchaToken: 'test-recaptcha-token' }),
  });
  assert.equal(response.status, 200);
  const setCookie = response.headers.get('set-cookie');
  assert.ok(setCookie, 'El inicio de sesión debe emitir una cookie.');
  return setCookie.split(';')[0]!;
}

test(
  'perfil de usuario: lectura, cambio de nombre y contraseña',
  { timeout: 60000 },
  async () => {
    let server: ReturnType<ReturnType<typeof createApp>['listen']> | null =
      null;

    try {
      const app = createApp();
      server = app.listen(0);
      const address = server.address() as AddressInfo;
      baseUrl = `http://127.0.0.1:${address.port}/api`;

      const cookie = await registerAndLogin(studentEmail);

      // Perfil inicial.
      const profile = await requestJson<UserProfileResponse>(
        '/users/me',
        { cookie },
      );
      assert.equal(profile.status, 200);
      assert.equal(profile.body.user.email, studentEmail);
      assert.equal(profile.body.user.role, 'STUDENT');
      assert.ok(!profile.body.user.username, 'El nombre de usuario debe estar vacío al inicio');

      // Cambio de nombre de usuario.
      const renamed = await requestJson<UserProfileResponse>(
        '/users/me/username',
        {
          cookie,
          method: 'PATCH',
          body: { username: 'ana_estudiante' },
        },
      );
      assert.ok([200, 204].includes(renamed.status));

      const renamedProfile = await requestJson<UserProfileResponse>(
        '/users/me',
        { cookie },
      );
      assert.equal(renamedProfile.body.user.username, 'ana_estudiante');

      // Nombre de usuario duplicado: otro usuario ya usa ese nombre.
      const otherEmail = `otro-${marker}-estudiante@example.com`;
      await db.orm.public.User.create({
        firstName: 'Otro',
        lastName: 'Estudiante',
        email: otherEmail,
        passwordHash: await hashPassword(TEST_PASSWORD),
        role: 'STUDENT',
        status: 'ACTIVE',
        username: 'otro_estudiante',
      });

      const duplicated = await requestJson<ApiErrorResponse>(
        '/users/me/username',
        {
          cookie,
          method: 'PATCH',
          body: { username: 'otro_estudiante' },
        },
      );
      assert.equal(duplicated.status, 409);
      assert.equal(duplicated.body.error.code, 'USERNAME_ALREADY_EXISTS');

      // Cambio de contraseña correcto.
      const changed = await requestJson<GenericMessageResponse>(
        '/users/me/password',
        {
          cookie,
          method: 'PATCH',
          body: {
            currentPassword: TEST_PASSWORD,
            newPassword: 'NuevaClave123',
            confirmPassword: 'NuevaClave123',
          },
        },
      );
      assert.equal(changed.status, 204);

      // Contraseña actual incorrecta.
      const wrong = await requestJson<ApiErrorResponse>(
        '/users/me/password',
        {
          cookie,
          method: 'PATCH',
          body: {
            currentPassword: 'ContraseñaIncorrecta123',
            newPassword: 'OtraClave123',
            confirmPassword: 'OtraClave123',
          },
        },
      );
      assert.ok([400, 401].includes(wrong.status));
    } finally {
      if (server) {
        await new Promise<void>((resolve) => {
          server?.close(() => resolve());
        });
      }

      await db.orm.public.User.where({ email: studentEmail }).deleteAll();
      await db.orm.public.User.where({ email: `otro-${marker}-estudiante@example.com` }).deleteAll();
    }
  },
);
