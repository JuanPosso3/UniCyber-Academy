import assert from 'node:assert/strict';
import test from 'node:test';
import type { AddressInfo } from 'node:net';
import { createApp } from '../src/app.js';
import { db } from '../src/prisma/db.js';
import { hashPassword } from '../src/infrastructure/security/password.js';
import {
  ACHIEVEMENT_RULES,
  evaluateEligibleAchievements,
  type GamificationContext,
} from '../src/domain/gamification.js';

const TEST_PASSWORD = 'ClaveSegura123';
const marker = `prueba-gamificacion-${Date.now()}`;
const adminEmail = `${marker}-admin@example.com`;
const studentEmail = `${marker}-student@example.com`;

interface CollectionResponse {
  courseMedals: Array<{ code: string; name: string; earned: boolean }>;
  learningRanks: Array<{ code: string; name: string; earned: boolean }>;
  complementary: Array<{ code: string; name: string; earned: boolean }>;
}

interface SummaryResponse {
  completedCourses: number;
  totalCourses: number;
  earnedMedals: number;
  totalMedals: number;
  currentRank: string | null;
  nextAchievement: string | null;
  pendingNotifications: number;
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
    body: options.body === undefined ? undefined : JSON.stringify(options.body),
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
        content: 'Contenido de prueba de gamificación',
        level: 2,
      },
      {
        id: 'parrafo',
        type: 'paragraph',
        content: 'Contenido teórico de prueba.',
      },
    ],
  };
}

function laboratoryContent() {
  return {
    schemaVersion: 1,
    introduction: 'Introducción de prueba.',
    objective: 'Practicar.',
    scenario: 'Escenario de prueba.',
    activities: [
      {
        id: 'eleccion',
        type: 'SINGLE_CHOICE',
        title: 'Elección de prueba',
        instructions: 'Selecciona la correcta.',
        required: true,
        options: [
          { id: 'a', text: 'Incorrecta' },
          { id: 'b', text: 'Correcta' },
        ],
        solution: { optionId: 'b' },
      },
    ],
    completion: { requiredActivityIds: ['eleccion'] },
  };
}

function assessmentQuestions(): unknown {
  const questions: Array<{
    statement: string;
    type: 'MULTIPLE_CHOICE' | 'TRUE_FALSE';
    explanation: string;
    hint: string;
    options: Array<{ text: string; isCorrect: boolean }>;
  }> = [];

  for (let i = 0; i < 4; i += 1) {
    questions.push({
      statement: `Pregunta múltiple de prueba ${i + 1}.`,
      type: 'MULTIPLE_CHOICE',
      explanation: `Explicación ${i + 1}.`,
      hint: `Pista ${i + 1}.`,
      options: ['A', 'B', 'C', 'D'].map((label, index) => ({
        text: `Opción ${label}.`,
        isCorrect: index === 0,
      })),
    });
  }

  for (let i = 0; i < 4; i += 1) {
    questions.push({
      statement: `Afirmación de prueba ${i + 1}.`,
      type: 'TRUE_FALSE',
      explanation: `Explicación ${i + 1}.`,
      hint: `Pista ${i + 1}.`,
      options: [
        { text: 'Verdadero', isCorrect: true },
        { text: 'Falso', isCorrect: false },
      ],
    });
  }

  return questions;
}

