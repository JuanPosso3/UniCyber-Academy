import { useCallback, useEffect, useMemo, useState } from "react";
import { AuthLayout } from "./components/layout/AuthLayout";
import { AuthenticatedLayout } from "./components/layout/AuthenticatedLayout";
import { StatePanel } from "./components/ui/StatePanel";
import { Button } from "./components/ui/Button";
import { AuthProvider, useAuth } from "./context/AuthContext";
import { isAdminRole } from "./lib/auth";
import {
  isAdminRoute,
  normalizePath,
  parseRoute,
} from "./lib/routes";
import { AdminCoursesPage } from "./pages/admin/AdminCoursesPage";
import { CourseFormPage } from "./pages/admin/CourseFormPage";
import { CourseModulesPage } from "./pages/admin/CourseModulesPage";
import { ModuleFormPage } from "./pages/admin/ModuleFormPage";
import { Login } from "./pages/auth/Login";
import { Register } from "./pages/auth/Register";
import { CourseDetailPage } from "./pages/courses/CourseDetailPage";
import { CoursesPage } from "./pages/courses/CoursesPage";
import { DashboardPage } from "./pages/dashboard/DashboardPage";

function AppContent() {
  const { user, isBootstrapping } = useAuth();
  const [pathname, setPathname] = useState(
    () => window.location.pathname,
  );
  const route = useMemo(() => parseRoute(pathname), [pathname]);

  const navigate = useCallback((nextPath: string) => {
    const path = normalizePath(nextPath);

    if (path === window.location.pathname) {
      return;
    }

    window.history.pushState({}, "", path);
    setPathname(path);
    window.scrollTo({ top: 0 });
  }, []);

  const replace = useCallback((path: string) => {
    if (path === window.location.pathname) {
      return;
    }

    window.history.replaceState({}, "", path);
    setPathname(path);
  }, []);

  useEffect(() => {
    const handlePopState = () => {
      setPathname(window.location.pathname);
    };

    window.addEventListener("popstate", handlePopState);

    return () => {
      window.removeEventListener("popstate", handlePopState);
    };
  }, []);

  useEffect(() => {
    if (isBootstrapping) {
      return;
    }

    const isPublicRoute =
      route.name === "login" || route.name === "register";

    if (!user && !isPublicRoute) {
      replace("/login");
      return;
    }

    if (user && isPublicRoute) {
      replace("/dashboard");
      return;
    }

    if (user && isAdminRoute(route) && !isAdminRole(user.role)) {
      replace("/courses");
    }
  }, [isBootstrapping, user, route, replace]);

  if (isBootstrapping) {
    return (
      <AuthLayout
        title="UniCyber Academy"
        subtitle="Verificando tu sesión"
        footer="Un momento, por favor."
      >
        <div className="flex items-center justify-center py-4">
          <span
            className="h-5 w-5 animate-spin rounded-full border-2 border-primary border-t-transparent"
            aria-hidden="true"
          />
          <span className="sr-only">Cargando</span>
        </div>
      </AuthLayout>
    );
  }

  if (!user) {
    return route.name === "register" ? (
      <Register navigate={navigate} />
    ) : (
      <Login navigate={navigate} />
    );
  }

  // La guardia reemplaza la URL por /dashboard; se evita mostrar el
  // estado "no encontrado" durante ese primer render.
  if (route.name === "login" || route.name === "register") {
    return <DashboardPage navigate={navigate} />;
  }

  if (isAdminRoute(route) && !isAdminRole(user.role)) {
    return (
      <AuthenticatedLayout
        title="Acceso restringido"
        currentPath={pathname}
        navigate={navigate}
      >
        <StatePanel
          variant="error"
          title="Acceso restringido"
          description="Esta sección está disponible únicamente para administradores."
          action={
            <Button
              type="button"
              variant="primary"
              onClick={() => navigate("/courses")}
            >
              Ir al catálogo
            </Button>
          }
        />
      </AuthenticatedLayout>
    );
  }

  switch (route.name) {
    case "dashboard":
      return <DashboardPage navigate={navigate} />;

    case "courses":
      return <CoursesPage navigate={navigate} />;

    case "course-detail":
      return (
        <CourseDetailPage
          courseId={route.courseId}
          navigate={navigate}
        />
      );

    case "admin-courses":
      return <AdminCoursesPage navigate={navigate} />;

    case "admin-course-new":
      return <CourseFormPage navigate={navigate} />;

    case "admin-course-edit":
      return (
        <CourseFormPage
          courseId={route.courseId}
          navigate={navigate}
        />
      );

    case "admin-modules":
      return (
        <CourseModulesPage
          courseId={route.courseId}
          navigate={navigate}
        />
      );

    case "admin-module-new":
      return (
        <ModuleFormPage
          courseId={route.courseId}
          navigate={navigate}
        />
      );

    case "admin-module-edit":
      return (
        <ModuleFormPage
          courseId={route.courseId}
          moduleId={route.moduleId}
          navigate={navigate}
        />
      );

    default:
      return (
        <AuthenticatedLayout
          title="Página no encontrada"
          currentPath={pathname}
          navigate={navigate}
        >
          <StatePanel
            variant="empty"
            title="La página no existe"
            description="La dirección solicitada no corresponde a ninguna pantalla disponible."
            action={
              <Button
                type="button"
                variant="primary"
                onClick={() => navigate("/dashboard")}
              >
                Volver al panel
              </Button>
            }
          />
        </AuthenticatedLayout>
      );
  }
}

export default function App() {
  return (
    <AuthProvider>
      <AppContent />
    </AuthProvider>
  );
}
