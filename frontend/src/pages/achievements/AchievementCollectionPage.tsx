import { useEffect, useState } from "react";
import { ArrowLeft } from "lucide-react";
import { AuthenticatedLayout } from "../../components/layout/AuthenticatedLayout";
import { Alert } from "../../components/ui/Alert";
import { Badge } from "../../components/ui/Badge";
import { Button } from "../../components/ui/Button";
import { StatePanel } from "../../components/ui/StatePanel";
import {
  getAchievementCollectionRequest,
  getPendingAchievementNotificationsRequest,
  markAchievementNotificationViewedRequest,
} from "../../services/achievements";
import { AchievementNotification } from "../../components/achievements/AchievementNotification";
import { AchievementCard } from "../../components/achievements/AchievementCard";
import type { AchievementEntry, UserAchievement } from "../../types/achievement";
import type { NavigateFn } from "../../types/navigation";

export interface AchievementCollectionPageProps {
  navigate: NavigateFn;
}

export function AchievementCollectionPage({
  navigate,
}: AchievementCollectionPageProps) {
  const [collection, setCollection] = useState<{
    courseMedals: AchievementEntry[];
    learningRanks: AchievementEntry[];
    complementary: AchievementEntry[];
  } | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [notificationsOpen, setNotificationsOpen] = useState(false);
  const [pendingNotifications, setPendingNotifications] =
    useState<UserAchievement[]>([]);

  useEffect(() => {
    let active = true;

    setLoading(true);

    void Promise.all([
      getAchievementCollectionRequest(),
      getPendingAchievementNotificationsRequest(),
    ])
      .then(([loadedCollection, pendingResponse]) => {
        if (!active) {
          return;
        }

        setCollection(loadedCollection);
        setPendingNotifications(pendingResponse.notifications);
        setNotificationsOpen(pendingResponse.notifications.length > 0);
        setLoading(false);
      })
      .catch((requestError: unknown) => {
        if (!active) {
          return;
        }

        setError(
          requestError instanceof Error
            ? requestError.message
            : "No se pudieron cargar los logros.",
        );
        setLoading(false);
      });

    return () => {
      active = false;
    };
  }, []);

  const markNotificationsViewed = async (ids: number[]): Promise<void> => {
    await Promise.all(
      ids.map((id) =>
        markAchievementNotificationViewedRequest(id).catch(() => {
          /* Ignorar errores individuales de marcado como vistos. */
        }),
      ),
    );
    setPendingNotifications([]);
    setNotificationsOpen(false);
  };

  if (loading) {
    return (
      <AuthenticatedLayout
        title="Mis logros"
        currentPath="/achievements"
        navigate={navigate}
      >
        <StatePanel variant="loading" title="Cargando logros" />
      </AuthenticatedLayout>
    );
  }

  if (error) {
    return (
      <AuthenticatedLayout
        title="Mis logros"
        currentPath="/achievements"
        navigate={navigate}
      >
        <StatePanel variant="error" title="Error" description={error} />
      </AuthenticatedLayout>
    );
  }

  if (!collection) {
    return (
      <AuthenticatedLayout
        title="Mis logros"
        currentPath="/achievements"
        navigate={navigate}
      >
        <StatePanel
          variant="error"
          title="Logros no disponibles"
          description="No se pudo cargar la colección de logros."
        />
      </AuthenticatedLayout>
    );
  }

  const { courseMedals, learningRanks, complementary } = collection;
  const earnedCount =
    courseMedals.filter((m) => m.earned).length +
    learningRanks.filter((r) => r.earned).length +
    complementary.filter((c) => c.earned).length;
  const totalCount =
    courseMedals.length + learningRanks.length + complementary.length;

  return (
    <AuthenticatedLayout
      title="Mis logros"
      currentPath="/achievements"
      navigate={navigate}
    >
      <div className="mx-auto max-w-5xl space-y-5">
        <Button
          type="button"
          variant="ghost"
          onClick={() => navigate("/dashboard")}
        >
          <ArrowLeft size={15} /> Volver al panel
        </Button>

        <div className="flex flex-col gap-4 sm:flex-row sm:items-end">
          <div>
            <h1 className="text-2xl font-bold text-white">Mis logros</h1>
            <p className="mt-1 text-sm text-muted-foreground">
              Tus reconocimientos académicos y medallas obtenidas.
            </p>
          </div>
          <Badge color={earnedCount === totalCount ? "green" : "blue"}>
            {earnedCount} de {totalCount} obtenidos
          </Badge>
        </div>

        {earnedCount > 0 && totalCount > earnedCount && (
          <Alert variant="info">
            <span className="flex-1">
              Tienes logros pendientes por desbloquear. Sigue completando
              lecciones, módulos y cursos para conseguirlos.
            </span>
          </Alert>
        )}

        <AchievementNotification
          open={notificationsOpen}
          notifications={pendingNotifications}
          onClose={() => setNotificationsOpen(false)}
          onMarkViewed={markNotificationsViewed}
        />

        <section>
          <h2 className="text-sm font-semibold text-white mb-3">
            Medallas de cursos
          </h2>
          <div className="grid gap-3 sm:grid-cols-3 md:grid-cols-5">
            {courseMedals.map((entry) => (
              <AchievementCard key={entry.code} entry={entry} />
            ))}
          </div>
        </section>

        <section>
          <h2 className="text-sm font-semibold text-white mb-3">
            Rangos de aprendizaje
          </h2>
          <div className="grid gap-3 sm:grid-cols-3">
            {learningRanks.map((entry) => (
              <AchievementCard key={entry.code} entry={entry} />
            ))}
          </div>
        </section>

        <section>
          <h2 className="text-sm font-semibold text-white mb-3">
            Logros especiales
          </h2>
          <div className="grid gap-3 sm:grid-cols-3">
            {complementary.map((entry) => (
              <AchievementCard key={entry.code} entry={entry} />
            ))}
          </div>
        </section>
      </div>
    </AuthenticatedLayout>
  );
}
