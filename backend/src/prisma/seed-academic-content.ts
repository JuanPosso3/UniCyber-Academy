import type { JsonValue } from '@prisma/orm-postgres/target/codec-types';
import { db } from './db.js';
import { validateAssessmentQuestions } from '../domain/assessment.js';
import { validateLessonContent } from '../domain/lesson-content.js';
import {
  ACADEMIC_COURSES,
  type AcademicCourse,
  type AcademicModule,
} from './academic-content.js';
import {
  ACADEMIC_FINAL_ASSESSMENTS,
  type FinalAssessmentSpec,
} from './academic-final-assessments.js';

const LAB_MODULE_TITLE = 'Laboratorio práctico del curso';

interface SeedSummary {
  coursesCreated: number;
  modulesCreated: number;
  lessonsCreated: number;
  assessmentsCreated: number;
  assessmentsUpdated: number;
  assessmentsRemoved: number;
  assessmentsLockedByAttempts: number;
  lessonsSkipped: number;
  lessonsUpdated: number;
  lessonsLockedByProgress: number;
}

async function validateAllContent(): Promise<void> {
  const errors: string[] = [];

  for (const course of ACADEMIC_COURSES) {
    for (const module of course.modules) {
      for (const lesson of module.lessons) {
        const result = validateLessonContent(lesson.type, lesson.content);

        if (!result.valid) {
          for (const issue of result.issues) {
            errors.push(
              `${course.title} / ${module.title} / ${lesson.title}: ${issue.path} ${issue.message}`,
            );
          }
        }
      }
    }
  }

  if (errors.length > 0) {
    throw new Error(
      `El contenido académico tiene errores de validación:\n${errors.join('\n')}`,
    );
  }
}

async function findOrCreateCourse(
  course: AcademicCourse,
  summary: SeedSummary,
) {
  const existing = await db.orm.public.Course
    .where({ title: course.title })
    .first();

  if (existing) {
    return existing;
  }

  const created = await db.orm.public.Course.create({
    title: course.title,
    description: course.description,
    status: 'DRAFT',
  });

  summary.coursesCreated += 1;
  return created;
}

async function findOrCreateModule(
  courseId: number,
  module: AcademicCourse['modules'][number],
  summary: SeedSummary,
) {
  const existing = await db.orm.public.Module
    .where({ courseId, title: module.title })
    .first();

  if (existing) {
    return existing;
  }

  const lastModule = await db.orm.public.Module
    .where({ courseId })
    .orderBy((item) => item.order.desc())
    .first();

  const created = await db.orm.public.Module.create({
    courseId,
    title: module.title,
    description: module.description,
    order: (lastModule?.order ?? 0) + 1,
    status: 'DRAFT',
  });

  summary.modulesCreated += 1;
  return created;
}

async function findOrCreateLesson(
  moduleId: number,
  lesson: AcademicCourse['modules'][number]['lessons'][number],
  summary: SeedSummary,
) {
  const existing = await db.orm.public.Lesson
    .where({ moduleId, title: lesson.title })
    .first();

  if (existing) {
    summary.lessonsSkipped += 1;
    await refreshExistingLesson(existing, lesson, summary);
    return existing;
  }

  const lastLesson = await db.orm.public.Lesson
    .where({ moduleId })
    .orderBy((item) => item.order.desc())
    .first();

  const created = await db.orm.public.Lesson.create({
    moduleId,
    title: lesson.title,
    type: lesson.type,
    order: (lastLesson?.order ?? 0) + 1,
    content: lesson.content as unknown as JsonValue,
    status: 'DRAFT',
  });

  summary.lessonsCreated += 1;
  return created;
}

/**
 * Sincroniza el contenido fuente con una lección existente.
 * Solo se actualiza si cambió el contenido y si ningún estudiante
 * registró progreso en ella; de lo contrario se conserva intacta.
 */
