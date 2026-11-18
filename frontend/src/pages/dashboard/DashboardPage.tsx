import { useEffect, useState } from "react";
import {
  ArrowRight,
  BookOpen,
  Settings,
  Shield,
  Trophy,
} from "lucide-react";
import { AuthenticatedLayout } from "../../components/layout/AuthenticatedLayout";
import { AchievementSummaryCard } from "../../components/achievements/AchievementSummaryCard";
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

        <AchievementSummaryCard
          summary={summary}
          pendingNotifications={pendingNotifications}
          loading={loading}
          onViewAchievements={() => navigate("/achievements")}
        />
      </div>
    </AuthenticatedLayout>
  );
}
