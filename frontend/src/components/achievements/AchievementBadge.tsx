import { Lock, Shield, Star, Award } from "lucide-react";
import { cn } from "../../lib/utils";

export interface AchievementBadgeProps {
  entry: {
    code: string;
    name: string;
    category: string;
    earned: boolean;
    earnedAt: string | null;
  };
  size?: "sm" | "md" | "lg";
}

/** Icono base asociado a cada logro del catálogo inicial. */
const ICON_BY_CODE: Record<string, typeof Shield> = {
  PHISHING_COURSE_COMPLETED: Shield,
  PASSWORDS_COURSE_COMPLETED: Shield,
  INCIDENT_RESPONSE_COURSE_COMPLETED: Shield,
  WIFI_SECURITY_COURSE_COMPLETED: Shield,
  EMERGING_THREATS_COURSE_COMPLETED: Shield,
  BASIC_LEARNER: Shield,
  INTERMEDIATE_LEARNER: Shield,
  ADVANCED_LEARNER: Shield,
  FIRST_STEPS: Star,
  FIRST_MODULE_COMPLETED: Shield,
  FIRST_LAB_COMPLETED: Shield,
  COURSE_MEDAL_COLLECTOR: Shield,
  UNICYBER_EXPERT: Award,
};

/** Color metálico o de categoría para el logro desbloqueado. */
function medalColor(entry: AchievementBadgeProps["entry"]): string {
  if (entry.category === "LEARNING_RANK") {
    const metals: Record<string, string> = {
      BASIC_LEARNER: "bronze",
      INTERMEDIATE_LEARNER: "silver",
      ADVANCED_LEARNER: "gold",
    };
    return metals[entry.code] ?? "purple";
  }

  if (entry.code === "UNICYBER_EXPERT") {
    return "purple";
  }

  if (entry.category === "COURSE_MEDAL") {
    return "blue";
  }

  return "cyan";
}

const COLOR_CLASSES: Record<string, string> = {
  bronze: "bg-amber-900/20 text-amber-500 border-amber-500/40",
  silver: "bg-gray-900/20 text-gray-400 border-gray-400/40",
  gold: "bg-yellow-900/20 text-yellow-400 border-yellow-400/40",
  purple: "bg-purple-900/20 text-purple-400 border-purple-400/40",
  blue: "bg-primary/20 text-primary border-primary/40",
  cyan: "bg-accent/20 text-accent border-accent/40",
};

const SIZE_CLASSES: Record<string, string> = {
  sm: "h-10 w-10",
  md: "h-14 w-14",
  lg: "h-20 w-20",
};

const ICON_SIZE_CLASSES: Record<string, string> = {
  sm: "h-5 w-5",
  md: "h-7 w-7",
  lg: "h-10 w-10",
};

export function AchievementBadge({
  entry,
  size = "md",
}: AchievementBadgeProps) {
  const Icon = ICON_BY_CODE[entry.code] ?? Shield;
  const color = medalColor(entry);
  const isLocked = !entry.earned;

  return (
    <div
      className={cn(
        "flex flex-col items-center gap-1.5 transition-all duration-300",
        SIZE_CLASSES[size],
      )}
    >
      <div
        className={cn(
          "flex h-full w-full items-center justify-center rounded-2xl border font-bold shadow-sm",
          isLocked
            ? "bg-white/5 text-gray-500 border-gray-700/50"
            : COLOR_CLASSES[color],
        )}
      >
        <Icon
          className={cn(
            "flex-shrink-0",
            isLocked ? "text-gray-500" : "",
            ICON_SIZE_CLASSES[size],
          )}
          aria-hidden="true"
        />
        {isLocked && (
          <Lock
            className="absolute inset-0 flex items-center justify-center text-gray-500/60"
            size={12}
            aria-hidden="true"
          />
        )}
      </div>
      <span
        className={cn(
          "text-xs font-semibold leading-tight text-center",
          isLocked
            ? "text-gray-500"
            : "text-white",
        )}
      >
        {entry.name}
      </span>
    </div>
  );
}
