import assert from 'node:assert/strict';
import test from 'node:test';
import type { AddressInfo } from 'node:net';
import { createApp } from '../src/app.js';
import { db } from '../src/prisma/db.js';
import { hashPassword } from '../src/infrastructure/security/password.js';

const TEST_PASSWORD = 'ClaveSegura123';
const marker = `prueba-evaluaciones-${Date.now()}`;
const adminEmail = `${marker}-admin@example.com`;
const studentEmail = `${marker}-student@example.com`;

interface ApiErrorResponse {
  error: {
    code: string;
    message?: string;
  };
}

interface LessonCreateResponse {
  lesson: { id: number };
}

interface AssessmentQuestionPayload {
  statement: string;
  type: 'MULTIPLE_CHOICE' | 'TRUE_FALSE';
  explanation: string;
  hint: string;
  options: Array<{ text: string; isCorrect: boolean }>;
}

interface StudentQuestionView {
  id: number;
  order: number;
  statement: string;
  type: 'MULTIPLE_CHOICE' | 'TRUE_FALSE';
  options: Array<{ id: number; order: number; text: string }>;
}

interface StudentAssessmentView {
  course: { id: number; title: string };
  assessment: {
    id: number;
    title: string;
    questions: StudentQuestionView[];
  } | null;
  eligibility: {
    available: boolean;
    reason: string | null;
    remainingLessons: Array<{ lessonId: number; lessonTitle: string }>;
  };
  attempt: {
    score: number;
    correctAnswers: number;
    incorrectAnswers: number;
    passed: boolean;
    completedAt: string;
  } | null;
  progress: { completedLessons: number; totalLessons: number; percentage: number };
}