async function refreshExistingLesson(
  existing: { id: number; type: unknown; content: unknown },
  lesson: AcademicCourse['modules'][number]['lessons'][number],
  summary: SeedSummary,
): Promise<void> {
  const sameType = existing.type === lesson.type;
  const sameContent =
    JSON.stringify(existing.content) === JSON.stringify(lesson.content);

  if (sameType && sameContent) {
    return;
  }

  const anyProgress = await db.orm.public.LessonProgress
    .where({ lessonId: existing.id })
    .first();

  if (anyProgress) {
    summary.lessonsLockedByProgress += 1;
    return;
  }

  await db.orm.public.Lesson.where({ id: existing.id }).update({
    type: lesson.type,
    content: lesson.content as unknown as JsonValue,
  });

  summary.lessonsUpdated += 1;
}

/**
 * Elimina las evaluaciones de módulo del diseño antiguo: son
 * borradores sin preguntas ni intentos y ya no forman parte del flujo
 * de aprendizaje.
 */
async function removeStaleModuleAssessments(
  summary: SeedSummary,
): Promise<void> {
  const candidates = await db.orm.public.Assessment
    .where((assessment) => assessment.type.eq('MODULE'))
    .all();

  for (const rawAssessment of candidates) {
    const assessment = rawAssessment as unknown as { id: number };

    const questions = await db.orm.public.Question
      .where({ assessmentId: assessment.id })
      .all();
    const attempts = await db.orm.public.AssessmentAttempt
      .where({ assessmentId: assessment.id })
      .all();

    if (questions.length > 0 || attempts.length > 0) {
      continue;
    }

    await db.orm.public.Assessment
      .where({ id: assessment.id })
      .deleteAll();
    summary.assessmentsRemoved += 1;
  }
}

/**
 * Crea o sincroniza la evaluación final del curso académico.
 *
 * Las evaluaciones se crean completas y publicadas (ACTIVE), porque
 * el contenido de las preguntas ya fue validado académicamente
 * contra el contenido real del curso.
 */
