import { Lock, CheckCircle } from "lucide-react";
import { Badge } from "../ui/Badge";
import { Card } from "../ui/Card";
import { AchievementBadge } from "./AchievementBadge";
import type { AchievementEntry } from "../../types/achievement";

const CATEGORY_LABELS: Record<string, string> = {
  COURSE_MEDAL: "Medalla de curso",
  LEARNING_RANK: "Rango de aprendizaje",
  COMPLEMENTARY: "Logro especial",
};

const CATEGORY_COLOR: Record<string, "blue" | "purple" | "cyan"> = {
  COURSE_MEDAL: "blue",
  LEARNING_RANK: "purple",
  COMPLEMENTARY: "cyan",
};

const REQUIREMENT_BY_CODE: Record<string, string> = {
  PHISHING_COURSE_COMPLETED:
    "Completa el curso Phishing y simulaciones de ataque.",
  PASSWORDS_COURSE_COMPLETED:
    "Completa el curso Gestión de contraseñas y autenticación.",
  INCIDENT_RESPONSE_COURSE_COMPLETED:
    "Completa el curso Respuesta a incidentes de seguridad.",
  WIFI_SECURITY_COURSE_COMPLETED:
    "Completa el curso Seguridad en redes WiFi.",
  EMERGING_THREATS_COURSE_COMPLETED:
    "Completa el curso Amenazas emergentes.",
  BASIC_LEARNER: "Completa 2 de los 5 cursos iniciales.",
  INTERMEDIATE_LEARNER: "Completa 3 de los 5 cursos iniciales.",
  ADVANCED_LEARNER: "Completa los 5 cursos iniciales.",
  FIRST_STEPS: "Completa tu primera lección.",
  FIRST_MODULE_COMPLETED: "Completa tu primer módulo de aprendizaje.",
  FIRST_LAB_COMPLETED: "Completa tu primer laboratorio práctico.",
  COURSE_MEDAL_COLLECTOR: "Consigue las cinco medallas de los cursos.",
  UNICYBER_EXPERT:
    "Consigue todos los reconocimientos principales de UniCyber Academy.",
};

interface AchievementCardProps {
  entry: AchievementEntry;
}

function formatDate(value: string | null): string {
  if (!value) {
    return "—";
  }

  return new Date(value).toLocaleDateString("es-ES", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}

export function AchievementCard({ entry }: AchievementCardProps) {
  const requirement = REQUIREMENT_BY_CODE[entry.code];
  const categoryLabel = CATEGORY_LABELS[entry.category] ?? entry.category;
  const color = CATEGORY_COLOR[entry.category] ?? "blue";

  return (
    <Card className="p-5 border border-border/60">
      <div className="flex flex-col items-center gap-3">
        <AchievementBadge entry={entry} size="lg" />
        <Badge color={color}>{categoryLabel}</Badge>
      </div>
      <h3 className="text-sm font-semibold text-white">{entry.name}</h3>
      <p className="mt-1 text-xs text-muted-foreground line-clamp-2">
        {entry.description}
      </p>
      <div className="mt-3 rounded-lg border border-white/10 bg-white/5 p-3">
        <p className="text-xs font-semibold text-white mb-1">
          {entry.earned ? "Desbloqueado" : "Bloqueado"}
        </p>
        <p className="text-xs text-muted-foreground">
          {entry.earned
            ? `Obtenido el ${formatDate(entry.earnedAt)}`
            : requirement ?? "Requisito no disponible."}
        </p>
      </div>
      {entry.earned && (
        <div className="mt-4 flex items-center gap-2 text-xs">
          <CheckCircle
            className="text-green text-[10px]"
            size={12}
            aria-hidden="true"
          />
          <span className="text-green/90 font-medium">
            Logro obtenido
          </span>
        </div>
      )}
      {!entry.earned && (
        <div className="mt-4 flex items-center gap-2 text-xs">
          <Lock className="text-gray-500 text-[10px]" size={12} />
          <span className="text-gray-500 font-medium">
            Requiere: {requirement ?? "Consulta los requisitos del logro."}
          </span>
        </div>
      )}
    </Card>
  );
}
