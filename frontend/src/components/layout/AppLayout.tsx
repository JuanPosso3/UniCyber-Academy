import { useState, type ReactNode } from "react";
import { Sidebar } from "./Sidebar";
import { Topbar } from "./Topbar";
import type { AuthUser } from "../../types/auth";
import type { NavigateFn } from "../../types/navigation";

export interface AppLayoutProps {
  title: string;
  currentPath: string;
  navigate: NavigateFn;
  user: AuthUser;
  isSubmitting: boolean;
  onLogout: () => void;
  children: ReactNode;
}

/**
 * Composición autenticada: barra lateral fija en escritorio, drawer en
 * móvil, barra superior y contenido. Sigue la estructura del
 * `frontendGuide` sin incorporar navegación decorativa.
 */
export function AppLayout({
  title,
  currentPath,
  navigate,
  user,
  isSubmitting,
  onLogout,
  children,
}: AppLayoutProps) {
  const [sidebarOpen, setSidebarOpen] = useState(false);

  return (
    <div className="flex min-h-screen bg-background">
      <Sidebar
        currentPath={currentPath}
        navigate={navigate}
        sidebarOpen={sidebarOpen}
        setSidebarOpen={setSidebarOpen}
        user={user}
        onLogout={onLogout}
      />

      <div className="flex min-h-screen flex-1 flex-col lg:ml-60">
        <Topbar
          title={title}
          user={user}
          isSubmitting={isSubmitting}
          onLogout={onLogout}
          setSidebarOpen={setSidebarOpen}
        />
        <main className="flex-1 overflow-auto p-4 lg:p-6">
          {children}
        </main>
      </div>
    </div>
  );
}
