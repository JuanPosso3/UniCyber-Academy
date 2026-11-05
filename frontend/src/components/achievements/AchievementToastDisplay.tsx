import { useEffect, useState } from "react";
import { X } from "lucide-react";
import { Button } from "../ui/Button";
import { Card } from "../ui/Card";
import { AchievementBadge } from "./AchievementBadge";
import { useAchievementToast } from "../../context/AchievementToastContext";
import type { Achievement } from "../../types/achievement";

/** Mensaje de felicitación corto por código de logro. */
const CONGRATULATIONS_MESSAGES: Record<string, string> = {
  PHISHING_COURSE_COMPLETED:
    "¡Excelente! Ahora reconoces mejor los intentos de fraude digital y sabes cómo protegerte.",
  PASSWORDS_COURSE_COMPLETED:
    "Tus cuentas están más seguras. Dominas las contraseñas seguras y la autenticación multifactor.",
  INCIDENT_RESPONSE_COURSE_COMPLETED:
    "Sabes cómo actuar y reportar un incidente de seguridad cuando lo necesitas.",
  WIFI_SECURITY_COURSE_COMPLETED:
    "Conectarte a redes WiFi es más seguro ahora que identificas los riesgos inalámbricos.",
  EMERGING_THREATS_COURSE_COMPLETED:
    "Estás preparado para reconocer y prevenir las amenazas digitales emergentes.",
  BASIC_LEARNER:
    "Has completado dos cursos. Sigue avanzando en tu formación en ciberseguridad.",
  INTERMEDIATE_LEARNER:
    "Has completado tres cursos. Tu conocimiento en ciberseguridad crece constantemente.",
  ADVANCED_LEARNER:
    "Has completado los cinco cursos iniciales. ¡Dominio de los fundamentos!",
  FIRST_STEPS: "¡Primeros pasos dados! Has completado tu primera lección.",
  FIRST_MODULE_COMPLETED:
    "Has superado tu primer módulo de aprendizaje. ¡Buen comienzo!",
  FIRST_LAB_COMPLETED:
    "Has completado tu primer laboratorio práctico. ¡Manos a la obra!",
  COURSE_MEDAL_COLLECTOR:
    "Has conseguido las cinco medallas de los cursos. ¡Coleccionista completo!",
  UNICYBER_EXPERT:
    "Has alcanzado todos los reconocimientos principales. ¡Experto UniCyber!",
};

/** Componente de una sola notificación toast de logro. */
function AchievementToastItem({
  achievement,
  onRemove,
}: {
  achievement: Achievement;
  onRemove: (id: number) => void;
}) {
  const [visible, setVisible] = useState(true);

  // Auto-desaparece tras 6 segundos.
  useEffect(() => {
    const timer = setTimeout(() => {
      setVisible(false);
    }, 6000);

    return () => clearTimeout(timer);
  }, []);

  if (!visible) {
    return null;
  }

  return (
    <Card
      className="fixed top-4 right-4 z-60 w-full max-w-md rounded-2xl border border-border bg-card shadow-2xl animate-in slide-in-from-right fade-in duration-300"
      role="alert"
      aria-live="polite"
    >
      <div className="p-5">
        <div className="flex items-center gap-3 mb-3">
          <AchievementBadge
            entry={{
              code: achievement.code,
              name: achievement.name,
              category: achievement.category,
              earned: true,
              earnedAt: null,
            }}
            size="md"
          />
          <div className="flex-1">
            <h3 className="text-sm font-bold text-white">
              ¡Logro desbloqueado!
            </h3>
            <p className="text-xs text-muted-foreground">
              {CONGRATULATIONS_MESSAGES[
                achievement.code
              ] ?? "Has obtenido un nuevo reconocimiento."}
            </p>
          </div>
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={() => {
              setVisible(false);
              onRemove(achievement.id);
            }}
            aria-label="Cerrar notificación"
          >
            <X size={14} />
          </Button>
        </div>

        <div className="mt-3 flex items-center gap-2 text-xs">
          <span className="font-semibold text-white">{achievement.name}</span>
          <span className="text-muted-foreground">• {achievement.description}</span>
        </div>
      </div>
    </Card>
  );
}

export function AchievementToastDisplay() {
  const { toasts, removeToast } = useAchievementToast();

  return (
    <div className="pointer-events-none fixed top-4 right-4 z-60 flex flex-col gap-2 sm:flex-col-reverse">
      {toasts.map((achievement) => (
        <AchievementToastItem
          key={achievement.id}
          achievement={achievement}
          onRemove={removeToast}
        />
      ))}
    </div>
  );
}
