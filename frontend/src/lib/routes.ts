export type AppRoute =
  | { name: "login" }
  | { name: "register" }
  | { name: "dashboard" }
  | { name: "courses" }
  | { name: "course-detail"; courseId: number }
  | { name: "admin-courses" }
  | { name: "admin-course-new" }
  | { name: "admin-course-edit"; courseId: number }
  | { name: "admin-modules"; courseId: number }
  | { name: "admin-module-new"; courseId: number }
  | { name: "admin-module-edit"; courseId: number; moduleId: number }
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
    default:
      return "UniCyber Academy";
  }
}