interface AttemptResults {
  results: {
    attempt: StudentAssessmentView['attempt'];
    questions: Array<{
      questionId: number;
      answeredCorrectly: boolean;
      selectedOptionText: string | null;
      explanation: string | null;
      hint: string | null;
    }>;
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
        content: 'Contenido de prueba de evaluación',
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

function buildAssessmentPayload(): {
  title: string;
  description: string;
  questions: AssessmentQuestionPayload[];
} {
  const questions: AssessmentQuestionPayload[] = [];

  for (let index = 0; index < 4; index += 1) {
    const correctIndex = (index + 1) % 4;
    const options = ['A', 'B', 'C', 'D'].map((label, optionIndex) => ({
      text: `Opción ${label} de la pregunta de prueba ${index + 1}.`,
      isCorrect: optionIndex === correctIndex,
    }));

    questions.push({
      statement: `Pregunta de selección múltiple de prueba número ${index + 1}.`,
      type: 'MULTIPLE_CHOICE',
      explanation: `Explicación de la pregunta de prueba ${index + 1}.`,
      hint: `Orientación de la pregunta de prueba ${index + 1}.`,
      options,
    });
  }

  for (let index = 0; index < 4; index += 1) {
    const correctIsTrue = index % 2 === 0;

    questions.push({
      statement: `Afirmación de verdadero o falso de prueba número ${index + 1}.`,
      type: 'TRUE_FALSE',
      explanation: `Explicación de la afirmación de prueba ${index + 1}.`,
      hint: `Orientación de la afirmación de prueba ${index + 1}.`,
      options: [
        { text: 'Verdadero', isCorrect: correctIsTrue },
        { text: 'Falso', isCorrect: !correctIsTrue },
      ],
    });
  }

  return {
    title: 'Evaluación final de prueba',
    description: 'Evaluación final configurada para la prueba automatizada.',
    questions,
  };
}

test(
  'flujo de la evaluación final del curso',
  { timeout: 60000 },
  async () => {
    let server: ReturnType<typeof createApp>['listen'] extends (
      ...args: never[]
    ) => never
      ? never
      : ReturnType<ReturnType<typeof createApp>['listen']> | null = null;

    await db.orm.public.User.create({
      firstName: 'Admin',
      lastName: 'De evaluaciones',
      email: adminEmail,
      passwordHash: await hashPassword(TEST_PASSWORD),
      role: 'ADMINISTRATIVE',
      status: 'ACTIVE',
    });
    await db.orm.public.User.create({
      firstName: 'Estudiante',
      lastName: 'De evaluaciones',
      email: studentEmail,
      passwordHash: await hashPassword(TEST_PASSWORD),
      role: 'STUDENT',
      status: 'ACTIVE',
    });

    let courseId: number | null = null;
    let assessmentId: number | null = null;

    try {
      const app = createApp();
      server = app.listen(0);
      const address = server.address() as AddressInfo;
      baseUrl = `http://127.0.0.1:${address.port}/api`;

      const adminCookie = await login(adminEmail);
      const studentCookie = await login(studentEmail);

      const courseResponse = await requestJson<{ course: { id: number } }>(
        '/admin/courses',
        {
          cookie: adminCookie,
          method: 'POST',
          body: {
            title: `Curso de evaluaciones ${marker}`,
            description: null,
          },
        },
      );
      assert.equal(courseResponse.status, 201);
      courseId = courseResponse.body.course.id;

      const moduleResponse = await requestJson<{ module: { id: number } }>(
        `/admin/courses/${courseId}/modules`,
        {
          cookie: adminCookie,
          method: 'POST',
          body: { title: 'Módulo de prueba', description: null },
        },
      );
      assert.equal(moduleResponse.status, 201);
      const moduleId = moduleResponse.body.module.id;

      const lessonIds: number[] = [];
      let createdLesson: { status: number; body: LessonCreateResponse } | null = null;

      for (let index = 0; index < 2; index += 1) {
        createdLesson = await requestJson<LessonCreateResponse>(
          `/admin/courses/${courseId}/modules/${moduleId}/lessons`,
          {
            cookie: adminCookie,
            method: 'POST',
            body: {
              title: `Lección teórica ${index + 1}`,
              type: 'THEORY',
              content: theoryContent(),
            },
          },
        );
        assert.equal(createdLesson!.status, 201);
        lessonIds.push(createdLesson!.body.lesson.id);
      }

      const publishCourse = await requestJson<unknown>(
        `/admin/courses/${courseId}/status`,
        {
          cookie: adminCookie,
          method: 'PATCH',
          body: { status: 'ACTIVE' },
        },
      );
      assert.equal(publishCourse.status, 200);

      const publishModule = await requestJson<unknown>(
        `/admin/courses/${courseId}/modules/${moduleId}/status`,
        {
          cookie: adminCookie,
          method: 'PATCH',
          body: { status: 'ACTIVE' },
        },
      );
      assert.equal(publishModule.status, 200);

      for (const lessonId of lessonIds) {
        let publishLesson: { status: number; body: unknown } | null = null;
        publishLesson = await requestJson<unknown>(
          `/admin/courses/${courseId}/modules/${moduleId}/lessons/${lessonId}/status`,
          {
            cookie: adminCookie,
            method: 'PATCH',
            body: { status: 'ACTIVE' },
          },
        );
        assert.equal(publishLesson!.status, 200);
      }

      const wrongCount = buildAssessmentPayload();
      wrongCount.questions = wrongCount.questions.slice(0, 7);

      const invalidCount = await requestJson<ApiErrorResponse>(
        `/admin/courses/${courseId}/assessment`,
        {
          cookie: adminCookie,
          method: 'POST',
          body: wrongCount,
        },
      );
      assert.equal(invalidCount.status, 400);
      assert.equal(invalidCount.body.error.code, 'ASSESSMENT_CONTENT_INVALID');

      const created = await requestJson<{
        assessment: { id: number; status: string; complete: boolean; questionCount: number };
      }>(`/admin/courses/${courseId}/assessment`, {
        cookie: adminCookie,
        method: 'POST',
        body: buildAssessmentPayload(),
      });
      assert.equal(created.status, 201);
      assert.equal(created.body.assessment.complete, true);
      assert.equal(created.body.assessment.questionCount, 8);
      assert.equal(created.body.assessment.status, 'DRAFT');
      assessmentId = created.body.assessment.id;

      const duplicated = await requestJson<ApiErrorResponse>(
        `/admin/courses/${courseId}/assessment`,
        {
          cookie: adminCookie,
          method: 'POST',
          body: buildAssessmentPayload(),
        },
      );
      assert.equal(duplicated.status, 409);
      assert.equal(
        duplicated.body.error.code,
        'ASSESSMENT_ALREADY_EXISTS',
      );

      const beforePublish = await requestJson<StudentAssessmentView>(
        `/courses/${courseId}/assessment`,
        { cookie: studentCookie },
      );
      assert.equal(beforePublish.status, 200);
      assert.equal(beforePublish.body.assessment, null);

      const publishAssessment = await requestJson<{
        assessment: { status: string };
      }>(`/admin/courses/${courseId}/assessment/status`, {
        cookie: adminCookie,
        method: 'PATCH',
        body: { status: 'ACTIVE' },
      });
      assert.equal(publishAssessment.status, 200);
      assert.equal(publishAssessment.body.assessment.status, 'ACTIVE');

      const lessonsPending = await requestJson<StudentAssessmentView>(
        `/courses/${courseId}/assessment`,
        { cookie: studentCookie },
      );
      assert.equal(lessonsPending.status, 200);
      assert.equal(lessonsPending.body.eligibility.available, false);
      assert.equal(
        lessonsPending.body.eligibility.remainingLessons.length,
        2,
      );

      const submitPending = await requestJson<ApiErrorResponse>(
        `/courses/${courseId}/assessment/submit`,
        {
          cookie: studentCookie,
          method: 'POST',
          body: { answers: [] },
        },
      );
      assert.equal(submitPending.status, 403);
      assert.equal(
        submitPending.body.error.code,
        'ASSESSMENT_NOT_AVAILABLE',
      );

      for (const lessonId of lessonIds) {
        let completeLesson: { status: number; body: unknown } | null = null;
        completeLesson = await requestJson<unknown>(
          `/courses/${courseId}/lessons/${lessonId}/complete`,
          { cookie: studentCookie, method: 'POST' },
        );
        assert.equal(completeLesson!.status, 200);
      }

      const eligible = await requestJson<StudentAssessmentView>(
        `/courses/${courseId}/assessment`,
        { cookie: studentCookie },
      );
      assert.equal(eligible.status, 200);
      assert.notEqual(eligible.body.assessment, null);

      const assessmentQuestions = eligible.body.assessment!.questions;
      assert.equal(assessmentQuestions.length, 8);
      assert.equal(eligible.body.eligibility.available, true);

      assert.equal(
        JSON.stringify(assessmentQuestions).includes('isCorrect'),
        false,
      );
      assert.equal(
        JSON.stringify(assessmentQuestions).includes('explanation'),
        false,
      );

      // Intento fallido: 6 de 8 correctas no aprueba (75 %).
      const payload = buildAssessmentPayload();
      const correctOptions = payload.questions.map((question) => {
        const correctIndex = question.options.findIndex(
          (option) => option.isCorrect,
        );

        return correctIndex === -1 ? 0 : correctIndex;
      });

      const wrongAnswers = assessmentQuestions.map((question, index) => ({
        questionId: question.id,
        answerOptionId: index < 6
          ? question.options[correctOptions[index]!]!.id
          : question.options[(correctOptions[index]! + 1) % question.options.length]!.id,
      }));

      const failingAttempt = await requestJson<AttemptResults>(
        `/courses/${courseId}/assessment/submit`,
        {
          cookie: studentCookie,
          method: 'POST',
          body: { answers: wrongAnswers },
        },
      );
      assert.equal(failingAttempt.status, 200);
      assert.equal(failingAttempt.body.results.attempt!.correctAnswers, 6);
      assert.equal(failingAttempt.body.results.attempt!.score, 75);
      assert.equal(failingAttempt.body.results.attempt!.passed, false);
      assert.equal(
        failingAttempt.body.results.questions.filter(
          (review) => review.answeredCorrectly,
        ).length,
        6,
      );
      assert.ok(
        failingAttempt.body.results.questions.every(
          (review) => review.answeredCorrectly || review.explanation === null,
        ),
      );

      // Retake ilimitado: segundo intento con 8 de 8 correctas.
      const passingAnswers = assessmentQuestions.map((question, index) => ({
        questionId: question.id,
        answerOptionId: question.options[correctOptions[index]!]!.id,
      }));

      const passingAttempt = await requestJson<AttemptResults>(
        `/courses/${courseId}/assessment/submit`,
        {
          cookie: studentCookie,
          method: 'POST',
          body: { answers: passingAnswers },
        },
      );
      assert.equal(passingAttempt.status, 200);
      assert.equal(passingAttempt.body.results.attempt!.correctAnswers, 8);
      assert.equal(passingAttempt.body.results.attempt!.score, 100);
      assert.equal(passingAttempt.body.results.attempt!.passed, true);
      assert.ok(
        passingAttempt.body.results.questions.every(
          (review) => review.answeredCorrectly && review.explanation !== null,
        ),
      );

      const storedResults = await requestJson<{ attempt: { passed: boolean } | null; questions: unknown[] }>(
        `/courses/${courseId}/assessment/results`,
        { cookie: studentCookie },
      );
      assert.equal(storedResults.status, 200);
      assert.equal(storedResults.body.attempt!.passed, true);

      // Contexto cruzado: una opción correcta de otra pregunta se rechaza.
      const crossAnswer = {
        questionId: assessmentQuestions[0]!.id,
        answerOptionId: passingAnswers[1]!.answerOptionId,
      };

      const crossAttempt = await requestJson<ApiErrorResponse>(
        `/courses/${courseId}/assessment/submit`,
        {
          cookie: studentCookie,
          method: 'POST',
          body: {
            answers: [
              { ...passingAnswers[0]! },
              crossAnswer,
              ...passingAnswers.slice(2),
            ],
          },
        },
      );
      assert.equal(crossAttempt.status, 400);
      assert.equal(crossAttempt.body.error.code, 'INVALID_ANSWER');

      // Con intentos registrados, el contenido queda protegido.
      const blockedReplace = await requestJson<ApiErrorResponse>(
        `/admin/courses/${courseId}/assessment/questions`,
        {
          cookie: adminCookie,
          method: 'PUT',
          body: buildAssessmentPayload(),
        },
      );
      assert.equal(blockedReplace.status, 409);
      assert.equal(
        blockedReplace.body.error.code,
        'ASSESSMENT_HAS_ATTEMPTS',
      );

      // El estudiante no puede administrar evaluaciones.
      const forbidden = await requestJson<ApiErrorResponse>(
        `/admin/courses/${courseId}/assessment`,
        { cookie: studentCookie },
      );
      assert.equal(forbidden.status, 403);
    } finally {
      if (server) {
        await new Promise<void>((resolve) => {
          server?.close(() => resolve());
        });
      }

      if (assessmentId !== null) {
        const attempts = await db.orm.public.AssessmentAttempt
          .where({ assessmentId })
          .all();
        const attemptIds = attempts.map(
          (attempt) => (attempt as unknown as { id: number }).id,
        );

        if (attemptIds.length > 0) {
          await db.orm.public.QuestionResponse
            .where((response) => response.attemptId.in(attemptIds))
            .deleteAll();
        }

        await db.orm.public.AssessmentAttempt
          .where({ assessmentId })
          .deleteAll();

        const questions = await db.orm.public.Question
          .where({ assessmentId })
          .all();
        const questionIds = questions.map(
          (question) => (question as unknown as { id: number }).id,
        );

        if (questionIds.length > 0) {
          await db.orm.public.AnswerOption
            .where((option) => option.questionId.in(questionIds))
            .deleteAll();
        }

        await db.orm.public.Question.where({ assessmentId }).deleteAll();
        await db.orm.public.Assessment.where({ id: assessmentId }).deleteAll();
      }

      if (courseId !== null) {
        const modules = await db.orm.public.Module.where({ courseId }).all();
        const moduleIds = modules.map(
          (module) => (module as unknown as { id: number }).id,
        );

        if (moduleIds.length > 0) {
          const lessonIdsInCourse: number[] = [];

          for (const moduleId of moduleIds) {
            const lessons = await db.orm.public.Lesson
              .where({ moduleId })
              .all();

            for (const lesson of lessons) {
              lessonIdsInCourse.push(
                (lesson as unknown as { id: number }).id,
              );
            }
          }

          if (lessonIdsInCourse.length > 0) {
            await db.orm.public.LessonProgress
              .where((progress) => progress.lessonId.in(lessonIdsInCourse))
              .deleteAll();

            await db.orm.public.Lesson
              .where((lesson) => lesson.moduleId.in(moduleIds))
              .deleteAll();
          }
        }

        await db.orm.public.Module.where({ courseId }).deleteAll();
        await db.orm.public.Course.where({ id: courseId }).deleteAll();
      }

      await db.orm.public.User.where({ email: adminEmail }).deleteAll();
      await db.orm.public.User.where({ email: studentEmail }).deleteAll();

      await db.close();
    }
  },
);
