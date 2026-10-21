import { useCallback, useEffect, useState } from "react";
import { AuthLayout } from "./components/layout/AuthLayout";
import { AuthProvider, useAuth } from "./context/AuthContext";
import { Login } from "./pages/auth/Login";
import { Register } from "./pages/auth/Register";
import { SessionHome } from "./pages/dashboard/SessionHome";
import type { Page } from "./types/navigation";

const PAGE_PATHS: Record<Page, string> = {
  login: "/login",
  register: "/register",
  dashboard: "/dashboard",
};

function pageFromPath(pathname: string): Page {
  const normalized = pathname.replace(/\/+$/, "") || "/";

  if (normalized === "/register") {
    return "register";
  }

  if (normalized === "/dashboard") {
    return "dashboard";
  }

  return "login";
}

function AppContent() {
  const { user, isBootstrapping } = useAuth();
  const [page, setPage] = useState<Page>(() =>
    pageFromPath(window.location.pathname),
  );

  const navigate = useCallback((nextPage: Page) => {
    setPage(nextPage);
    window.history.pushState({}, "", PAGE_PATHS[nextPage]);
  }, []);

  useEffect(() => {
    const handlePopState = () => {
      setPage(pageFromPath(window.location.pathname));
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

    if (user && (page === "login" || page === "register")) {
      setPage("dashboard");
      window.history.replaceState({}, "", PAGE_PATHS.dashboard);
      return;
    }

    if (!user && page === "dashboard") {
      setPage("login");
      window.history.replaceState({}, "", PAGE_PATHS.login);
    }
  }, [user, isBootstrapping, page]);

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

  if (user) {
    return <SessionHome navigate={navigate} />;
  }

  return page === "register" ? (
    <Register navigate={navigate} />
  ) : (
    <Login navigate={navigate} />
  );
}

export default function App() {
  return (
    <AuthProvider>
      <AppContent />
    </AuthProvider>
  );
}
