import assert from 'node:assert/strict';
import test from 'node:test';
import type { AddressInfo } from 'node:net';
import { createApp } from '../src/app.js';
import { db } from '../src/prisma/db.js';
import { hashPassword } from '../src/infrastructure/security/password.js';

const TEST_PASSWORD = 'ClaveSegura123';
const marker = `prueba-lecciones-${Date.now()}`;
const adminEmail = `${marker}-admin@example.com`;
const studentEmail = `${marker}-student@example.com`;

interface ApiErrorResponse {
  error: {
    code: string;
    message?: string;
    fields?: Record<string, string>;
    details?: unknown;
  };
}

interface CourseResponse {
  course: {
    id: number;
    title: string;
    status: 'DRAFT' | 'ACTIVE' | 'ARCHIVED';
  };
}

interface ModuleResponse {
  module: {
    id: number;
    title: string;
    order: number;
    status: 'DRAFT' | 'ACTIVE' | 'ARCHIVED';
  };
}

interface LessonResponse {
  lesson: {
    id: number;
    title: string;
    type: 'THEORY' | 'LABORATORY';
    order: number;
    status: 'DRAFT' | 'ACTIVE' | 'ARCHIVED';
    progressCount?: number;
  };
}

interface AdminLessonListResponse {
  lessons: LessonResponse['lesson'][];
}

interface LearningLesson {
  id: number;
  title: string;
  completed: boolean;
  locked: boolean;
  isNext: boolean;
}

interface LearningModule {
  id: number;
  title: string;
  locked: boolean;
  completed: boolean;
  assessmentRequired: boolean;
  assessmentPassed: boolean;
  lessons: LearningLesson[];
}

interface StudentCourseResponse {
  course: {
    id: number;
    progress: {
      completedLessons: number;
      totalLessons: number;
      percentage: number;
    };
    modules: LearningModule[];
  };
}

interface StudentLessonResponse {
  lesson: {
    id: number;
    type: 'THEORY' | 'LABORATORY';
    completed: boolean;
    content: Record<string, unknown>;
  };
  navigation: {
    nextLessonId: number | null;
    nextLessonLocked: boolean;
  };
}

interface CompletionResponse {
  lessonProgress: { completedAt: string };
  progress: {
    completedLessons: number;
    totalLessons: number;
    percentage: number;
  };
}

interface ActivityCheckResponse {
  correct: boolean;
  message: string;
}

