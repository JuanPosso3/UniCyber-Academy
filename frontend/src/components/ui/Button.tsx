import { forwardRef } from "react";
import type { ButtonHTMLAttributes, ReactNode } from "react";
import { cn } from "../../lib/utils";

/**
 * Button — Design System UniCyber Academy (Fase 1)
 *
 * Extraído del componente `Btn` inline de App.tsx (Fase 0, sección 11).
 * Conserva la estética original (rounded-xl, font-semibold,
 * transition-all duration-200, sombras de marca en primary/cyan) y
 * añade: soporte nativo de `<button>` (type, disabled real, eventos),
 * forwardRef, y estados de foco visibles para accesibilidad.
 */

export type ButtonVariant = "primary" | "secondary" | "ghost" | "danger" | "cyan";
export type ButtonSize = "sm" | "md" | "lg";

export interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant;
  size?: ButtonSize;
  children: ReactNode;
}

const sizeClasses: Record<ButtonSize, string> = {
  sm: "px-3 py-1.5 text-xs",
  md: "px-4 py-2 text-sm",
  lg: "px-6 py-3 text-base",
};

// Mapeo 1:1 con los colores usados en el Btn original (Fase 0):
// primary → bg-[#2563EB] hover:bg-[#1D4ED8]  ·  cyan → bg-[#06B6D4] hover:bg-[#0891B2]
// Se usan los tokens --primary/--accent en vez del hex literal; el hover
// se mantiene como valor puntual porque theme.css no define una variante
// "hover" de cada color (evita introducir una escala nueva innecesaria).
const variantClasses: Record<ButtonVariant, string> = {
  primary:
    "bg-primary text-primary-foreground hover:bg-[#1D4ED8] shadow-lg shadow-blue-900/30",
  secondary:
    "bg-card text-card-foreground border border-border hover:bg-secondary",
  ghost:
    "text-muted-foreground hover:text-foreground hover:bg-white/5",
  danger:
    "bg-destructive/10 text-destructive border border-destructive/20 hover:bg-destructive/20",
  cyan:
    "bg-accent text-accent-foreground hover:bg-[#0891B2] shadow-lg shadow-cyan-900/30",
};

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(function Button(
  {
    children,
    variant = "primary",
    size = "md",
    className = "",
    disabled = false,
    type = "button",
    ...rest
  },
  ref
) {
  return (
    <button
      ref={ref}
      type={type}
      disabled={disabled}
      className={cn(
        "inline-flex items-center justify-center gap-2 font-semibold rounded-xl transition-all duration-200 select-none",
        "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background",
        "disabled:opacity-40 disabled:pointer-events-none disabled:cursor-not-allowed",
        !disabled && "cursor-pointer",
        sizeClasses[size],
        variantClasses[variant],
        className
      )}
      {...rest}
    >
      {children}
    </button>
  );
});
