import { useEffect, useState } from "react";
import {
  ArrowRight,
  BookOpen,
  Mail,
  Settings,
  Shield,
  Trophy,
  UserRound,
} from "lucide-react";
import { AuthenticatedLayout } from "../../components/layout/AuthenticatedLayout";
import { Badge } from "../../components/ui/Badge";
import { Button } from "../../components/ui/Button";
import { Card } from "../../components/ui/Card";
import { useAuth } from "../../context/AuthContext";
import { isAdminRole } from "../../lib/auth";
import type { NavigateFn } from "../../types/navigation";
import {
  getAchievementSummaryRequest,
  getPendingAchievementNotificationsRequest,
} from "../../services/achievements";
import type { AchievementDashboardSummary } from "../../types/achievement";

export interface DashboardPageProps {
  navigate: NavigateFn;
}

export function DashboardPage({ navigate }: DashboardPageProps) {
  const { user } = useAuth();

  if (!user) {
    return null;
  }

  const isAdmin = isAdminRole(user.role);

  const [summary, setSummary] = useState<AchievementDashboardSummary | null>(
    null,
  );
  const [pendingNotifications, setPendingNotifications] = useState<number>(0);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let active = true;

    setLoading(true);

    void Promise.all([
      getAchievementSummaryRequest(),
      getPendingAchievementNotificationsRequest(),
    ])
      .then(([summaryResponse, pendingResponse]) => {
        if (!active) {
          return;
        }

        setSummary(summaryResponse);
        setPendingNotifications(pendingResponse.notifications.length);
        setLoading(false);
      })
      .catch(() => {
        if (!active) {
          return;
        }

        setLoading(false);
      });

    return () => {
      active = false;
    };
  }, []);

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
              Explora los cursos publicados y revisa los módulos disponibles.
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
            <>
              <Card className="flex flex-col p-5">
                <div className="mb-4 flex h-10 w-10 items-center justify-center rounded-xl bg-accent/15 text-accent">
                  <Shield size={20} aria-hidden="true" />
                </div>
                <h2 className="text-base font-semibold text-white">
                  Aprendizaje seguro
                </h2>
                <p className="mt-1 flex-1 text-sm text-muted-foreground">
                  Solo verás cursos y módulos publicados por el equipo administrativo.
                </p>
              </Card>

              <Card className="flex flex-col p-5">
                <div className="mb-4 flex h-10 w-10 items-center justify-center rounded-xl bg-yellow/15 text-yellow">
                  <Trophy size={20} aria-hidden="true" />
                </div>
                <h2 className="text-base font-semibold text-white">
                  Mis logros
                </h2>
                <p className="mt-1 flex-1 text-sm text-muted-foreground">
                  Consulta tus medallas, rangos y reconocimientos obtenidos.
                </p>
                <Button
                  type="button"
                  variant="secondary"
                  className="mt-4 justify-center"
                  onClick={() => navigate("/achievements")}
                >
                  Ver mis logros <ArrowRight size={15} />
                </Button>
              </Card>
            </>
          )}
        </div>

        {!loading && summary && (
          <Card className="p-5">
            <div className="flex flex-col gap-4 sm:flex-row sm:items-between sm:justify-between">
              <div>
                <h2 className="text-sm font-semibold text-white">
                  Mi progreso en UniCyber Academy
                </h2>
                <p className="mt-1 text-sm text-muted-foreground">
                  Tu avance y reconocimientos académicos.
                </p>
              </div>
              {pendingNotifications > 0 && (
                <Badge color="blue">
                  {pendingNotifications} nuevo{" "}
                  {pendingNotifications === 1 ? "logro" : "logros"}
                </Badge>
              )}
            </div>

            <div className="mt-4 grid gap-3 sm:grid-cols-2">
              <Card className="p-4">
                <p className="text-xs text-muted-foreground">
                  Cursos completados
                </p>
                <p className="text-sm font-bold text-white">
                  {summary.completedCourses} de {summary.totalCourses}
                </p>
              </Card>
              <Card className="p-4">
                <p className="text-xs text-muted-foreground">
                  Medallas obtenidas
                </p>
                <p className="text-sm font-bold text-white">
                  {summary.earnedMedals} de {summary.totalMedals}
                </p>
              </Card>
              <Card className="p-4">
                <p className="text-xs text-muted-foreground">Rango actual</p>
                <p className="text-sm font-bold text-white">
                  {summary.currentRank ?? "—"}
                </p>
              </Card>
              <Card className="p-4">
                <p className="text-xs text-muted-foreground">Próximo logro</p>
                <p className="text-sm font-bold text-white">
                  {summary.nextAchievement ?? "—"}
                </p>
              </Card>
            </div>

            {summary.nextRankProgress && (
              <div className="mt-4">
                <p className="text-xs font-semibold text-white mb-2">
                  Progreso hacia el siguiente rango
                </p>
                <div className="w-full h-2 overflow-hidden rounded-full bg-white/10 mb-1">
                  <div
                    className="h-full rounded-full bg-gradient-to-r from-primary to-accent transition-all duration-500"
                    style={{
                      width: `${Math.min(
                        100,
                        Math.round(
                          (summary.nextRankProgress.completed /
                            summary.nextRankProgress.required) *
                            100,
                        ),
                      )}%`,
                    }}
                  />
                </div>
                <p className="text-xs text-muted-foreground">
                  {summary.nextRankProgress.completed} de{" "}
                  {summary.nextRankProgress.required} cursos completados
                </p>
              </div>
            )}
          </Card>
        )}

        {!loading && !summary && (
          <Card className="p-5">
            <h2 className="text-sm font-semibold text-white mb-3">
              Mi progreso en UniCyber Academy
            </h2>
            <p className="text-sm text-muted-foreground">
              Carga tu progreso para ver tus medallas y rangos.
            </p>
          </Card>
        )}

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