interface TerminalResponse {
  command: string;
  output: string;
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

function theoryContent() {
  return {
    schemaVersion: 1,
    blocks: [
      {
        id: 'titulo',
        type: 'heading',
        content: 'Contenido de prueba',
        level: 2,
      },
      {
        id: 'parrafo',
        type: 'paragraph',
        content: 'Este es un contenido de prueba para la integración.',
      },
      {
        id: 'aviso',
        type: 'callout',
        variant: 'TIP',
        content: 'Una recomendación de prueba.',
      },
    ],
  };
}

function laboratoryContent() {
  return {
    schemaVersion: 1,
    introduction: 'Introducción de prueba para el laboratorio.',
    objective: 'Practicar la identificación de una decisión segura.',
    scenario: 'Escenario de prueba completamente simulado.',
    activities: [
      {
        id: 'choice',
        type: 'SINGLE_CHOICE',
        title: 'Decisión de prueba',
        instructions: 'Selecciona la opción correcta.',
        required: true,
        hints: ['Una pista de prueba.'],
        options: [
          { id: 'a', text: 'Opción incorrecta' },
          { id: 'b', text: 'Opción correcta' },
        ],
        solution: { optionId: 'b' },
      },
      {
        id: 'terminal',
        type: 'TERMINAL',
        title: 'Terminal de prueba',
        instructions: 'Ejecuta el comando de ayuda.',
        required: true,
        hints: ['Consulta los comandos disponibles.'],
        welcome: 'Terminal simulada de prueba.',
        prompt: 'Ejecuta ayuda.',
        commands: [
          {
            command: 'ayuda',
            output: 'Comandos disponibles: ayuda, estado',
            description: 'Muestra la ayuda.',
          },
          {
            command: 'estado',
            output: 'Estado simulado correcto',
            description: 'Consulta el estado.',
          },
        ],
        solution: { requiredCommands: ['ayuda'] },
      },
    ],
  };
}

function emailLabContent() {
  return {
    schemaVersion: 1,
    introduction: 'Laboratorio con simulación de correo de prueba.',
    objective: 'Identificar los elementos sospechosos de un correo simulado.',
    scenario: 'Recibes un correo de soporte con varios indicadores de riesgo.',
    activities: [
      {
        id: 'choice',
        type: 'SINGLE_CHOICE',
        title: 'Decisión previa',
        instructions: 'Selecciona la opción correcta.',
        required: true,
        options: [
          { id: 'a', text: 'Opción incorrecta' },
          { id: 'b', text: 'Opción correcta' },
        ],
        solution: { optionId: 'b' },
      },
      {
        id: 'correo',
        type: 'EMAIL_ANALYSIS',
        title: 'Analiza el correo sospechoso',
        instructions: 'Selecciona los elementos sospechosos del correo.',
        required: true,
        hints: ['Una pista de prueba del correo.'],
        email: {
          fromName: 'Soporte del sitio',
          fromAddress: 'soporte@sitio-prueba.example.com',
          fromElementId: 'remitente',
          toAddress: 'estudiante@institucion.example.com',
          toElementId: 'destinatario',
          subject: 'URGENTE: verifica tu cuenta',
          subjectElementId: 'asunto',
          datetime: 'lunes, 2 de noviembre de 2026, 8:00 a. m.',
          datetimeElementId: 'fecha',
          greeting: 'Hola:',
          greetingElementId: 'saludo',
          body: [
            {
              text: 'Debes verificar tus credenciales ahora mismo.',
              elementId: 'credenciales',
            },
            { text: 'Este es un párrafo legítimo del mensaje.' },
          ],
          linkLabel: 'VERIFICAR AHORA',
          linkUrl: 'http://sitio-prueba.example.com/verificar',
          linkElementId: 'enlace',
          closingLines: ['Gracias.'],
          closingElementId: 'cierre',
          signatureLines: ['Equipo de soporte'],
          signatureElementId: 'firma',
          disclaimer: 'Contenido ficticio con fines educativos.',
        },
        elements: [
          { id: 'remitente', text: 'Datos del remitente' },
          { id: 'destinatario', text: 'Destinatario del mensaje' },
          { id: 'asunto', text: 'Línea de asunto' },
          { id: 'fecha', text: 'Fecha y hora de envío' },
          { id: 'saludo', text: 'Saludo inicial' },
          { id: 'credenciales', text: 'Solicitud de credenciales' },
          { id: 'enlace', text: 'Enlace de verificación' },
          { id: 'cierre', text: 'Cierre del mensaje' },
          { id: 'firma', text: 'Firma del mensaje' },
        ],
        solution: {
          elementIds: ['remitente', 'asunto', 'credenciales', 'enlace', 'firma'],
        },
      },
    ],
  };
}


test(
  'flujo de lecciones, desbloqueo, laboratorio y progreso',
  { timeout: 40000 },
  async () => {
    let server: ReturnType<ReturnType<typeof createApp>['listen']> | null =
      null;
    let courseId: number | null = null;
    let assessmentId: number | null = null;
    let studentId: number | null = null;

    try {
      const passwordHash = await hashPassword(TEST_PASSWORD);

      await db.orm.public.User.create({
        firstName: 'Admin',
        lastName: 'Lecciones',
        email: adminEmail,
        passwordHash,
        role: 'ADMINISTRATIVE',
        status: 'ACTIVE',
      });

      const student = await db.orm.public.User.create({
        firstName: 'Estudiante',
        lastName: 'Lecciones',
        email: studentEmail,
        passwordHash,
        role: 'STUDENT',
        status: 'ACTIVE',
      });
      studentId = student.id;

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

      const course = await requestJson<CourseResponse>('/admin/courses', {
        cookie: adminCookie,
        method: 'POST',
        body: {
          title: 'Curso de lecciones',
          description: 'Curso de prueba para el flujo de lecciones.',
        },
      });
      assert.equal(course.status, 201);
      courseId = course.body.course.id;

      const moduleA = await requestJson<ModuleResponse>(
        `/admin/courses/${courseId}/modules`,
        {
          cookie: adminCookie,
          method: 'POST',
          body: { title: 'Módulo A', description: null },
        },
      );
      assert.equal(moduleA.status, 201);

      const moduleB = await requestJson<ModuleResponse>(
        `/admin/courses/${courseId}/modules`,
        {
          cookie: adminCookie,
          method: 'POST',
          body: { title: 'Módulo B', description: null },
        },
      );
      assert.equal(moduleB.status, 201);

      const moduleAId = moduleA.body.module.id;
      const moduleBId = moduleB.body.module.id;

      const forbiddenCreate = await requestJson<ApiErrorResponse>(
        `/admin/courses/${courseId}/modules/${moduleAId}/lessons`,
        {
          cookie: studentCookie,
          method: 'POST',
          body: { title: 'No permitida', type: 'THEORY', content: theoryContent() },
        },
      );
      assert.equal(forbiddenCreate.status, 403);
      assert.equal(forbiddenCreate.body.error.code, 'FORBIDDEN');

      const invalidCreate = await requestJson<ApiErrorResponse>(
        `/admin/courses/${courseId}/modules/${moduleAId}/lessons`,
        {
          cookie: adminCookie,
          method: 'POST',
          body: {
            title: 'Lección inválida',
            type: 'THEORY',
            content: { schemaVersion: 1, blocks: [] },
          },
        },
      );
      assert.equal(invalidCreate.status, 400);
      assert.equal(invalidCreate.body.error.code, 'INVALID_CONTENT');
      assert.ok(Array.isArray(invalidCreate.body.error.details));

      const theoryOne = await requestJson<LessonResponse>(
        `/admin/courses/${courseId}/modules/${moduleAId}/lessons`,
        {
          cookie: adminCookie,
          method: 'POST',
          body: {
            title: 'Lección teórica 1',
            type: 'THEORY',
            content: theoryContent(),
          },
        },
      );
      assert.equal(theoryOne.status, 201);
      assert.equal(theoryOne.body.lesson.status, 'DRAFT');

      const theoryTwo = await requestJson<LessonResponse>(
        `/admin/courses/${courseId}/modules/${moduleAId}/lessons`,
        {
          cookie: adminCookie,
          method: 'POST',
          body: {
            title: 'Lección teórica 2',
            type: 'THEORY',
            content: theoryContent(),
          },
        },
      );
      assert.equal(theoryTwo.status, 201);

      const laboratory = await requestJson<LessonResponse>(
        `/admin/courses/${courseId}/modules/${moduleBId}/lessons`,
        {
          cookie: adminCookie,
          method: 'POST',
          body: {
            title: 'Laboratorio de prueba',
            type: 'LABORATORY',
            content: laboratoryContent(),
          },
        },
      );
      assert.equal(laboratory.status, 201);

      const theoryOneId = theoryOne.body.lesson.id;
      const theoryTwoId = theoryTwo.body.lesson.id;
      const laboratoryId = laboratory.body.lesson.id;

      for (const [moduleId, lessonId] of [
        [moduleAId, theoryOneId],
        [moduleAId, theoryTwoId],
        [moduleBId, laboratoryId],
      ]) {
        const activation: { status: number; body: LessonResponse } =
          await requestJson<LessonResponse>(
            `/admin/courses/${courseId}/modules/${moduleId}/lessons/${lessonId}/status`,
            {
              cookie: adminCookie,
              method: 'PATCH',
              body: { status: 'ACTIVE' },
            },
          );
        assert.equal(activation.status, 200);
        assert.equal(activation.body.lesson.status, 'ACTIVE');
      }

      for (const moduleId of [moduleAId, moduleBId]) {
        const activation: { status: number; body: ModuleResponse } =
          await requestJson<ModuleResponse>(
            `/admin/courses/${courseId}/modules/${moduleId}/status`,
            {
              cookie: adminCookie,
              method: 'PATCH',
              body: { status: 'ACTIVE' },
            },
          );
        assert.equal(activation.status, 200);
      }

      const courseActivation = await requestJson<CourseResponse>(
        `/admin/courses/${courseId}/status`,
        {
          cookie: adminCookie,
          method: 'PATCH',
          body: { status: 'ACTIVE' },
        },
      );
      assert.equal(courseActivation.status, 200);

      const initialCourse = await requestJson<StudentCourseResponse>(
        `/courses/${courseId}`,
        { cookie: studentCookie },
      );
      assert.equal(initialCourse.status, 200);
      assert.equal(initialCourse.body.course.progress.totalLessons, 3);
      assert.equal(initialCourse.body.course.progress.completedLessons, 0);
      assert.equal(initialCourse.body.course.progress.percentage, 0);

      const initialModules = initialCourse.body.course.modules;
      assert.equal(initialModules[0]!.locked, false);
      assert.equal(initialModules[1]!.locked, true);
      assert.equal(initialModules[0]!.lessons[0]!.isNext, true);
      assert.equal(initialModules[0]!.lessons[1]!.locked, true);

      const lockedLesson = await requestJson<ApiErrorResponse>(
        `/courses/${courseId}/lessons/${theoryTwoId}`,
        { cookie: studentCookie },
      );
      assert.equal(lockedLesson.status, 403);
      assert.equal(lockedLesson.body.error.code, 'LESSON_LOCKED');

      const completeOne = await requestJson<CompletionResponse>(
        `/courses/${courseId}/lessons/${theoryOneId}/complete`,
        { cookie: studentCookie, method: 'POST' },
      );
      assert.equal(completeOne.status, 200);
      assert.equal(completeOne.body.progress.completedLessons, 1);
      assert.equal(completeOne.body.progress.percentage, 33);

      const afterOne = await requestJson<StudentCourseResponse>(
        `/courses/${courseId}`,
        { cookie: studentCookie },
      );
      assert.equal(afterOne.body.course.modules[0]!.lessons[1]!.isNext, true);

      const completeTwo = await requestJson<CompletionResponse>(
        `/courses/${courseId}/lessons/${theoryTwoId}/complete`,
        { cookie: studentCookie, method: 'POST' },
      );
      assert.equal(completeTwo.status, 200);
      assert.equal(completeTwo.body.progress.completedLessons, 2);

      const beforeAssessment = await requestJson<StudentCourseResponse>(
        `/courses/${courseId}`,
        { cookie: studentCookie },
      );
      assert.equal(beforeAssessment.body.course.modules[1]!.locked, false);

      // El aprendizaje ya no depende de evaluaciones por módulo: aun
      // cuando exista una evaluación de módulo activa, el segundo
      // módulo permanece desbloqueado y los campos del nivel de
      // módulo desaparecen de la respuesta.
      const legacyModuleAssessment = await db.orm.public.Assessment.create({
        title: 'Evaluación de recordar del módulo A',
        description: null,
        type: 'MODULE',
        moduleId: moduleAId,
        courseId: null,
        status: 'ACTIVE',
      });
      assessmentId = legacyModuleAssessment.id;

      const unblockedByLegacyAssessment =
        await requestJson<StudentCourseResponse>(
          `/courses/${courseId}`,
          { cookie: studentCookie },
        );
      assert.equal(
        unblockedByLegacyAssessment.body.course.modules[1]!.locked,
        false,
      );
      assert.equal(
        'assessmentRequired' in
          unblockedByLegacyAssessment.body.course.modules[0]!,
        false,
      );
      assert.equal(
        'assessmentPassed' in
          unblockedByLegacyAssessment.body.course.modules[0]!,
        false,
      );

      const labLesson = await requestJson<StudentLessonResponse>(
        `/courses/${courseId}/lessons/${laboratoryId}`,
        { cookie: studentCookie },
      );
      assert.equal(labLesson.status, 200);
      assert.equal(labLesson.body.lesson.type, 'LABORATORY');
      assert.ok(!JSON.stringify(labLesson.body.lesson.content).includes('"solution"'));

      const wrongChoice = await requestJson<ActivityCheckResponse>(
        `/courses/${courseId}/lessons/${laboratoryId}/activities/choice/check`,
        {
          cookie: studentCookie,
          method: 'POST',
          body: { answer: { optionId: 'a' } },
        },
      );
      assert.equal(wrongChoice.status, 200);
      assert.equal(wrongChoice.body.correct, false);

      const correctChoice = await requestJson<ActivityCheckResponse>(
        `/courses/${courseId}/lessons/${laboratoryId}/activities/choice/check`,
        {
          cookie: studentCookie,
          method: 'POST',
          body: { answer: { optionId: 'b' } },
        },
      );
      assert.equal(correctChoice.status, 200);
      assert.equal(correctChoice.body.correct, true);

      const terminal = await requestJson<TerminalResponse>(
        `/courses/${courseId}/lessons/${laboratoryId}/activities/terminal/terminal`,
        {
          cookie: studentCookie,
          method: 'POST',
          body: { command: 'ayuda' },
        },
      );
      assert.equal(terminal.status, 200);
      assert.equal(terminal.body.output, 'Comandos disponibles: ayuda, estado');

      const invalidTerminal = await requestJson<ApiErrorResponse>(
        `/courses/${courseId}/lessons/${laboratoryId}/activities/terminal/terminal`,
        {
          cookie: studentCookie,
          method: 'POST',
          body: { command: 'rm -rf /' },
        },
      );
      assert.equal(invalidTerminal.status, 400);
      assert.equal(
        invalidTerminal.body.error.code,
        'INVALID_TERMINAL_COMMAND',
      );

      const terminalCheck = await requestJson<ActivityCheckResponse>(
        `/courses/${courseId}/lessons/${laboratoryId}/activities/terminal/check`,
        {
          cookie: studentCookie,
          method: 'POST',
          body: { answer: { commands: ['ayuda'] } },
        },
      );
      assert.equal(terminalCheck.status, 200);
      assert.equal(terminalCheck.body.correct, true);

      const incompleteLab = await requestJson<ApiErrorResponse>(
        `/courses/${courseId}/lessons/${laboratoryId}/finalize`,
        {
          cookie: studentCookie,
          method: 'POST',
          body: { answers: { choice: { optionId: 'b' } } },
        },
      );
      assert.equal(incompleteLab.status, 422);
      assert.equal(incompleteLab.body.error.code, 'LAB_NOT_COMPLETED');

      const completeLab = await requestJson<CompletionResponse>(
        `/courses/${courseId}/lessons/${laboratoryId}/finalize`,
        {
          cookie: studentCookie,
          method: 'POST',
          body: {
            answers: {
              choice: { optionId: 'b' },
              terminal: { commands: ['ayuda'] },
            },
          },
        },
      );
      assert.equal(completeLab.status, 200);
      assert.equal(completeLab.body.progress.completedLessons, 3);
      assert.equal(completeLab.body.progress.percentage, 100);

      const adminList = await requestJson<AdminLessonListResponse>(
        `/admin/courses/${courseId}/modules/${moduleBId}/lessons`,
        { cookie: adminCookie },
      );
      assert.equal(adminList.status, 200);
      assert.equal(adminList.body.lessons[0]!.progressCount, 1);

      const archiveLesson = await requestJson<LessonResponse>(
        `/admin/courses/${courseId}/modules/${moduleAId}/lessons/${theoryOneId}/status`,
        {
          cookie: adminCookie,
          method: 'PATCH',
          body: { status: 'ARCHIVED' },
        },
      );
      assert.equal(archiveLesson.status, 200);

      const afterArchive = await requestJson<StudentCourseResponse>(
        `/courses/${courseId}`,
        { cookie: studentCookie },
      );
      assert.equal(afterArchive.body.course.progress.totalLessons, 2);
      assert.equal(afterArchive.body.course.progress.completedLessons, 2);
      assert.equal(afterArchive.body.course.progress.percentage, 100);
      assert.equal(
        afterArchive.body.course.modules[0]!.lessons.length,
        1,
      );

      const reactivateLesson = await requestJson<LessonResponse>(
        `/admin/courses/${courseId}/modules/${moduleAId}/lessons/${theoryOneId}/status`,
        {
          cookie: adminCookie,
          method: 'PATCH',
          body: { status: 'ACTIVE' },
        },
      );
      assert.equal(reactivateLesson.status, 200);

      const afterReactivate = await requestJson<StudentCourseResponse>(
        `/courses/${courseId}`,
        { cookie: studentCookie },
      );
      assert.equal(afterReactivate.body.course.progress.totalLessons, 3);
      assert.equal(afterReactivate.body.course.progress.completedLessons, 3);

      const deleteWithProgress = await requestJson<ApiErrorResponse>(
        `/admin/courses/${courseId}/modules/${moduleAId}/lessons/${theoryOneId}`,
        { cookie: adminCookie, method: 'DELETE' },
      );
      assert.equal(deleteWithProgress.status, 409);
      assert.equal(
        deleteWithProgress.body.error.code,
        'LESSON_HAS_PROGRESS',
      );
    } finally {
      if (server) {
        await new Promise<void>((resolve) => {
          server?.close(() => resolve());
        });
      }

      if (studentId !== null) {
        await db.orm.public.LessonProgress.where({ userId: studentId }).deleteAll();
      }

      if (assessmentId !== null) {
        await db.orm.public.AssessmentAttempt
          .where({ assessmentId })
          .deleteAll();
        await db.orm.public.Assessment.where({ id: assessmentId }).deleteAll();
      }

      if (courseId !== null) {
        const modules = await db.orm.public.Module.where({ courseId }).all();
        const moduleIds = modules.map((module) => module.id);

        if (moduleIds.length > 0) {
          await db.orm.public.Lesson
            .where((lesson) => lesson.moduleId.in(moduleIds))
            .deleteAll();
        }

        await db.orm.public.Module.where({ courseId }).deleteAll();
        await db.orm.public.Course.where({ id: courseId }).deleteAll();
      }

      const adminUserCleanup = await db.orm.public.User
        .where({ email: adminEmail })
        .first();
      const studentUserCleanup = await db.orm.public.User
        .where({ email: studentEmail })
        .first();

      if (adminUserCleanup) {
        await db.orm.public.UserAchievement
          .where({ userId: (adminUserCleanup as unknown as { id: number }).id })
          .deleteAll();
      }

      if (studentUserCleanup) {
        await db.orm.public.UserAchievement
          .where({ userId: (studentUserCleanup as unknown as { id: number }).id })
          .deleteAll();
      }

      await db.orm.public.User.where({ email: adminEmail }).deleteAll();
      await db.orm.public.User.where({ email: studentEmail }).deleteAll();
    }
  },
);

test(
  'actividad de análisis de correo simulado en el laboratorio',
  { timeout: 40000 },
  async () => {
    let server: ReturnType<ReturnType<typeof createApp>['listen']> | null =
      null;
    let courseId: number | null = null;
    let studentId: number | null = null;

    const emailTestMarker = `prueba-correo-${Date.now()}`;
    const emailAdminEmail = `${emailTestMarker}-admin@example.com`;
    const emailStudentEmail = `${emailTestMarker}-student@example.com`;

    try {
      const passwordHash = await hashPassword(TEST_PASSWORD);

      await db.orm.public.User.create({
        firstName: 'Admin',
        lastName: 'Correo',
        email: emailAdminEmail,
        passwordHash,
        role: 'ADMINISTRATIVE',
        status: 'ACTIVE',
      });

      const student = await db.orm.public.User.create({
        firstName: 'Estudiante',
        lastName: 'Correo',
        email: emailStudentEmail,
        passwordHash,
        role: 'STUDENT',
        status: 'ACTIVE',
      });
      studentId = student.id;

      const app = createApp();
      server = app.listen(0);
      await new Promise<void>((resolve, reject) => {
        server?.once('listening', resolve);
        server?.once('error', reject);
      });

      const address = server.address() as AddressInfo;
      baseUrl = `http://127.0.0.1:${address.port}/api`;

      const adminCookie = await login(emailAdminEmail);
      const studentCookie = await login(emailStudentEmail);

      const course = await requestJson<CourseResponse>('/admin/courses', {
        cookie: adminCookie,
        method: 'POST',
        body: {
          title: 'Curso de correo',
          description: 'Curso de prueba del análisis de correo.',
        },
      });
      assert.equal(course.status, 201);
      courseId = course.body.course.id;

      const moduleA = await requestJson<ModuleResponse>(
        `/admin/courses/${courseId}/modules`,
        {
          cookie: adminCookie,
          method: 'POST',
          body: { title: 'Módulo de correo', description: null },
        },
      );
      assert.equal(moduleA.status, 201);
      const moduleId = moduleA.body.module.id;

      // Solución con un identificador inexistente.
      const invalidSolution = structuredClone(
        emailLabContent() as unknown,
      ) as {
        activities: [
          Record<string, unknown>,
          { solution: { elementIds: string[] } },
        ];
      };
      invalidSolution.activities[1]!.solution.elementIds = ['remitente', 'no-existe'];
      const invalidResponse = await requestJson<ApiErrorResponse>(
        `/admin/courses/${courseId}/modules/${moduleId}/lessons`,
        {
          cookie: adminCookie,
          method: 'POST',
          body: {
            title: 'Laboratorio inválido',
            type: 'LABORATORY',
            content: invalidSolution,
          },
        },
      );
      assert.equal(invalidResponse.status, 400);
      assert.equal(invalidResponse.body.error.code, 'INVALID_CONTENT');

      // Solución que marca todos los elementos como sospechosos.
      const fullSolution = structuredClone(emailLabContent() as unknown) as {
        activities: [
          Record<string, unknown>,
          { solution: { elementIds: string[] } },
        ];
      };
      fullSolution.activities[1]!.solution.elementIds = [
        'remitente',
        'destinatario',
        'asunto',
        'fecha',
        'saludo',
        'credenciales',
        'enlace',
        'cierre',
        'firma',
      ];
      const fullResponse = await requestJson<ApiErrorResponse>(
        `/admin/courses/${courseId}/modules/${moduleId}/lessons`,
        {
          cookie: adminCookie,
          method: 'POST',
          body: {
            title: 'Laboratorio inválido 2',
            type: 'LABORATORY',
            content: fullSolution,
          },
        },
      );
      assert.equal(fullResponse.status, 400);
      assert.equal(fullResponse.body.error.code, 'INVALID_CONTENT');

      // Enlace fuera de los dominios de ejemplo reservados.
      const realDomain = structuredClone(
        emailLabContent() as unknown,
      ) as {
        activities: [
          Record<string, unknown>,
          { email: { linkUrl?: string } },
        ];
      };
      realDomain.activities[1]!.email.linkUrl = 'https://sitio-real.com/verificar';
      const realResponse = await requestJson<ApiErrorResponse>(
        `/admin/courses/${courseId}/modules/${moduleId}/lessons`,
        {
          cookie: adminCookie,
          method: 'POST',
          body: {
            title: 'Laboratorio inválido 3',
            type: 'LABORATORY',
            content: realDomain,
          },
        },
      );
      assert.equal(realResponse.status, 400);
      assert.equal(realResponse.body.error.code, 'INVALID_CONTENT');

      const validLab = await requestJson<LessonResponse>(
        `/admin/courses/${courseId}/modules/${moduleId}/lessons`,
        {
          cookie: adminCookie,
          method: 'POST',
          body: {
            title: 'Laboratorio con correo',
            type: 'LABORATORY',
            content: emailLabContent(),
          },
        },
      );
      assert.equal(validLab.status, 201);
      const labId = validLab.body.lesson.id;

      const activation = await requestJson<LessonResponse>(
        `/admin/courses/${courseId}/modules/${moduleId}/lessons/${labId}/status`,
        {
          cookie: adminCookie,
          method: 'PATCH',
          body: { status: 'ACTIVE' },
        },
      );
      assert.equal(activation.status, 200);

      const moduleActivation = await requestJson<ModuleResponse>(
        `/admin/courses/${courseId}/modules/${moduleId}/status`,
        { cookie: adminCookie, method: 'PATCH', body: { status: 'ACTIVE' } },
      );
      assert.equal(moduleActivation.status, 200);

      const courseActivation = await requestJson<CourseResponse>(
        `/admin/courses/${courseId}/status`,
        { cookie: adminCookie, method: 'PATCH', body: { status: 'ACTIVE' } },
      );
      assert.equal(courseActivation.status, 200);

      // El contenido del estudiante no incluye la solución.
      const studentLesson = await requestJson<StudentLessonResponse>(
        `/courses/${courseId}/lessons/${labId}`,
        { cookie: studentCookie },
      );
      assert.equal(studentLesson.status, 200);
      const studentContent = JSON.stringify(studentLesson.body.lesson.content);
      assert.ok(!studentContent.includes('"solution"'));

      const labUrl = `/courses/${courseId}/lessons/${labId}/activities/correo/check`;

      // Respuesta incompleta: falta un elemento sospechoso.
      const incomplete = await requestJson<ActivityCheckResponse>(labUrl, {
        cookie: studentCookie,
        method: 'POST',
        body: {
          answer: {
            elementIds: ['remitente', 'asunto', 'credenciales', 'enlace'],
          },
        },
      });
      assert.equal(incomplete.status, 200);
      assert.equal(incomplete.body.correct, false);

      // Respuesta errónea: incluye elementos legítimos.
      const withLegitimate = await requestJson<ActivityCheckResponse>(labUrl, {
        cookie: studentCookie,
        method: 'POST',
        body: {
          answer: {
            elementIds: [
              'remitente',
              'asunto',
              'credenciales',
              'enlace',
              'firma',
              'saludo',
            ],
          },
        },
      });
      assert.equal(withLegitimate.status, 200);
      assert.equal(withLegitimate.body.correct, false);

      // Respuesta correcta exacta.
      const correct = await requestJson<ActivityCheckResponse>(labUrl, {
        cookie: studentCookie,
        method: 'POST',
        body: {
          answer: {
            elementIds: [
              'remitente',
              'asunto',
              'credenciales',
              'enlace',
              'firma',
            ],
          },
        },
      });
      assert.equal(correct.status, 200);
      assert.equal(correct.body.correct, true);

      // El laboratorio no se finaliza sin la actividad del correo.
      const blockedFinalize = await requestJson<ApiErrorResponse>(
        `/courses/${courseId}/lessons/${labId}/finalize`,
        {
          cookie: studentCookie,
          method: 'POST',
          body: { answers: { choice: { optionId: 'b' } } },
        },
      );
      assert.equal(blockedFinalize.status, 422);
      assert.equal(blockedFinalize.body.error.code, 'LAB_NOT_COMPLETED');

      const finalized = await requestJson<CompletionResponse>(
        `/courses/${courseId}/lessons/${labId}/finalize`,
        {
          cookie: studentCookie,
          method: 'POST',
          body: {
            answers: {
              choice: { optionId: 'b' },
              correo: {
                elementIds: [
                  'remitente',
                  'asunto',
                  'credenciales',
                  'enlace',
                  'firma',
                ],
              },
            },
          },
        },
      );
      assert.equal(finalized.status, 200);
      assert.equal(finalized.body.progress.percentage, 100);
    } finally {
      if (server) {
        await new Promise<void>((resolve) => {
          server?.close(() => resolve());
        });
      }

      if (studentId !== null) {
        await db.orm.public.LessonProgress.where({ userId: studentId }).deleteAll();
      }

      if (courseId !== null) {
        const modules = await db.orm.public.Module.where({ courseId }).all();
        const moduleIds = modules.map((module) => module.id);

        if (moduleIds.length > 0) {
          await db.orm.public.Lesson
            .where((lesson) => lesson.moduleId.in(moduleIds))
            .deleteAll();
        }

        await db.orm.public.Module.where({ courseId }).deleteAll();
        await db.orm.public.Course.where({ id: courseId }).deleteAll();
      }

      const adminUserCleanup = await db.orm.public.User
        .where({ email: emailAdminEmail })
        .first();
      const studentUserCleanup = await db.orm.public.User
        .where({ email: emailStudentEmail })
        .first();

      if (adminUserCleanup) {
        await db.orm.public.UserAchievement
          .where({ userId: (adminUserCleanup as unknown as { id: number }).id })
          .deleteAll();
      }

      if (studentUserCleanup) {
        await db.orm.public.UserAchievement
          .where({ userId: (studentUserCleanup as unknown as { id: number }).id })
          .deleteAll();
      }

      await db.orm.public.User.where({ email: emailAdminEmail }).deleteAll();
      await db.orm.public.User.where({ email: emailStudentEmail }).deleteAll();
      await db.close();
    }
  },
);
