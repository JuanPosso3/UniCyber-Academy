import type { JsonValue } from '@prisma/orm-postgres/target/codec-types';
import { db } from './db.js';
import { validateLessonContent } from '../domain/lesson-content.js';
import {
  ACADEMIC_COURSES,
  type AcademicCourse,
  type AcademicModule,
} from './academic-content.js';

const LAB_MODULE_TITLE = 'Laboratorio práctico del curso';

interface SeedSummary {
  coursesCreated: number;
  modulesCreated: number;
  lessonsCreated: number;
  assessmentsCreated: number;
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

async function ensureModuleAssessment(
  courseId: number,
  moduleId: number,
  moduleTitle: string,
  summary: SeedSummary,
): Promise<void> {
  const existing = await db.orm.public.Assessment
    .where({ moduleId })
    .first();

  if (existing) {
    return;
  }

  await db.orm.public.Assessment.create({
    title: `Evaluación de recordar: ${moduleTitle}`,
    description:
      'Evaluación de recordar del módulo. Las preguntas y el flujo de ejecución quedan pendientes de definición.',
    type: 'MODULE',
    moduleId,
    courseId: null,
    status: 'DRAFT',
  });

  summary.assessmentsCreated += 1;
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
    lessonsSkipped: 0,
    lessonsUpdated: 0,
    lessonsLockedByProgress: 0,
  };

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

      await ensureModuleAssessment(
        courseRecord.id,
        moduleRecord.id,
        moduleRecord.title,
        summary,
      );
    }
  }

  console.log('Carga de contenido académico finalizada.');
  console.log(`Cursos creados: ${summary.coursesCreated}`);
  console.log(`Módulos creados: ${summary.modulesCreated}`);
  console.log(`Lecciones creadas: ${summary.lessonsCreated}`);
  console.log(`Evaluaciones DRAFT creadas: ${summary.assessmentsCreated}`);
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
