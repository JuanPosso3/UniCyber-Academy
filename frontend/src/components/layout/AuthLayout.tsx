import type { ReactNode } from "react";
import { Shield } from "lucide-react";

/**
 * AuthLayout — Design System UniCyber Academy (Fase 1)
 *
 * Extraído literalmente del AuthLayout inline de App.tsx (líneas
 * 603-624 del original, verificado contra el código fuente real).
 * Usado por Login y Register. `footer` se mantiene como ReactNode
 * (igual que el original) para no perder la flexibilidad del texto +
 * link de alternancia login/registro tal como estaba escrito.
 */

export interface AuthLayoutProps {
  title: string;
  subtitle: string;
  footer: ReactNode;
  children: ReactNode;
}

export function AuthLayout({ title, subtitle, footer, children }: AuthLayoutProps) {
  return (
    <div className="min-h-screen bg-background flex items-center justify-center px-4 relative overflow-hidden">
      <div
        className="absolute top-0 left-1/2 -translate-x-1/2 w-[600px] h-[400px] bg-primary/8 rounded-full blur-3xl pointer-events-none"
        aria-hidden="true"
      />
      <div className="w-full max-w-sm relative">
        <div className="text-center mb-8">
          <div className="w-12 h-12 rounded-2xl bg-primary flex items-center justify-center mx-auto mb-4">
            <Shield size={22} className="text-white" />
          </div>
          <h1 className="text-2xl font-bold text-white mb-1">{title}</h1>
          <p className="text-sm text-muted-foreground">{subtitle}</p>
        </div>
        <div className="bg-card border border-border rounded-2xl p-6">{children}</div>
        <div className="text-center mt-4 text-sm text-muted-foreground">{footer}</div>
      </div>
    </div>
  );
}
