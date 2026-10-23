import {
  ArrowRight,
  BookOpen,
  Mail,
  Settings,
  Shield,
  UserRound,
} from "lucide-react";
import { AuthenticatedLayout } from "../../components/layout/AuthenticatedLayout";
import { Button } from "../../components/ui/Button";
import { Card } from "../../components/ui/Card";
import { useAuth } from "../../context/AuthContext";
import { isAdminRole } from "../../lib/auth";
import type { NavigateFn } from "../../types/navigation";

export interface DashboardPageProps {
  navigate: NavigateFn;
}

export function DashboardPage({ navigate }: DashboardPageProps) {
  const { user } = useAuth();

  if (!user) {
    return null;
  }

  const isAdmin = isAdminRole(user.role);

  return (
    <AuthenticatedLayout
      title="Panel"
      currentPath="/dashboard"
      navigate={navigate}
    >
      <div className="mx-auto max-w-5xl space-y-5">
        <section>
          <p className="mb-1 text-sm font-medium text-accent">Bienvenido</p>
          <h1 className="text-2xl font-bold text-white">
            Hola, {user.firstName}
          </h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Consulta los cursos disponibles y continúa tu formación en
            ciberseguridad.
          </p>
        </section>

        <div className="grid gap-4 sm:grid-cols-2">
          <Card className="flex flex-col p-5">
            <div className="mb-4 flex h-10 w-10 items-center justify-center rounded-xl bg-primary/15 text-primary">
              <BookOpen size={20} aria-hidden="true" />
            </div>
            <h2 className="text-base font-semibold text-white">
              Catálogo de cursos
            </h2>
            <p className="mt-1 flex-1 text-sm text-muted-foreground">
              Explora los cursos publicados y revisa los módulos
              disponibles.
            </p>
            <Button
              type="button"
              variant="primary"
              className="mt-4 justify-center"
              onClick={() => navigate("/courses")}
            >
              Ver catálogo <ArrowRight size={15} />
            </Button>
          </Card>

          {isAdmin ? (
            <Card className="flex flex-col p-5">
              <div className="mb-4 flex h-10 w-10 items-center justify-center rounded-xl bg-purple/15 text-purple">
                <Settings size={20} aria-hidden="true" />
              </div>
              <h2 className="text-base font-semibold text-white">
                Administración
              </h2>
              <p className="mt-1 flex-1 text-sm text-muted-foreground">
                Crea cursos, organiza módulos y controla su publicación.
              </p>
              <Button
                type="button"
                variant="secondary"
                className="mt-4 justify-center"
                onClick={() => navigate("/admin/courses")}
              >
                Administrar cursos <ArrowRight size={15} />
              </Button>
            </Card>
          ) : (
            <Card className="flex flex-col p-5">
              <div className="mb-4 flex h-10 w-10 items-center justify-center rounded-xl bg-accent/15 text-accent">
                <Shield size={20} aria-hidden="true" />
              </div>
              <h2 className="text-base font-semibold text-white">
                Aprendizaje seguro
              </h2>
              <p className="mt-1 text-sm text-muted-foreground">
                Solo verás cursos y módulos publicados por el equipo
                administrativo.
              </p>
            </Card>
          )}
        </div>

        <Card className="p-5">
          <h2 className="mb-4 text-sm font-semibold text-white">
            Datos de la sesión
          </h2>
          <dl className="grid gap-3 sm:grid-cols-2">
            <div className="flex items-center gap-3 rounded-xl border border-border bg-white/5 px-3 py-2.5">
              <Mail size={16} className="shrink-0 text-primary" />
              <div className="min-w-0">
                <dt className="text-xs text-muted-foreground">
                  Correo electrónico
                </dt>
                <dd className="truncate text-sm text-white">{user.email}</dd>
              </div>
            </div>
            <div className="flex items-center gap-3 rounded-xl border border-border bg-white/5 px-3 py-2.5">
              <UserRound size={16} className="shrink-0 text-primary" />
              <div className="min-w-0">
                <dt className="text-xs text-muted-foreground">Rol</dt>
                <dd className="text-sm text-white">
                  {isAdmin ? "Administrador" : "Estudiante"}
                </dd>
              </div>
            </div>
          </dl>
        </Card>
      </div>
    </AuthenticatedLayout>
  );
}
