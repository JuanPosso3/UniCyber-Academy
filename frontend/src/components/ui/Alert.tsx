import type { ReactNode } from "react";
import { CheckCircle, XCircle, AlertTriangle, Info } from "lucide-react";
import type { LucideIcon } from "lucide-react";
import { cn } from "../../lib/utils";

/**
 * Alert — Design System UniCyber Academy (Fase 1)
 *
 * Nuevo componente (Fase 0 había detectado, sección 11 — Alerts, que
 * no existía un componente genérico: los mensajes de estado estaban
 * hardcoded ad-hoc, p. ej. el resultado de la flag en LabDetail).
 * Cubre: flag correcto/incorrecto, acciones exitosas, errores,
 * advertencias. Siempre combina color + icono + texto (nunca depende
 * solo del color para transmitir el estado, requisito de accesibilidad
 * de Fase 1, sección 22).
 */

export type AlertVariant = "success" | "error" | "warning" | "info";

export interface AlertProps {
  variant?: AlertVariant;
  children: ReactNode;
  icon?: ReactNode;
  className?: string;
}

const variantConfig: Record<AlertVariant, { classes: string; Icon: LucideIcon }> = {
  success: { classes: "bg-success/10 border-success/20 text-success", Icon: CheckCircle },
  error: { classes: "bg-destructive/10 border-destructive/20 text-destructive", Icon: XCircle },
  warning: { classes: "bg-warning/10 border-warning/20 text-warning", Icon: AlertTriangle },
  info: { classes: "bg-accent/10 border-accent/20 text-accent", Icon: Info },
};

export function Alert({ variant = "info", children, icon, className = "" }: AlertProps) {
  const { classes, Icon } = variantConfig[variant];

  return (
    <div
      role={variant === "error" ? "alert" : "status"}
      className={cn("flex items-center gap-2 rounded-xl border px-3 py-2", classes, className)}
    >
      {icon ?? <Icon size={14} />}
      <span className="text-xs font-semibold">{children}</span>
    </div>
  );
}
