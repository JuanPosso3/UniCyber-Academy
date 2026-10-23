import type { ReactNode } from "react";
import { AppLayout } from "./AppLayout";
import { useAuth } from "../../context/AuthContext";
import type { NavigateFn } from "../../types/navigation";

interface AuthenticatedLayoutProps {
  title: string;
  currentPath: string;
  navigate: NavigateFn;
  children: ReactNode;
}

/**
 * Envoltura de las pantallas autenticadas. Centraliza el cierre de
 * sesión y evita repetir la composición del layout en cada página.
 */
export function AuthenticatedLayout({
  title,
  currentPath,
  navigate,
  children,
}: AuthenticatedLayoutProps) {
  const { user, logout, isSubmitting } = useAuth();

  if (!user) {
    return null;
  }

  const handleLogout = async () => {
    await logout();
    navigate("/login");
  };

  return (
    <AppLayout
      title={title}
      currentPath={currentPath}
      navigate={navigate}
      user={user}
      isSubmitting={isSubmitting}
      onLogout={() => {
        void handleLogout();
      }}
    >
      {children}
    </AppLayout>
  );
}