async function ensureCourseFinalAssessment(
  courseId: number,
  spec: FinalAssessmentSpec,
  summary: SeedSummary,
): Promise<void> {
  const validation = validateAssessmentQuestions(spec.questions);

  if (!validation.valid) {
    throw new Error(
      `La evaluación final de "${spec.courseTitle}" no cumple los requisitos: ${validation.issues
        .map((issue) => issue.message)
        .join(' ')}`,
    );
  }

  const existing = await db.orm.public.Assessment
    .where({ courseId })
    .where((assessment) => assessment.type.eq('COURSE_FINAL'))
    .first();

  if (!existing) {
    await db.transaction(async (tx) => {
      const created = await tx.orm.public.Assessment.create({
        title: spec.title,
        description: spec.description,
        type: 'COURSE_FINAL',
        courseId,
        moduleId: null,
        status: 'ACTIVE',
      });

      const assessmentId = (created as unknown as { id: number }).id;
      let questionOrder = 0;

      for (const question of spec.questions) {
        questionOrder += 1;

        const createdQuestion = await tx.orm.public.Question.create({
          assessmentId,
          statement: question.statement,
          type: question.type,
          order: questionOrder,
          status: 'ACTIVE',
          explanation: question.explanation,
          hint: question.hint,
        });

        const questionId = (createdQuestion as unknown as { id: number }).id;
        let optionOrder = 0;

        for (const option of question.options) {
          optionOrder += 1;

          await tx.orm.public.AnswerOption.create({
            questionId,
            text: option.text,
            isCorrect: option.isCorrect,
            order: optionOrder,
          });
        }
      }
    });

    summary.assessmentsCreated += 1;

    return;
  }

  const assessment = existing as unknown as {
    id: number;
    title: string;
    description: string | null;
  };

  const sameMetadata =
    assessment.title === spec.title &&
    assessment.description === spec.description;

  const questions = await db.orm.public.Question
    .where({ assessmentId: assessment.id })
    .orderBy((question) => question.order.asc())
    .all();

  let sameQuestions = questions.length === spec.questions.length;

  const optionsByQuestionId = new Map<
    number,
    Array<{ text: string; isCorrect: boolean; order: number }>
  >();

  if (questions.length > 0) {
    const options = await db.orm.public.AnswerOption
      .where((option) =>
        option.questionId.in(
          questions.map((question) => (question as unknown as { id: number }).id),
        ),
      )
      .orderBy((option) => option.order.asc())
      .all();

    for (const rawOption of options) {
      const option = rawOption as unknown as {
        questionId: number;
        text: string;
        isCorrect: boolean;
        order: number;
      };
      const list = optionsByQuestionId.get(option.questionId) ?? [];
      list.push({
        text: option.text,
        isCorrect: option.isCorrect,
        order: option.order,
      });
      optionsByQuestionId.set(option.questionId, list);
    }
  }

  if (sameQuestions) {
    questions.forEach((rawQuestion, index) => {
      const question = rawQuestion as unknown as {
        statement: string;
        type: string;
        explanation: string | null;
        hint: string | null;
      };
      const specQuestion = spec.questions[index]!;
      const isSimilar =
        question.statement === specQuestion.statement &&
        question.type === specQuestion.type &&
        (question.explanation ?? '') === specQuestion.explanation &&
        (question.hint ?? '') === specQuestion.hint &&
        JSON.stringify(
          optionsByQuestionId.get(
            (rawQuestion as unknown as { id: number }).id,
          ) ?? [],
        ) ===
          JSON.stringify(
            specQuestion.options.map((option, index2) => ({
              text: option.text,
              isCorrect: option.isCorrect,
              order: index2 + 1,
            })),
          );

      if (!isSimilar) {
        sameQuestions = false;
      }
    });
  }

  if (sameMetadata && sameQuestions) {
    return;
  }

  const attempts = await db.orm.public.AssessmentAttempt
    .where({ assessmentId: assessment.id })
    .all();

  if (attempts.length > 0) {
    summary.assessmentsLockedByAttempts += 1;

    return;
  }

  await db.transaction(async (tx) => {
    for (const rawQuestion of questions) {
      const questionId = (rawQuestion as unknown as { id: number }).id;

      await tx.orm.public.AnswerOption
        .where({ questionId })
        .deleteAll();
    }

    await tx.orm.public.Question
      .where({ assessmentId: assessment.id })
      .deleteAll();

    if (!sameMetadata) {
      await tx.orm.public.Assessment
        .where({ id: assessment.id })
        .update({
          title: spec.title,
          description: spec.description,
        });
    }

    let questionOrder = 0;

    for (const question of spec.questions) {
      questionOrder += 1;

      const createdQuestion = await tx.orm.public.Question.create({
        assessmentId: assessment.id,
        statement: question.statement,
        type: question.type,
        order: questionOrder,
        status: 'ACTIVE',
        explanation: question.explanation,
        hint: question.hint,
      });

      const questionId = (createdQuestion as unknown as { id: number }).id;
      let optionOrder = 0;

      for (const option of question.options) {
        optionOrder += 1;

        await tx.orm.public.AnswerOption.create({
          questionId,
          text: option.text,
          isCorrect: option.isCorrect,
          order: optionOrder,
        });
      }
    }
  });

  summary.assessmentsUpdated += 1;
}

function flattenLaboratoryModule(course: AcademicCourse): AcademicModule[] {
  const flattened: AcademicModule[] = [];

  for (const module of course.modules) {
    if (module.title !== LAB_MODULE_TITLE) {
      flattened.push({ ...module, lessons: [...module.lessons] });
      continue;
    }

    const target = flattened[flattened.length - 1];

    if (target) {
      target.lessons.push(...module.lessons);
    }
  }

  return flattened;
}

