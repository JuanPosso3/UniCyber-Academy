import assert from 'node:assert/strict';
import test from 'node:test';
import type { AddressInfo } from 'node:net';
import { createApp } from '../src/app.js';
import { db } from '../src/prisma/db.js';
import { hashPassword } from '../src/infrastructure/security/password.js';

const TEST_PASSWORD = 'ClaveSegura123';
const marker = `prueba-cursos-${Date.now()}`;
const adminEmail = `${marker}-admin@example.com`;
const studentEmail = `${marker}-student@example.com`;

interface CourseResponse {
  course: {
    id: number;
    title: string;
    status: 'DRAFT' | 'ACTIVE' | 'ARCHIVED';
    moduleCount: number;
  };
}

interface CourseListResponse {
  courses: Array<CourseResponse['course']>;
}

interface ModuleResponse {
  module: {
    id: number;
    title: string;
    order: number;
    status: 'DRAFT' | 'ACTIVE' | 'ARCHIVED';
  };
}

interface ModuleListResponse {
  modules: ModuleResponse['module'][];
}

interface CourseDetailResponse {
  course: CourseResponse['course'] & {
    modules: ModuleResponse['module'][];
  };
}

interface ApiErrorResponse {
  error: {
    code: string;
    fields?: Record<string, string>;
  };
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

async function login(email: string): Promise<string> {
  const response = await fetch(`${baseUrl}/auth/login`, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ email, password: TEST_PASSWORD }),
  });

  assert.equal(response.status, 200);

  const setCookie = response.headers.get('set-cookie');
  assert.ok(setCookie, 'El inicio de sesión debe emitir una cookie.');

  return setCookie.split(';')[0]!;
}

