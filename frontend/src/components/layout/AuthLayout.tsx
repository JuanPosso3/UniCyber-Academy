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
  featured?: boolean;
}

export function AuthLayout({ title, subtitle, footer, children, featured = false }: AuthLayoutProps) {
  return (
    <div className="min-h-screen bg-background flex items-center justify-center px-4 py-10 relative overflow-hidden">
      <div
        className="absolute top-0 left-1/2 -translate-x-1/2 w-[600px] h-[400px] bg-primary/8 rounded-full blur-3xl pointer-events-none"
        aria-hidden="true"
      />
      <div className={featured ? "relative grid w-full max-w-5xl items-center gap-8 lg:grid-cols-2 lg:gap-20" : "relative w-full max-w-sm"}>
      {featured && (
        <section className="text-center lg:text-left" aria-label="UniCyber Academy">
          <p className="mb-4 text-sm font-semibold tracking-widest text-accent">UniCyber Academy</p>
          <div className="relative mx-auto mb-6 hidden h-40 w-40 items-center justify-center rounded-full border border-accent/20 bg-gradient-to-br from-primary/20 to-accent/5 sm:flex lg:mx-0" aria-hidden="true">
            <div className="absolute inset-4 rounded-full border border-primary/30" />
            <Shield size={64} className="text-accent" strokeWidth={1.3} />
          </div>
          <p className="text-2xl font-bold leading-tight text-white sm:text-4xl">Construye tus habilidades. Defiende el futuro.</p>
          <p className="mx-auto mt-4 max-w-md text-sm leading-relaxed text-muted-foreground lg:mx-0 lg:text-base">Aprende a reconocer amenazas y fortalece tu seguridad digital con lecciones y actividades prácticas.</p>
        </section>
      )}
      <div className="mx-auto w-full max-w-sm">
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
    </div>
  );
}