async function createCourseWithContent(
  cookie: string,
  courseTitle: string,
  isLaboratory: boolean,
): Promise<{
  courseId: number;
  lessonId: number;
  assessmentId: number;
  moduleId: number;
  isLaboratory: boolean;
}> {
  const course = await requestJson<{ course: { id: number } }>(
    '/admin/courses',
    { cookie, method: 'POST', body: { title: courseTitle, description: null } },
  );
  assert.equal(course.status, 201);
  const courseId = course.body.course.id;

  const module = await requestJson<{ module: { id: number } }>(
    `/admin/courses/${courseId}/modules`,
    { cookie, method: 'POST', body: { title: 'Módulo', description: null } },
  );
  assert.equal(module.status, 201);
  const moduleId = module.body.module.id;

  const lessonType = isLaboratory ? 'LABORATORY' : 'THEORY';
  const lessonContent = isLaboratory ? laboratoryContent() : theoryContent();
  const createdLesson = await requestJson<{ lesson: { id: number } }>(
    `/admin/courses/${courseId}/modules/${moduleId}/lessons`,
    {
      cookie,
      method: 'POST',
      body: {
        title: isLaboratory ? 'Laboratorio de prueba' : 'Lección de prueba',
        type: lessonType,
        content: lessonContent,
      },
    },
  );
  assert.equal(createdLesson.status, 201);
  const lessonId = createdLesson.body.lesson.id;

  const createdAssessment = await requestJson<{
    assessment: { id: number };
  }>(`/admin/courses/${courseId}/assessment`, {
    cookie,
    method: 'POST',
    body: {
      title: 'Evaluación final',
      description: null,
      questions: assessmentQuestions(),
    },
  });
  assert.equal(createdAssessment.status, 201);
  const assessmentId = createdAssessment.body.assessment.id;

  await requestJson(
    `/admin/courses/${courseId}/status`,
    { cookie, method: 'PATCH', body: { status: 'ACTIVE' } },
  );
  await requestJson(
    `/admin/courses/${courseId}/modules/${moduleId}/status`,
    { cookie, method: 'PATCH', body: { status: 'ACTIVE' } },
  );
  await requestJson(
    `/admin/courses/${courseId}/modules/${moduleId}/lessons/${lessonId}/status`,
    { cookie, method: 'PATCH', body: { status: 'ACTIVE' } },
  );
  await requestJson(
    `/admin/courses/${courseId}/assessment/status`,
    { cookie, method: 'PATCH', body: { status: 'ACTIVE' } },
  );

  return {
    courseId,
    lessonId,
    assessmentId,
    moduleId,
    isLaboratory,
  };
}

async function completeLesson(
  cookie: string,
  courseId: number,
  lessonId: number,
  isLaboratory: boolean,
): Promise<void> {
  if (isLaboratory) {
    const response = await requestJson(
      `/courses/${courseId}/lessons/${lessonId}/finalize`,
      {
        cookie,
        method: 'POST',
        body: { answers: { eleccion: { optionId: 'b' } } },
      },
    );
    if (response.status !== 200) {
      // eslint-disable-next-line no-console
      console.log('DEBUG finalize error:', JSON.stringify(response.body));
    }
    assert.equal(response.status, 200);
  } else {
    const response = await requestJson(
      `/courses/${courseId}/lessons/${lessonId}/complete`,
      { cookie, method: 'POST' },
    );
    if (response.status !== 200) {
      // eslint-disable-next-line no-console
      console.log('DEBUG complete error:', JSON.stringify(response.body));
    }
    assert.equal(response.status, 200);
  }
}

async function passAssessment(
  cookie: string,
  courseId: number,
  assessmentId: number,
): Promise<void> {
  const assessment = await requestJson<{
    assessment: { questions: Array<{ id: number; options: Array<{ id: number }> }> };
  }>(`/courses/${courseId}/assessment`, { cookie });
  assert.equal(assessment.status, 200);

  const questions = assessment.body.assessment.questions;
  const answers = questions.map((question) => ({
    questionId: question.id,
    answerOptionId: question.options[0]!.id,
  }));

  const submit = await requestJson(
    `/courses/${courseId}/assessment/submit`,
    { cookie, method: 'POST', body: { answers } },
  );
  assert.equal(submit.status, 200);
}

async function getCollection(
  cookie: string,
): Promise<CollectionResponse> {
  const response = await requestJson<CollectionResponse>(
    '/achievements/collection',
    { cookie },
  );
  assert.equal(response.status, 200);
  return response.body;
}

async function getSummary(cookie: string): Promise<SummaryResponse> {
  const response = await requestJson<SummaryResponse>(
    '/achievements/summary',
    { cookie },
  );
  assert.equal(response.status, 200);
  return response.body;
}

