import { ArrowRight } from "lucide-react";
import { Badge } from "../ui/Badge";
import { Button } from "../ui/Button";
import { Card } from "../ui/Card";
import type { AchievementDashboardSummary } from "../../types/achievement";

export interface AchievementSummaryCardProps {
  summary: AchievementDashboardSummary | null;
  pendingNotifications: number;
  loading: boolean;
  onViewAchievements: () => void;
}

/**
 * Tarjeta de progreso académico y logros.
 *
 * Se reutiliza en el panel del estudiante y en "Mi perfil" para no
 * duplicar los cálculos ni la presentación de gamificación.
 */
export function AchievementSummaryCard({
  summary,
  pendingNotifications,
  loading,
  onViewAchievements,
}: AchievementSummaryCardProps) {
  if (loading) {
    return (
      <Card className="p-5">
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <span
            className="h-4 w-4 animate-spin rounded-full border-2 border-primary border-t-transparent"
            aria-hidden="true"
          />
          Cargando tu progreso...
        </div>
      </Card>
    );
  }

  if (!summary) {
    return (
      <Card className="p-5">
        <h2 className="mb-3 text-sm font-semibold text-white">
          Mi progreso en UniCyber Academy
        </h2>
        <p className="text-sm text-muted-foreground">
          Carga tu progreso para ver tus medallas y rangos.
        </p>
      </Card>
    );
  }

  return (
    <Card className="p-5">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
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
          <p className="text-xs text-muted-foreground">Cursos completados</p>
          <p className="text-sm font-bold text-white">
            {summary.completedCourses} de {summary.totalCourses}
          </p>
        </Card>
        <Card className="p-4">
          <p className="text-xs text-muted-foreground">Medallas obtenidas</p>
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
          <p className="mb-2 text-xs font-semibold text-white">
            Progreso hacia el siguiente rango
          </p>
          <div className="mb-1 h-2 w-full overflow-hidden rounded-full bg-white/10">
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

      <Button
        type="button"
        variant="secondary"
        className="mt-4 justify-center"
        onClick={onViewAchievements}
      >
        Ver mis logros <ArrowRight size={15} />
      </Button>
    </Card>
  );
}
