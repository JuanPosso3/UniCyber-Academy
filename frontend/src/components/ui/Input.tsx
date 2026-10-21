import { forwardRef, useId, useState } from "react";
import type { InputHTMLAttributes, ReactNode } from "react";
import { Eye, EyeOff } from "lucide-react";
import { cn } from "../../lib/utils";

/**
 * Input — Design System UniCyber Academy (Fase 1)
 *
 * Resuelve la duplicación identificada en Fase 0 (system-design.md,
 * sección 11 — Inputs y sección 22, NEEDS_REVIEW #7): existían dos
 * implementaciones distintas — `InputField` (Login/Register) y varios
 * inputs sueltos con clases repetidas manualmente (buscador del
 * Topbar, filtros de Cursos/Labs/Admin, input de flag del lab).
 *
 * Este componente único cubre todos esos casos: label, placeholder,
 * value, error, helper text, icono izquierdo, toggle de contraseña,
 * disabled, focus y accesibilidad (label asociado vía htmlFor/id,
 * aria-invalid, aria-describedby, botón de mostrar/ocultar con
 * aria-label y aria-pressed).
 */

export interface InputProps
  extends Omit<InputHTMLAttributes<HTMLInputElement>, "size"> {
  label?: string;
  error?: string;
  helperText?: string;
  icon?: ReactNode;
  containerClassName?: string;
}

export const Input = forwardRef<HTMLInputElement, InputProps>(function Input(
  {
    label,
    error,
    helperText,
    icon,
    type = "text",
    id,
    className = "",
    containerClassName = "",
    disabled,
    ...rest
  },
  ref
) {
  const generatedId = useId();
  const inputId = id ?? generatedId;
  const [showPwd, setShowPwd] = useState(false);
  const isPassword = type === "password";
  const actualType = isPassword ? (showPwd ? "text" : "password") : type;

  const errorId = `${inputId}-error`;
  const helperId = `${inputId}-helper`;
  const describedBy = error ? errorId : helperText ? helperId : undefined;

  return (
    <div className={cn("w-full", containerClassName)}>
      {label && (
        <label
          htmlFor={inputId}
          className="block text-xs font-semibold text-muted-foreground mb-1.5"
        >
          {label}
        </label>
      )}
      <div className="relative">
        {icon && (
          <div className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground pointer-events-none">
            {icon}
          </div>
        )}
        <input
          ref={ref}
          id={inputId}
          type={actualType}
          disabled={disabled}
          aria-invalid={error ? true : undefined}
          aria-describedby={describedBy}
          className={cn(
            "w-full bg-input-background border rounded-xl px-3 py-2.5 text-sm text-foreground placeholder:text-muted-foreground/70 transition-colors",
            "focus:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background",
            "disabled:opacity-40 disabled:cursor-not-allowed",
            error ? "border-destructive/60 focus:border-destructive" : "border-border focus:border-primary/60",
            icon && "pl-9",
            isPassword && "pr-10",
            className
          )}
          {...rest}
        />
        {isPassword && (
          <button
            type="button"
            onClick={() => setShowPwd((v) => !v)}
            disabled={disabled}
            aria-label={showPwd ? "Ocultar contraseña" : "Mostrar contraseña"}
            aria-pressed={showPwd}
            className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors disabled:pointer-events-none"
          >
            {showPwd ? <EyeOff size={15} /> : <Eye size={15} />}
          </button>
        )}
      </div>
      {error ? (
        <p id={errorId} className="mt-1.5 text-xs text-destructive">
          {error}
        </p>
      ) : helperText ? (
        <p id={helperId} className="mt-1.5 text-xs text-muted-foreground">
          {helperText}
        </p>
      ) : null}
    </div>
  );
});
