import { useState, type ReactNode } from "react";
import { CheckCircle2, Lightbulb, LockKeyhole } from "lucide-react";
import { Alert } from "../../ui/Alert";
import { Badge } from "../../ui/Badge";
import { Button } from "../../ui/Button";
import { Card } from "../../ui/Card";
import { InlineText } from "../InlineText";
import type { LabActivity } from "../../../types/lesson";

export type ActivityFeedback = "idle" | "correct" | "incorrect";

export interface ActivityFrameProps {
  activity: LabActivity;
  solved: boolean;
  feedback: ActivityFeedback;
  isChecking: boolean;
  canCheck: boolean;
  answer: unknown;
  showCheckButton?: boolean;
  checkLabel?: string;
  onCheck: (answer: unknown) => void;
  children: ReactNode;
}

export function ActivityFrame({
  activity,
  solved,
  feedback,
  isChecking,
  canCheck,
  answer,
  showCheckButton = true,
  checkLabel = "Comprobar",
  onCheck,
  children,
}: ActivityFrameProps) {
  const hints = activity.hints ?? [];
  const [visibleHints, setVisibleHints] = useState(0);
  const required = activity.required !== false;

  return (
    <Card className="p-5" tone={solved ? "success" : "default"}>
      <div className="mb-4 flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0">
          <div className="mb-1 flex flex-wrap items-center gap-2">
            <h3 className="text-base font-semibold text-white">
              {activity.title}
            </h3>
            <Badge color={required ? "cyan" : "gray"}>
              {required ? "Obligatoria" : "Opcional"}
            </Badge>
            {solved && (
              <Badge color="green">
                <CheckCircle2 size={12} className="mr-1" aria-hidden="true" />
                Completada
              </Badge>
            )}
          </div>
          <p className="text-sm leading-6 text-muted-foreground">
            <InlineText text={activity.instructions} />
          </p>
        </div>
        <span className="flex h-8 w-8 items-center justify-center rounded-xl bg-white/5 text-muted-foreground">
          {solved ? (
            <CheckCircle2 size={16} className="text-success" aria-hidden="true" />
          ) : (
            <LockKeyhole size={15} aria-hidden="true" />
          )}
        </span>
      </div>

      {children}

      {hints.length > 0 && (
        <div className="mt-4 border-t border-border/70 pt-3">
          {visibleHints > 0 && (
            <div className="mb-3 space-y-2">
              {hints.slice(0, visibleHints).map((hint, index) => (
                <Alert key={`${activity.id}-hint-${index}`} variant="info">
                  <Lightbulb size={14} aria-hidden="true" />
                  <span>
                    <span className="font-bold">Pista {index + 1}: </span>
                    {hint}
                  </span>
                </Alert>
              ))}
            </div>
          )}
          <Button
            type="button"
            variant="ghost"
            size="sm"
            disabled={visibleHints >= hints.length || solved}
            onClick={() => setVisibleHints((value) => value + 1)}
          >
            <Lightbulb size={14} />
            {visibleHints >= hints.length
              ? "No hay más pistas"
              : visibleHints === 0
                ? "Solicitar pista"
                : "Ver otra pista"}
          </Button>
        </div>
      )}

      <div className="mt-4 space-y-3">
        {feedback === "correct" && (
          <Alert variant="success">Respuesta correcta.</Alert>
        )}
        {feedback === "incorrect" && (
          <Alert variant="error">
            Respuesta incorrecta. Inténtalo nuevamente.
          </Alert>
        )}

        {showCheckButton && !solved && (
          <Button
            type="button"
            variant="primary"
            disabled={!canCheck || isChecking}
            onClick={() => onCheck(answer)}
          >
            {isChecking ? "Comprobando..." : checkLabel}
          </Button>
        )}
      </div>
    </Card>
  );
}
