import type { HTMLAttributes } from "react";
import { cn } from "../../lib/utils";

/**
 * Card — Design System UniCyber Academy (Fase 1)
 *
 * Formaliza el patrón `bg-card border border-border rounded-2xl`
 * repetido manualmente en decenas de lugares de App.tsx (Fase 0,
 * sección 11 — Cards). No se sobre-abstrae: Card, CardHeader,
 * CardContent y CardFooter son simples envoltorios de padding sobre
 * la misma superficie, tal como pide el brief de Fase 1 (sección 11).
 *
 * `tone` cubre el patrón de "borde semántico" visto en certificados
 * obtenidos, labs completados, etc. (border-[color]/20).
 * `interactive` cubre el patrón de hover con elevación visto en cards
 * de curso/lab/categoría (hover:-translate-y-0.5/1 hover:shadow-xl).
 */

export type CardTone = "default" | "success" | "warning" | "danger" | "primary";

export interface CardProps extends HTMLAttributes<HTMLDivElement> {
  interactive?: boolean;
  tone?: CardTone;
}

const toneBorder: Record<CardTone, string> = {
  default: "border-border",
  success: "border-success/20",
  warning: "border-warning/20",
  danger: "border-destructive/20",
  primary: "border-primary/20",
};

export function Card({
  interactive = false,
  tone = "default",
  className = "",
  children,
  ...rest
}: CardProps) {
  return (
    <div
      className={cn(
        "bg-card rounded-2xl border",
        toneBorder[tone],
        interactive &&
          "transition-all duration-200 hover:border-border-strong hover:-translate-y-0.5 hover:shadow-xl",
        className
      )}
      {...rest}
    >
      {children}
    </div>
  );
}

export function CardHeader({ className = "", ...rest }: HTMLAttributes<HTMLDivElement>) {
  return <div className={cn("p-5 pb-0", className)} {...rest} />;
}

export function CardContent({ className = "", ...rest }: HTMLAttributes<HTMLDivElement>) {
  return <div className={cn("p-5", className)} {...rest} />;
}

export function CardFooter({ className = "", ...rest }: HTMLAttributes<HTMLDivElement>) {
  return <div className={cn("p-5 pt-0", className)} {...rest} />;
}