async function migrateLaboratoryModules(
  courseId: number,
  course: AcademicCourse,
): Promise<void> {
  const laboratoryModule = await db.orm.public.Module
    .where({ courseId, title: LAB_MODULE_TITLE })
    .first();

  if (!laboratoryModule) {
    return;
  }

  const contentModules = course.modules.filter(
    (module) => module.title !== LAB_MODULE_TITLE,
  );
  const targetTitle = contentModules[contentModules.length - 1]?.title;

  if (!targetTitle) {
    return;
  }

  const targetModule = await db.orm.public.Module
    .where({ courseId, title: targetTitle })
    .first();

  if (!targetModule) {
    return;
  }

  const laboratoryLessons = await db.orm.public.Lesson
    .where({ moduleId: laboratoryModule.id })
    .orderBy((lesson) => lesson.order.asc())
    .all();

  let nextOrder =
    (
      await db.orm.public.Lesson
        .where({ moduleId: targetModule.id })
        .orderBy((lesson) => lesson.order.desc())
        .first()
    )?.order ?? 0;

  for (const lesson of laboratoryLessons) {
    const duplicate = await db.orm.public.Lesson
      .where({ moduleId: targetModule.id, title: lesson.title })
      .first();

    if (duplicate) {
      await db.orm.public.Lesson.where({ id: lesson.id }).deleteAll();
      continue;
    }

    nextOrder += 1;
    await db.orm.public.Lesson.where({ id: lesson.id }).update({
      moduleId: targetModule.id,
      order: nextOrder,
    });
  }

  await db.orm.public.Assessment
    .where({ moduleId: laboratoryModule.id })
    .deleteAll();
  await db.orm.public.Module.where({ id: laboratoryModule.id }).deleteAll();
}

async function main(): Promise<void> {
  await validateAllContent();

  const summary: SeedSummary = {
    coursesCreated: 0,
    modulesCreated: 0,
    lessonsCreated: 0,
    assessmentsCreated: 0,
    assessmentsUpdated: 0,
    assessmentsRemoved: 0,
    assessmentsLockedByAttempts: 0,
    lessonsSkipped: 0,
    lessonsUpdated: 0,
    lessonsLockedByProgress: 0,
  };

  await removeStaleModuleAssessments(summary);

  for (const course of ACADEMIC_COURSES) {
    const courseRecord = await findOrCreateCourse(course, summary);

    await migrateLaboratoryModules(courseRecord.id, course);

    for (const module of flattenLaboratoryModule(course)) {
      const moduleRecord = await findOrCreateModule(
        courseRecord.id,
        module,
        summary,
      );

      for (const lesson of module.lessons) {
        await findOrCreateLesson(moduleRecord.id, lesson, summary);
      }
    }

    const finalAssessment = ACADEMIC_FINAL_ASSESSMENTS.find(
      (assessment) => assessment.courseTitle === course.title,
    );

    if (finalAssessment) {
      await ensureCourseFinalAssessment(
        courseRecord.id,
        finalAssessment,
        summary,
      );
    } else {
      throw new Error(
        `No hay evaluación final definida para el curso "${course.title}".`,
      );
    }
  }

  console.log('Carga de contenido académico finalizada.');
  console.log(`Cursos creados: ${summary.coursesCreated}`);
  console.log(`Módulos creados: ${summary.modulesCreated}`);
  console.log(`Lecciones creadas: ${summary.lessonsCreated}`);
  console.log(
    `Evaluaciones finales creadas: ${summary.assessmentsCreated}`,
  );
  console.log(
    `Evaluaciones finales actualizadas: ${summary.assessmentsUpdated}`,
  );
  console.log(
    `Evaluaciones finales conservadas por intentos registrados: ${summary.assessmentsLockedByAttempts}`,
  );
  console.log(
    `Evaluaciones de módulo antiguas eliminadas: ${summary.assessmentsRemoved}`,
  );
  console.log(`Lecciones existentes conservadas: ${summary.lessonsSkipped}`);
  console.log(`Lecciones con contenido actualizado: ${summary.lessonsUpdated}`);
  console.log(
    `Lecciones sin actualizar por progreso registrado: ${summary.lessonsLockedByProgress}`,
  );
}

main()
  .catch((error: unknown) => {
    console.error(
      error instanceof Error ? error.message : 'No se pudo cargar el contenido.',
    );
    process.exitCode = 1;
  })
  .finally(async () => {
    await db.close();
  });
