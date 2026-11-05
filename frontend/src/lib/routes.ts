export type AppRoute =
  | { name: "login" }
  | { name: "register" }
  | { name: "dashboard" }
  | { name: "courses" }
  | { name: "course-detail"; courseId: number }
  | { name: "lesson"; courseId: number; lessonId: number }
  | { name: "admin-courses" }
  | { name: "admin-course-new" }
  | { name: "admin-course-edit"; courseId: number }
  | { name: "admin-modules"; courseId: number }
  | { name: "admin-module-new"; courseId: number }
  | { name: "admin-module-edit"; courseId: number; moduleId: number }
  | { name: "admin-lessons"; courseId: number; moduleId: number }
  | { name: "admin-lesson-new"; courseId: number; moduleId: number }
  | {
      name: "admin-lesson-edit";
      courseId: number;
      moduleId: number;
      lessonId: number;
    }
  | {
      name: "admin-lesson-preview";
      courseId: number;
      moduleId: number;
      lessonId: number;
    }
  | { name: "admin-assessment"; courseId: number }
  | { name: "admin-assessment-edit"; courseId: number }
  | { name: "assessment"; courseId: number }
  | { name: "assessment-results"; courseId: number }
  | { name: "not-found" };

const LEGACY_PATHS: Record<string, string> = {
  login: "/login",
  register: "/register",
  dashboard: "/dashboard",
  courses: "/courses",
};

export function normalizePath(path: string): string {
  if (path.startsWith("/")) {
    return path;
  }

  return LEGACY_PATHS[path] ?? `/${path}`;
}

function parseId(value: string | undefined): number | null {
  if (!value || !/^\d+$/.test(value)) {
    return null;
  }

  const id = Number(value);

  return Number.isSafeInteger(id) && id > 0 ? id : null;
}

