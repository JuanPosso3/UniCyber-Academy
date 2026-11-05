import { useEffect, useState } from "react";
import { X } from "lucide-react";
import { Button } from "../ui/Button";
import { Card } from "../ui/Card";
import { AchievementBadge } from "./AchievementBadge";
import type { UserAchievement } from "../../types/achievement";

interface AchievementNotificationProps {
  open: boolean;
  notifications: UserAchievement[];
  onClose: () => void;
  onMarkViewed: (ids: number[]) => void;
}

const CONGRATULATIONS_MESSAGES: Record<string, string> = {
  PHISHING_COURSE_COMPLETED:
    "¡Excelente! Ahora reconoces mejor los intentos de fraude digital y sabes cómo protegerte.",
  PASSWORDS_COURSE_COMPLETED:
    "Tus cuentas están más seguras. Dominas las contraseñas seguras y la autenticación multifactor.",
  INCIDENT_RESPONSE_COURSE_COMPLETED:
    "Sabes cómo actuar y reportar un incidente de seguridad cuando lo necesitas.",
  WIFI_SECURITY_COURSE_COMPLETED:
    "Conectarse a redes WiFi es más seguro para ti ahora que identificas los riesgos inalámbricos.",
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

export function AchievementNotification({
  open,
  notifications,
  onClose,
  onMarkViewed,
}: AchievementNotificationProps) {
  const [index, setIndex] = useState(0);

  useEffect(() => {
    setIndex(0);
  }, [open]);

  const notification = notifications[index];
  const isLast = index === notifications.length - 1;
  const idsToMark = notifications.map((n) => n.id);

  const handleClose = (): void => {
    onMarkViewed(idsToMark);
    onClose();
  };

  const handleNext = (): void => {
    if (isLast) {
      handleClose();
    } else {
      setIndex((current) => current + 1);
    }
  };

  if (!open || !notifications.length) {
    return null;
  }

  return (
    <div
      className="fixed inset-0 z-60 flex items-center justify-center bg-black/60 px-4"
      role="dialog"
      aria-modal="true"
      aria-labelledby="achievement-notification-title"
      onMouseDown={(event) => {
        if (event.target === event.currentTarget) {
          handleClose();
        }
      }}
    >
      <Card className="w-full max-w-md rounded-2xl border border-border bg-card shadow-2xl">
        <div className="p-6">
          <div className="flex items-center gap-3 mb-4">
            <AchievementBadge
              entry={{
                code: notification.achievement.code,
                name: notification.achievement.name,
                category: notification.achievement.category,
                earned: true,
                earnedAt: notification.earnedAt,
              }}
              size="lg"
            />
            <div className="flex-1">
              <h2 id="achievement-notification-title" className="text-lg font-bold text-white">
                ¡Logro desbloqueado!
              </h2>
              <p className="text-sm text-muted-foreground">
                {CONGRATULATIONS_MESSAGES[
                  notification.achievement.code
                ] ?? "Has obtenido un nuevo reconocimiento."}
              </p>
            </div>
            <Button type="button" variant="ghost" size="sm" onClick={handleClose}>
              <X size={14} />
            </Button>
          </div>

          <div className="mt-4 border-t border-border/50 pt-4">
            <h3 className="text-sm font-semibold text-white">
              {notification.achievement.name}
            </h3>
            <p className="mt-1 text-xs text-muted-foreground">
              {notification.achievement.description}
            </p>
            <p className="mt-2 text-xs text-muted-foreground">
              Obtenido el{" "}
              {new Date(notification.earnedAt).toLocaleDateString("es-ES", {
                day: "numeric",
                month: "short",
                year: "numeric",
              })}
            </p>
          </div>

          <div className="mt-6 flex justify-end gap-2">
            <Button type="button" variant="secondary" onClick={handleNext}>
              {isLast ? "Cerrar" : "Siguiente"}
            </Button>
            {!isLast && (
              <Button type="button" variant="primary" onClick={handleClose}>
                Ver mis logros
              </Button>
            )}
          </div>
        </div>
      </Card>
    </div>
  );
}