test(
  'flujo de catálogo, publicación, módulos y archivado',
  { timeout: 30000 },
  async () => {
    let server: ReturnType<ReturnType<typeof createApp>['listen']> | null =
      null;
    let courseId: number | null = null;

    try {
      const passwordHash = await hashPassword(TEST_PASSWORD);

      await db.orm.public.User.create({
        firstName: 'Admin',
        lastName: 'Pruebas',
        email: adminEmail,
        passwordHash,
        role: 'ADMINISTRATIVE',
        status: 'ACTIVE',
      });

      await db.orm.public.User.create({
        firstName: 'Estudiante',
        lastName: 'Pruebas',
        email: studentEmail,
        passwordHash,
        role: 'STUDENT',
        status: 'ACTIVE',
      });

      const app = createApp();
      server = app.listen(0);
      await new Promise<void>((resolve, reject) => {
        server?.once('listening', resolve);
        server?.once('error', reject);
      });

      const address = server.address() as AddressInfo;
      baseUrl = `http://127.0.0.1:${address.port}/api`;

      const adminCookie = await login(adminEmail);
      const studentCookie = await login(studentEmail);

      const forbidden = await requestJson<ApiErrorResponse>(
        '/admin/courses',
        { cookie: studentCookie },
      );
      assert.equal(forbidden.status, 403);
      assert.equal(forbidden.body.error.code, 'FORBIDDEN');

      const invalid = await requestJson<ApiErrorResponse>(
        '/admin/courses',
        {
          cookie: adminCookie,
          method: 'POST',
          body: { title: '   ' },
        },
      );
      assert.equal(invalid.status, 400);
      assert.equal(invalid.body.error.code, 'VALIDATION_ERROR');
      assert.equal(
        invalid.body.error.fields?.['title'],
        'Este campo es obligatorio.',
      );

      const created = await requestJson<CourseResponse>('/admin/courses', {
        cookie: adminCookie,
        method: 'POST',
        body: {
          title: `${marker} Curso de prueba`,
          description: 'Curso temporal creado por la prueba de integración.',
        },
      });
      assert.equal(created.status, 201);
      assert.equal(created.body.course.status, 'DRAFT');
      courseId = created.body.course.id;

      const hiddenDraft = await requestJson<CourseListResponse>(
        '/courses',
        { cookie: studentCookie },
      );
      assert.equal(hiddenDraft.status, 200);
      assert.ok(
        hiddenDraft.body.courses.every((course) => course.id !== courseId),
      );

      const published = await requestJson<CourseResponse>(
        `/admin/courses/${courseId}/status`,
        {
          cookie: adminCookie,
          method: 'PATCH',
          body: { status: 'ACTIVE' },
        },
      );
      assert.equal(published.status, 200);
      assert.equal(published.body.course.status, 'ACTIVE');

      const visible = await requestJson<CourseListResponse>('/courses', {
        cookie: studentCookie,
      });
      assert.ok(
        visible.body.courses.some((course) => course.id === courseId),
      );

      const firstModule = await requestJson<ModuleResponse>(
        `/admin/courses/${courseId}/modules`,
        {
          cookie: adminCookie,
          method: 'POST',
          body: {
            title: 'Módulo A',
            description: 'Primer módulo temporal.',
          },
        },
      );
      assert.equal(firstModule.status, 201);
      assert.equal(firstModule.body.module.order, 1);
      assert.equal(firstModule.body.module.status, 'DRAFT');

      const secondModule = await requestJson<ModuleResponse>(
        `/admin/courses/${courseId}/modules`,
        {
          cookie: adminCookie,
          method: 'POST',
          body: {
            title: 'Módulo B',
            description: 'Segundo módulo temporal.',
          },
        },
      );
      assert.equal(secondModule.status, 201);
      assert.equal(secondModule.body.module.order, 2);

      const withoutPublishedModules =
        await requestJson<CourseDetailResponse>(`/courses/${courseId}`, {
          cookie: studentCookie,
        });
      assert.equal(withoutPublishedModules.status, 200);
      assert.deepEqual(withoutPublishedModules.body.course.modules, []);

      const catalogWithoutPublishedModules =
        await requestJson<CourseListResponse>('/courses', {
          cookie: studentCookie,
        });
      const hiddenModuleCount = catalogWithoutPublishedModules.body.courses
        .find((course) => course.id === courseId)?.moduleCount;
      assert.equal(hiddenModuleCount, 0);

      for (const module of [
        firstModule.body.module,
        secondModule.body.module,
      ]) {
        const response: {
          status: number;
          body: ModuleResponse;
        } = await requestJson<ModuleResponse>(
          `/admin/courses/${courseId}/modules/${module.id}/status`,
          {
            cookie: adminCookie,
            method: 'PATCH',
            body: { status: 'ACTIVE' },
          },
        );
        assert.equal(response.status, 200);
        assert.equal(response.body.module.status, 'ACTIVE');
      }

      const withModules = await requestJson<CourseDetailResponse>(
        `/courses/${courseId}`,
        { cookie: studentCookie },
      );
      assert.deepEqual(
        withModules.body.course.modules.map((module) => module.title),
        ['Módulo A', 'Módulo B'],
      );

      const moved = await requestJson<ModuleListResponse>(
        `/admin/courses/${courseId}/modules/${secondModule.body.module.id}/order`,
        {
          cookie: adminCookie,
          method: 'PATCH',
          body: { direction: 'up' },
        },
      );
      assert.equal(moved.status, 200);
      assert.deepEqual(
        moved.body.modules.map((module) => module.title),
        ['Módulo B', 'Módulo A'],
      );

      const studentReordered = await requestJson<CourseDetailResponse>(
        `/courses/${courseId}`,
        { cookie: studentCookie },
      );
      assert.deepEqual(
        studentReordered.body.course.modules.map((module) => module.title),
        ['Módulo B', 'Módulo A'],
      );

      const archivedModule = await requestJson<ModuleResponse>(
        `/admin/courses/${courseId}/modules/${firstModule.body.module.id}/status`,
        {
          cookie: adminCookie,
          method: 'PATCH',
          body: { status: 'ARCHIVED' },
        },
      );
      assert.equal(archivedModule.status, 200);
      assert.equal(archivedModule.body.module.status, 'ARCHIVED');

      const afterModuleArchive = await requestJson<CourseDetailResponse>(
        `/courses/${courseId}`,
        { cookie: studentCookie },
      );
      assert.deepEqual(
        afterModuleArchive.body.course.modules.map(
          (module) => module.title,
        ),
        ['Módulo B'],
      );

      const archivedCourse = await requestJson<CourseResponse>(
        `/admin/courses/${courseId}/status`,
        {
          cookie: adminCookie,
          method: 'PATCH',
          body: { status: 'ARCHIVED' },
        },
      );
      assert.equal(archivedCourse.status, 200);
      assert.equal(archivedCourse.body.course.status, 'ARCHIVED');

      const catalogAfterArchive = await requestJson<CourseListResponse>(
        '/courses',
        { cookie: studentCookie },
      );
      assert.ok(
        catalogAfterArchive.body.courses.every(
          (course) => course.id !== courseId,
        ),
      );

      const detailAfterArchive = await requestJson<ApiErrorResponse>(
        `/courses/${courseId}`,
        { cookie: studentCookie },
      );
      assert.equal(detailAfterArchive.status, 404);
      assert.equal(
        detailAfterArchive.body.error.code,
        'COURSE_NOT_AVAILABLE',
      );

      const moduleOnArchivedCourse = await requestJson<ApiErrorResponse>(
        `/admin/courses/${courseId}/modules`,
        {
          cookie: adminCookie,
          method: 'POST',
          body: { title: 'Módulo no permitido' },
        },
      );
      assert.equal(moduleOnArchivedCourse.status, 409);
      assert.equal(
        moduleOnArchivedCourse.body.error.code,
        'COURSE_ARCHIVED',
      );

      const invalidRestore = await requestJson<ApiErrorResponse>(
        `/admin/courses/${courseId}/status`,
        {
          cookie: adminCookie,
          method: 'PATCH',
          body: { status: 'ACTIVE' },
        },
      );
      assert.equal(invalidRestore.status, 409);
      assert.equal(
        invalidRestore.body.error.code,
        'INVALID_STATUS_TRANSITION',
      );
    } finally {
      if (server) {
        await new Promise<void>((resolve) => {
          server?.close(() => resolve());
        });
      }

      if (courseId !== null) {
        await db.orm.public.Module
          .where({ courseId })
          .deleteAll();
        await db.orm.public.Course.where({ id: courseId }).deleteAll();
      }

      await db.orm.public.User.where({ email: adminEmail }).deleteAll();
      await db.orm.public.User.where({ email: studentEmail }).deleteAll();
      await db.close();
    }
  },
);
