import assert from 'node:assert/strict';
import test from 'node:test';
import type { AddressInfo } from 'node:net';
import { createApp } from '../src/app.js';
import { db } from '../src/prisma/db.js';
import { hashPassword } from '../src/infrastructure/security/password.js';

const TEST_PASSWORD = 'ClaveSegura123';
const marker = `panel-admin-${Date.now()}`;
const studentEmail = `${marker}-student@example.com`;
const adminEmail = `${marker}-admin@example.com`;
const originalUsername = `${marker}-student`;

interface ApiErrorResponse {
  error: { code: string; message?: string };
}

interface StatisticsResponse {
  statistics: {
    students: { total: number; active: number; disabled: number };
    registrations: Array<{ period: string; label: string; count: number }>;
    courses: { total: number; published: number; unpublished: number };
    modules: number;
    lessons: { theory: number; laboratory: number };
    topCourses: Array<{ courseId: number; title: string; students: number }>;
    passingRate: { attemptedStudents: number; passedStudents: number; rate: number };
    completedCourses: number;
    assessmentAttempts: number;
  };
}

interface UsersResponse {
  users: Array<{
    id: number;
    email: string;
    role: string;
    username: string | null;
  }>;
}

interface UserResponse {
  user: { id: number; role: string; username: string | null };
}

let baseUrl = '';

async function requestJson<T>(
  path: string,
  options: { cookie?: string; method?: string; body?: unknown } = {},
): Promise<{ status: number; body: T }> {
  const headers = new Headers();

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
      options.body === undefined ? undefined : JSON.stringify(options.body),
  });

  const text = await response.text();
  const body = text.length > 0 ? (JSON.parse(text) as T) : ({} as T);

  return { status: response.status, body };
}

async function createAndLogin(
  email: string,
  role: 'STUDENT' | 'ADMINISTRATIVE',
): Promise<{ id: number; cookie: string }> {
  const created = await db.orm.public.User.create({
    firstName: role === 'STUDENT' ? 'Estudiante' : 'Admin',
    lastName: 'Prueba',
    email,
    passwordHash: await hashPassword(TEST_PASSWORD),
    role,
    status: 'ACTIVE',
  });

  const response = await fetch(`${baseUrl}/auth/login`, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ email, password: TEST_PASSWORD }),
  });

  assert.equal(response.status, 200);

  const setCookie = response.headers.get('set-cookie');
  assert.ok(setCookie, 'El inicio de sesión debe emitir una cookie.');

  return {
    id: (created as unknown as { id: number }).id,
    cookie: setCookie.split(';')[0]!,
  };
}

test(
  'panel administrativo: autorización, estadísticas y gestión de usuarios',
  { timeout: 60000 },
  async () => {
    let server: ReturnType<ReturnType<typeof createApp>['listen']> | null =
      null;

    try {
      const app = createApp();
      server = app.listen(0);
      const address = server.address() as AddressInfo;
      baseUrl = `http://127.0.0.1:${address.port}/api`;

      const student = await createAndLogin(studentEmail, 'STUDENT');
      const admin = await createAndLogin(adminEmail, 'ADMINISTRATIVE');

      // Un estudiante no puede consultar estadísticas ni usuarios.
      const forbiddenStats = await requestJson<ApiErrorResponse>(
        '/admin/statistics',
        { cookie: student.cookie },
      );
      assert.equal(forbiddenStats.status, 403);

      const forbiddenUsers = await requestJson<ApiErrorResponse>(
        '/admin/users',
        { cookie: student.cookie },
      );
      assert.equal(forbiddenUsers.status, 403);

      // El administrador sí obtiene las estadísticas reales.
      const stats = await requestJson<StatisticsResponse>('/admin/statistics', {
        cookie: admin.cookie,
      });
      assert.equal(stats.status, 200);
      assert.ok(stats.body.statistics.students.total >= 1);
      assert.equal(stats.body.statistics.registrations.length, 6);
      assert.ok(Array.isArray(stats.body.statistics.topCourses));
      assert.ok(stats.body.statistics.courses.total >= 0);
      assert.ok(stats.body.statistics.passingRate.rate >= 0);

      // Listado de usuarios y búsqueda.
      const users = await requestJson<UsersResponse>(
        `/admin/users?search=${encodeURIComponent(marker)}`,
        { cookie: admin.cookie },
      );
      assert.equal(users.status, 200);
      assert.ok(users.body.users.some((user) => user.email === studentEmail));

      // Actualización de nombre de usuario y rol.
      const updated = await requestJson<UserResponse>(
        `/admin/users/${student.id}`,
        {
          cookie: admin.cookie,
          method: 'PATCH',
          body: { username: `${originalUsername}-editado`, role: 'MENTOR' },
        },
      );
      assert.equal(updated.status, 200);
      assert.equal(updated.body.user.username, `${originalUsername}-editado`);
      assert.equal(updated.body.user.role, 'MENTOR');

      // No se permite cambiar el propio rol.
      const selfRole = await requestJson<ApiErrorResponse>(
        `/admin/users/${admin.id}`,
        {
          cookie: admin.cookie,
          method: 'PATCH',
          body: { role: 'STUDENT' },
        },
      );
      assert.equal(selfRole.status, 400);
      assert.equal(selfRole.body.error.code, 'SELF_ROLE_CHANGE');

      // La eliminación de cuentas ya no está expuesta.
      const deleteRoute = await requestJson<ApiErrorResponse>('/users/me', {
        cookie: student.cookie,
        method: 'DELETE',
      });
      assert.equal(deleteRoute.status, 404);
    } finally {
      if (server) {
        await new Promise<void>((resolve) => {
          server?.close(() => resolve());
        });
      }

      await db.orm.public.User.where({ email: studentEmail }).deleteAll();
      await db.orm.public.User.where({ email: adminEmail }).deleteAll();
    }
  },
);
