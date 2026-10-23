import { ArrowLeft } from "lucide-react";
import { cn } from "../../lib/utils";
import type { NavigateFn } from "../../types/navigation";

interface AdminNavProps {
  currentPath: string;
  navigate: NavigateFn;
}

const ADMIN_ITEMS = [
  { label: "Cursos", path: "/admin/courses" },
];

export function AdminNav({ currentPath, navigate }: AdminNavProps) {
  return (
    <div
      className="mb-5 flex flex-wrap gap-2"
      role="tablist"
      aria-label="Secciones de administración"
    >
      {ADMIN_ITEMS.map((item) => {
        const active = currentPath.startsWith(item.path);

        return (
          <button
            key={item.path}
            type="button"
            role="tab"
            aria-selected={active}
            onClick={() => navigate(item.path)}
            className={cn(
              "rounded-xl px-4 py-2 text-sm font-medium transition-colors",
              active
                ? "border border-purple/30 bg-purple/20 text-purple"
                : "border border-border bg-card text-muted-foreground hover:text-white",
            )}
          >
            {item.label}
          </button>
        );
      })}

      <button
        type="button"
        onClick={() => navigate("/dashboard")}
        className="ml-auto flex items-center gap-2 px-3 py-2 text-sm text-muted-foreground hover:text-white"
      >
        <ArrowLeft size={14} /> Salir del admin
      </button>
    </div>
  );
}
