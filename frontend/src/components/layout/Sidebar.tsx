import {
  BarChart3,
  BookOpen,
  LayoutDashboard,
  LogOut,
  Shield,
} from "lucide-react";
import { Avatar } from "../ui/Avatar";
import { cn } from "../../lib/utils";
import { isAdminRole } from "../../lib/auth";
import type { AuthUser } from "../../types/auth";
import type { NavigateFn } from "../../types/navigation";

interface SidebarProps {
  currentPath: string;
  navigate: NavigateFn;
  sidebarOpen: boolean;
  setSidebarOpen: (open: boolean) => void;
  user: AuthUser;
  onLogout: () => void;
}

interface NavItem {
  label: string;
  path: string;
  icon: React.ReactNode;
  adminOnly?: boolean;
}

const NAV_ITEMS: NavItem[] = [
  {
    label: "Panel",
    path: "/dashboard",
    icon: <LayoutDashboard size={18} />,
  },
  {
    label: "Catálogo de cursos",
    path: "/courses",
    icon: <BookOpen size={18} />,
  },
  {
    label: "Administrar cursos",
    path: "/admin/courses",
    icon: <BarChart3 size={18} />,
    adminOnly: true,
  },
];

function isActivePath(currentPath: string, path: string): boolean {
  if (path === "/courses") {
    return (
      currentPath === "/courses" ||
      currentPath.startsWith("/courses/")
    );
  }

  if (path === "/admin/courses") {
    return currentPath.startsWith("/admin/courses");
  }

  return currentPath === path;
}

export function Sidebar({
  currentPath,
  navigate,
  sidebarOpen,
  setSidebarOpen,
  user,
  onLogout,
}: SidebarProps) {
  const items = NAV_ITEMS.filter(
    (item) => !item.adminOnly || isAdminRole(user.role),
  );
  const fullName = `${user.firstName} ${user.lastName}`;

  return (
    <>
      {sidebarOpen && (
        <div
          className="fixed inset-0 z-20 bg-black/50 lg:hidden"
          onClick={() => setSidebarOpen(false)}
          aria-hidden="true"
        />
      )}

      <aside
        className={cn(
          "fixed left-0 top-0 z-30 flex h-full w-60 flex-col",
          "border-r border-sidebar-border bg-sidebar transition-transform duration-300",
          sidebarOpen
            ? "translate-x-0"
            : "-translate-x-full lg:translate-x-0",
        )}
      >
        <button
          type="button"
          onClick={() => {
            navigate("/dashboard");
            setSidebarOpen(false);
          }}
          className="flex items-center gap-3 border-b border-sidebar-border p-5 text-left"
        >
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary">
            <Shield size={16} className="text-white" aria-hidden="true" />
          </div>
          <span className="text-sm font-bold text-white">
            UniCyber <span className="text-accent">Academy</span>
          </span>
        </button>

        <nav
          className="flex-1 overflow-y-auto p-3"
          aria-label="Navegación principal"
        >
          <p className="mb-2 mt-2 px-3 text-[10px] font-semibold uppercase tracking-widest text-muted-foreground">
            Aprendizaje
          </p>

          {items.map((item) => {
            const active = isActivePath(currentPath, item.path);

            return (
              <button
                key={item.path}
                type="button"
                onClick={() => {
                  navigate(item.path);
                  setSidebarOpen(false);
                }}
                aria-current={active ? "page" : undefined}
                className={cn(
                  "mb-0.5 flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition-all",
                  active
                    ? "border border-primary/20 bg-primary/15 text-primary"
                    : "text-muted-foreground hover:bg-white/5 hover:text-white",
                )}
              >
                {item.icon}
                {item.label}
              </button>
            );
          })}
        </nav>

        <div className="border-t border-sidebar-border p-4">
          <div className="flex items-center gap-3 px-2">
            <Avatar name={fullName} size="sm" />
            <div className="min-w-0 flex-1">
              <p className="truncate text-xs font-semibold text-white">
                {fullName}
              </p>
              <p className="truncate text-[10px] text-muted-foreground">
                {isAdminRole(user.role) ? "Administrador" : "Estudiante"}
              </p>
            </div>
            <button
              type="button"
              onClick={onLogout}
              aria-label="Cerrar sesión"
              className="text-muted-foreground transition-colors hover:text-white"
            >
              <LogOut size={16} />
            </button>
          </div>
        </div>
      </aside>
    </>
  );
}