export function parseRoute(pathname: string): AppRoute {
  const normalized = pathname.replace(/\/+$/, "") || "/";

  if (normalized === "/login") {
    return { name: "login" };
  }

  if (normalized === "/register") {
    return { name: "register" };
  }

  if (normalized === "/" || normalized === "/dashboard") {
    return { name: "dashboard" };
  }

  if (normalized === "/courses") {
    return { name: "courses" };
  }

  if (normalized === "/admin/courses") {
    return { name: "admin-courses" };
  }

  if (normalized === "/admin/courses/new") {
    return { name: "admin-course-new" };
  }

  const courseDetail = /^\/courses\/(\d+)$/.exec(normalized);

  if (courseDetail) {
    const courseId = parseId(courseDetail[1]);

    if (courseId) {
      return { name: "course-detail", courseId };
    }
  }

  const lesson = /^\/courses\/(\d+)\/lessons\/(\d+)$/.exec(normalized);

  if (lesson) {
    const courseId = parseId(lesson[1]);
    const lessonId = parseId(lesson[2]);

    if (courseId && lessonId) {
      return { name: "lesson", courseId, lessonId };
    }
  }

  const courseEdit = /^\/admin\/courses\/(\d+)\/edit$/.exec(normalized);

  if (courseEdit) {
    const courseId = parseId(courseEdit[1]);

    if (courseId) {
      return { name: "admin-course-edit", courseId };
    }
  }

  const moduleNew = /^\/admin\/courses\/(\d+)\/modules\/new$/.exec(
    normalized,
  );

  if (moduleNew) {
    const courseId = parseId(moduleNew[1]);

    if (courseId) {
      return { name: "admin-module-new", courseId };
    }
  }

  const moduleEdit =
    /^\/admin\/courses\/(\d+)\/modules\/(\d+)\/edit$/.exec(normalized);

  if (moduleEdit) {
    const courseId = parseId(moduleEdit[1]);
    const moduleId = parseId(moduleEdit[2]);

    if (courseId && moduleId) {
      return { name: "admin-module-edit", courseId, moduleId };
    }
  }

  const modules = /^\/admin\/courses\/(\d+)\/modules$/.exec(normalized);

  if (modules) {
    const courseId = parseId(modules[1]);

    if (courseId) {
      return { name: "admin-modules", courseId };
    }
  }

  const lessonNew =
    /^\/admin\/courses\/(\d+)\/modules\/(\d+)\/lessons\/new$/.exec(
      normalized,
    );

  if (lessonNew) {
    const courseId = parseId(lessonNew[1]);
    const moduleId = parseId(lessonNew[2]);

    if (courseId && moduleId) {
      return { name: "admin-lesson-new", courseId, moduleId };
    }
  }

  const lessonEdit =
    /^\/admin\/courses\/(\d+)\/modules\/(\d+)\/lessons\/(\d+)\/edit$/.exec(
      normalized,
    );

  if (lessonEdit) {
    const courseId = parseId(lessonEdit[1]);
    const moduleId = parseId(lessonEdit[2]);
    const lessonId = parseId(lessonEdit[3]);

    if (courseId && moduleId && lessonId) {
      return {
        name: "admin-lesson-edit",
        courseId,
        moduleId,
        lessonId,
      };
    }
  }

  const lessonPreview =
    /^\/admin\/courses\/(\d+)\/modules\/(\d+)\/lessons\/(\d+)\/preview$/.exec(
      normalized,
    );

  if (lessonPreview) {
    const courseId = parseId(lessonPreview[1]);
    const moduleId = parseId(lessonPreview[2]);
    const lessonId = parseId(lessonPreview[3]);

    if (courseId && moduleId && lessonId) {
      return {
        name: "admin-lesson-preview",
        courseId,
        moduleId,
        lessonId,
      };
    }
  }

  const lessons =
    /^\/admin\/courses\/(\d+)\/modules\/(\d+)\/lessons$/.exec(normalized);

  if (lessons) {
    const courseId = parseId(lessons[1]);
    const moduleId = parseId(lessons[2]);

    if (courseId && moduleId) {
      return { name: "admin-lessons", courseId, moduleId };
    }
  }

  const assessmentResults =
    /^\/courses\/(\d+)\/assessment\/results$/.exec(normalized);

  if (assessmentResults) {
    const courseId = parseId(assessmentResults[1]);

    if (courseId) {
      return { name: "assessment-results", courseId };
    }
  }

  const assessment =
    /^\/courses\/(\d+)\/assessment$/.exec(normalized);

  if (assessment) {
    const courseId = parseId(assessment[1]);

    if (courseId) {
      return { name: "assessment", courseId };
    }
  }

  const adminAssessmentEdit =
    /^\/admin\/courses\/(\d+)\/assessment\/edit$/.exec(normalized);

  if (adminAssessmentEdit) {
    const courseId = parseId(adminAssessmentEdit[1]);

    if (courseId) {
      return { name: "admin-assessment-edit", courseId };
    }
  }

  const adminAssessment =
    /^\/admin\/courses\/(\d+)\/assessment$/.exec(normalized);

  if (adminAssessment) {
    const courseId = parseId(adminAssessment[1]);

    if (courseId) {
      return { name: "admin-assessment", courseId };
    }
  }

  return { name: "not-found" };
}

export function isAdminRoute(route: AppRoute): boolean {
  return route.name.startsWith("admin-");
}

export function routeTitle(route: AppRoute): string {
  switch (route.name) {
    case "dashboard":
      return "Panel";
    case "courses":
      return "Catálogo de cursos";
    case "course-detail":
      return "Detalle del curso";
    case "lesson":
      return "Lección";
    case "admin-courses":
      return "Administración de cursos";
    case "admin-course-new":
      return "Crear curso";
    case "admin-course-edit":
      return "Editar curso";
    case "admin-modules":
      return "Módulos del curso";
    case "admin-module-new":
      return "Crear módulo";
    case "admin-module-edit":
      return "Editar módulo";
    case "admin-lessons":
      return "Lecciones del módulo";
    case "admin-lesson-new":
      return "Crear lección";
    case "admin-lesson-edit":
      return "Editar lección";
    case "admin-lesson-preview":
      return "Vista previa de la lección";
    case "admin-assessment":
      return "Evaluación final del curso";
    case "admin-assessment-edit":
      return "Editar evaluación final";
    case "assessment":
      return "Examen final";
    case "assessment-results":
      return "Resultados del examen";
    default:
      return "UniCyber Academy";
  }
}