function earnedCodes(collection: CollectionResponse): string[] {
  return [
    ...collection.courseMedals.filter((m) => m.earned).map((m) => m.code),
    ...collection.learningRanks.filter((r) => r.earned).map((r) => r.code),
    ...collection.complementary.filter((c) => c.earned).map((c) => c.code),
  ];
}

/* -------------------------------------------------------------------------- */
/* Prueba de integración: eventos académicos desbloquean logros.              */
/* -------------------------------------------------------------------------- */

test(
  'gamificación: desbloqueo automático al completar lección, módulo, laboratorio y cursos',
  { timeout: 120000 },
  async () => {
    let server: ReturnType<ReturnType<typeof createApp>['listen']> | null =
      null;

    let courses: Array<{
      courseId: number;
      lessonId: number;
      assessmentId: number;
      moduleId: number;
      isLaboratory: boolean;
    }> = [];

    await db.orm.public.User.create({
      firstName: 'Admin',
      lastName: 'Gamificación',
      email: adminEmail,
      passwordHash: await hashPassword(TEST_PASSWORD),
      role: 'ADMINISTRATIVE',
      status: 'ACTIVE',
    });
    await db.orm.public.User.create({
      firstName: 'Estudiante',
      lastName: 'Gamificación',
      email: studentEmail,
      passwordHash: await hashPassword(TEST_PASSWORD),
      role: 'STUDENT',
      status: 'ACTIVE',
    });

    try {
      const app = createApp();
      server = app.listen(0);
      const address = server!.address() as AddressInfo;
      baseUrl = `http://127.0.0.1:${address.port}/api`;

      const adminCookie = await login(adminEmail);
      const studentCookie = await login(studentEmail);

      // Cinco cursos con una lección y evaluación cada uno (el último es laboratorio).
      courses = await Promise.all(
        [1, 2, 3, 4, 5].map((index) =>
          createCourseWithContent(
            adminCookie,
            `Curso ${index} de gamificación ${marker}`,
            index === 4,
          ),
        ),
      );

      // Estado inicial: sin logros.
      const initial = await getCollection(studentCookie);
      const allInitial = [
        ...initial.courseMedals,
        ...initial.learningRanks,
        ...initial.complementary,
      ];
      assert.equal(
        allInitial.filter((item) => item.earned).length,
        0,
        'No debe haber logros ganados al inicio',
      );

      // Para cada curso: completar su lección y aprobar su evaluación.
      for (let index = 0; index < courses.length; index += 1) {
        const course = courses[index];
        await completeLesson(
          studentCookie,
          course.courseId,
          course.lessonId,
          course.isLaboratory,
        );
        await passAssessment(studentCookie, course.courseId, course.assessmentId);

        const completedCourses = index + 1;

        if (completedCourses === 1) {
          const codes = earnedCodes(await getCollection(studentCookie));
          assert.ok(
            codes.includes('FIRST_STEPS'),
            'FIRST_STEPS debe otorgarse',
          );
          assert.ok(
            codes.includes('FIRST_MODULE_COMPLETED'),
            'FIRST_MODULE_COMPLETED debe otorgarse',
          );
        }

        if (completedCourses === 2) {
          assert.ok(
            earnedCodes(await getCollection(studentCookie)).includes(
              'BASIC_LEARNER',
            ),
            'BASIC_LEARNER debe otorgarse al completar 2 cursos',
          );
        }

        if (completedCourses === 3) {
          assert.ok(
            earnedCodes(await getCollection(studentCookie)).includes(
              'INTERMEDIATE_LEARNER',
            ),
            'INTERMEDIATE_LEARNER debe otorgarse al completar 3 cursos',
          );
        }

        if (completedCourses === 5) {
          assert.ok(
            earnedCodes(await getCollection(studentCookie)).includes(
              'FIRST_LAB_COMPLETED',
            ),
            'FIRST_LAB_COMPLETED debe otorgarse',
          );
          assert.ok(
            earnedCodes(await getCollection(studentCookie)).includes(
              'ADVANCED_LEARNER',
            ),
            'ADVANCED_LEARNER debe otorgarse al completar 5 cursos',
          );
        }
      }

      const collection = await getCollection(studentCookie);
      const codes = earnedCodes(collection);
      assert.equal(
        collection.courseMedals.filter((m) => m.earned).length,
        0,
        'No hay medallas de curso reales con títulos propios de prueba',
      );
      assert.equal(
        codes.filter((c) => c === 'UNICYBER_EXPERT').length,
        0,
        'UNICYBER_EXPERT no debe otorgarse sin las 5 medallas de curso reales',
      );

      // Resumen del panel.
      const summary = await getSummary(studentCookie);
      assert.equal(summary.completedCourses, 5);
      assert.equal(summary.currentRank, 'Aprendiz avanzado');

      // No se crean duplicados al repetir acciones ya realizadas.
      await completeLesson(
        studentCookie,
        courses[0].courseId,
        courses[0].lessonId,
        false,
      );
      await passAssessment(
        studentCookie,
        courses[0].courseId,
        courses[0].assessmentId,
      );
      const collectionAgain = await getCollection(studentCookie);
      const codesAgain = earnedCodes(collectionAgain);
      assert.equal(
        codesAgain.filter((c) => c === 'BASIC_LEARNER').length,
        1,
        'No debe haber duplicados de BASIC_LEARNER',
      );

      // Notificaciones pendientes.
      const pending = await requestJson<{ notifications: unknown[] }>(
        '/achievements/notifications/pending',
        { cookie: studentCookie },
      );
      assert.equal(pending.status, 200);
    } finally {
      if (server) {
        await new Promise<void>((resolve) => {
          server?.close(() => resolve());
        });
      }

      // Limpiar el contenido académico creado en esta prueba.
      for (const course of courses) {
        const questions = await db.orm.public.Question
          .where({ assessmentId: course.assessmentId })
          .all();

        const questionIds = questions.map(
          (rawQuestion) =>
            (rawQuestion as unknown as { id: number }).id,
        );

        if (questionIds.length > 0) {
          await db.orm.public.QuestionResponse
            .where((response) => response.questionId.in(questionIds))
            .deleteAll();
        }

        for (const rawQuestion of questions) {
          await db.orm.public.AnswerOption
            .where({
              questionId: (rawQuestion as unknown as { id: number }).id,
            })
            .deleteAll();
        }

        await db.orm.public.LessonProgress
          .where({ lessonId: course.lessonId })
          .deleteAll();
        await db.orm.public.Question
          .where({ assessmentId: course.assessmentId })
          .deleteAll();
        await db.orm.public.AssessmentAttempt
          .where({ assessmentId: course.assessmentId })
          .deleteAll();
        await db.orm.public.Assessment
          .where({ id: course.assessmentId })
          .deleteAll();
        await db.orm.public.Lesson.where({ id: course.lessonId }).deleteAll();
        await db.orm.public.Module.where({ id: course.moduleId }).deleteAll();
        await db.orm.public.Course
          .where({ id: course.courseId })
          .deleteAll();
      }

      const adminUser = await db.orm.public.User
        .where({ email: adminEmail })
        .first();
      const studentUser = await db.orm.public.User
        .where({ email: studentEmail })
        .first();

      if (adminUser) {
        await db.orm.public.UserAchievement
          .where({ userId: (adminUser as unknown as { id: number }).id })
          .deleteAll();
      }

      if (studentUser) {
        await db.orm.public.UserAchievement
          .where({ userId: (studentUser as unknown as { id: number }).id })
          .deleteAll();

        const studentAttempts = await db.orm.public.AssessmentAttempt
          .where({ userId: (studentUser as unknown as { id: number }).id })
          .all();

        for (const rawAttempt of studentAttempts) {
          await db.orm.public.QuestionResponse
            .where({
              attemptId: (rawAttempt as unknown as { id: number }).id,
            })
            .deleteAll();
        }

        await db.orm.public.AssessmentAttempt
          .where({ userId: (studentUser as unknown as { id: number }).id })
          .deleteAll();
      }

      await db.orm.public.User.where({ email: adminEmail }).deleteAll();
      await db.orm.public.User.where({ email: studentEmail }).deleteAll();
      await db.close();
    }
  },
);

