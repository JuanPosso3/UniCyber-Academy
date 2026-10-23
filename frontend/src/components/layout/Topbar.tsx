import { LogOut, Menu } from "lucide-react";
import { Avatar } from "../ui/Avatar";
import { isAdminRole } from "../../lib/auth";
import type { AuthUser } from "../../types/auth";

interface TopbarProps {
  title: string;
  user: AuthUser;
  isSubmitting: boolean;
  onLogout: () => void;
  setSidebarOpen: (open: boolean) => void;
}

export function Topbar({
  title,
  user,
  isSubmitting,
  onLogout,
  setSidebarOpen,
}: TopbarProps) {
  const fullName = `${user.firstName} ${user.lastName}`;

  return (
    <header className="sticky top-0 z-10 flex h-14 items-center gap-3 border-b border-border-subtle bg-background/80 px-4 backdrop-blur">
      <button
        type="button"
        onClick={() => setSidebarOpen(true)}
        aria-label="Abrir menú de navegación"
        className="text-muted-foreground transition-colors hover:text-white lg:hidden"
      >
        <Menu size={20} />
      </button>

      <p className="truncate text-sm font-semibold text-white">{title}</p>

      <div className="ml-auto flex items-center gap-3">
        <div className="hidden items-center gap-2 sm:flex">
          <Avatar name={fullName} size="xs" />
          <div className="text-right">
            <p className="text-xs font-semibold text-white">
              {user.firstName}
            </p>
            <p className="text-[10px] text-muted-foreground">
              {isAdminRole(user.role) ? "Administrador" : "Estudiante"}
            </p>
          </div>
        </div>

        <button
          type="button"
          onClick={onLogout}
          disabled={isSubmitting}
          aria-label={isSubmitting ? "Cerrando sesión" : "Cerrar sesión"}
          className="flex items-center gap-2 rounded-xl border border-border bg-white/5 px-3 py-2 text-xs font-semibold text-muted-foreground transition-colors hover:bg-white/10 hover:text-white disabled:opacity-40"
        >
          <LogOut size={14} aria-hidden="true" />
          <span className="hidden sm:inline">
            {isSubmitting ? "Cerrando..." : "Cerrar sesión"}
          </span>
        </button>
      </div>
    </header>
  );
}
