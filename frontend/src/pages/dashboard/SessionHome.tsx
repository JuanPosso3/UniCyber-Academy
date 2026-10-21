import { LogOut, Mail, Shield, UserRound } from "lucide-react";
import { Button } from "../../components/ui/Button";
import { Card } from "../../components/ui/Card";
import { useAuth } from "../../context/AuthContext";
import type { UserRole } from "../../types/auth";
import type { NavigateFn } from "../../types/navigation";

const ROLE_LABELS: Record<UserRole, string> = {
  STUDENT: "Estudiante",
  TEACHER: "Docente",
  ADMINISTRATIVE: "Administrativo",
  VISITOR: "Visitante",
  MENTOR: "Mentor",
};

export interface SessionHomeProps {
  navigate: NavigateFn;
}

/**
 * Pantalla mínima posterior al login.
 *
 * No sustituye al Dashboard completo del frontend original: sirve
 * como ancla protegida para verificar que la sesión real funciona.
 */
export function SessionHome({ navigate }: SessionHomeProps) {
  const { user, logout, isSubmitting } = useAuth();

  if (!user) {
    return null;
  }

  const handleLogout = async () => {
    await logout();
    navigate("login");
  };

  return (
    <div className="min-h-screen bg-background flex items-center justify-center px-4 relative overflow-hidden">
      <div
        className="absolute top-0 left-1/2 -translate-x-1/2 w-[600px] h-[400px] bg-primary/8 rounded-full blur-3xl pointer-events-none"
        aria-hidden="true"
      />
      <Card className="w-full max-w-md relative p-6">
        <div className="text-center mb-6">
          <div className="w-12 h-12 rounded-2xl bg-primary flex items-center justify-center mx-auto mb-4">
            <Shield size={22} className="text-white" />
          </div>
          <h1 className="text-2xl font-bold text-white mb-1">
            Hola, {user.firstName}
          </h1>
          <p className="text-sm text-muted-foreground">
            Tu sesión está activa.
          </p>
        </div>

        <div className="space-y-3 mb-6">
          <div className="flex items-center gap-3 rounded-xl border border-border bg-white/5 px-3 py-2.5">
            <Mail size={16} className="text-primary shrink-0" />
            <div className="min-w-0">
              <p className="text-xs text-muted-foreground">
                Correo electrónico
              </p>
              <p className="text-sm text-white truncate">{user.email}</p>
            </div>
          </div>

          <div className="flex items-center gap-3 rounded-xl border border-border bg-white/5 px-3 py-2.5">
            <UserRound size={16} className="text-primary shrink-0" />
            <div className="min-w-0">
              <p className="text-xs text-muted-foreground">Rol</p>
              <p className="text-sm text-white">
                {ROLE_LABELS[user.role]}
              </p>
            </div>
          </div>
        </div>

        <Button
          type="button"
          variant="secondary"
          className="w-full justify-center"
          onClick={handleLogout}
          disabled={isSubmitting}
          aria-busy={isSubmitting}
        >
          {isSubmitting ? (
            "Cerrando sesión..."
          ) : (
            <>
              <LogOut size={16} /> Cerrar sesión
            </>
          )}
        </Button>
      </Card>
    </div>
  );
}