/* -------------------------------------------------------------------------- */
/* Prueba de unidad del dominio: medallas, Coleccionista y Experto.           */
/* -------------------------------------------------------------------------- */

test(
  'gamificación (dominio): elegibilidad de medallas de curso, Coleccionista y Experto',
  async () => {
    const earnedCodes = new Set<string>();

    const context = (overrides: Partial<GamificationContext>): GamificationContext => ({
      completedCourseIds: [1, 2, 3, 4, 5],
      courseIdToMedalCode: new Map([
        [1, 'PHISHING_COURSE_COMPLETED'],
        [2, 'PASSWORDS_COURSE_COMPLETED'],
        [3, 'INCIDENT_RESPONSE_COURSE_COMPLETED'],
        [4, 'WIFI_SECURITY_COURSE_COMPLETED'],
        [5, 'EMERGING_THREATS_COURSE_COMPLETED'],
      ]),
      earnedAchievementCodes: earnedCodes,
      hasCompletedLesson: true,
      hasCompletedModule: true,
      hasCompletedLaboratory: true,
      ...overrides,
    });

    const medalCodes = [
      'PHISHING_COURSE_COMPLETED',
      'PASSWORDS_COURSE_COMPLETED',
      'INCIDENT_RESPONSE_COURSE_COMPLETED',
      'WIFI_SECURITY_COURSE_COMPLETED',
      'EMERGING_THREATS_COURSE_COMPLETED',
    ];

    // Sin nada ganado: las medallas de cursos completados y los rangos son elegibles.
    let eligible = evaluateEligibleAchievements(
      ACHIEVEMENT_RULES,
      context({}),
    );

    for (const code of medalCodes) {
      assert.ok(eligible.includes(code), `${code} debe ser elegible`);
    }

    assert.ok(eligible.includes('BASIC_LEARNER'));
    assert.ok(eligible.includes('INTERMEDIATE_LEARNER'));
    assert.ok(eligible.includes('ADVANCED_LEARNER'));

    assert.ok(
      !eligible.includes('COURSE_MEDAL_COLLECTOR'),
      'COURSE_MEDAL_COLLECTOR no debe ser elegible sin medallas ganadas',
    );
    assert.ok(
      !eligible.includes('UNICYBER_EXPERT'),
      'UNICYBER_EXPERT no debe ser elegible sin rangos y logros complementarios',
    );

    // Tras ganar las 5 medallas → COURSE_MEDAL_COLLECTOR elegible.
    for (const code of medalCodes) {
      earnedCodes.add(code);
    }

    eligible = evaluateEligibleAchievements(ACHIEVEMENT_RULES, context({}));
    assert.ok(
      eligible.includes('COURSE_MEDAL_COLLECTOR'),
      'COURSE_MEDAL_COLLECTOR debe ser elegible con las 5 medallas',
    );
    assert.ok(
      !eligible.includes('UNICYBER_EXPERT'),
      'UNICYBER_EXPERT no debe ser elegible sin rangos y logros complementarios',
    );

    // Tras ganar los 3 rangos y los 3 complementarios previos → UNICYBER_EXPERT elegible.
    for (const code of ['BASIC_LEARNER', 'INTERMEDIATE_LEARNER', 'ADVANCED_LEARNER']) {
      earnedCodes.add(code);
    }
    for (const code of ['FIRST_STEPS', 'FIRST_MODULE_COMPLETED', 'FIRST_LAB_COMPLETED']) {
      earnedCodes.add(code);
    }

    eligible = evaluateEligibleAchievements(ACHIEVEMENT_RULES, context({}));
    assert.ok(
      eligible.includes('UNICYBER_EXPERT'),
      'UNICYBER_EXPERT debe ser elegible al cumplir todas las condiciones',
    );
  },
);
