import { useEffect, useState, type FormEvent } from "react";
import { KeyRound, ShieldCheck, UserRound } from "lucide-react";
import { AuthenticatedLayout } from "../../components/layout/AuthenticatedLayout";
import { AchievementSummaryCard } from "../../components/achievements/AchievementSummaryCard";
import { Alert } from "../../components/ui/Alert";
import { Avatar } from "../../components/ui/Avatar";
import { Badge } from "../../components/ui/Badge";
import { Button } from "../../components/ui/Button";
import { Card } from "../../components/ui/Card";
import { Input } from "../../components/ui/Input";
import { ApiError } from "../../lib/api";
import { isAdminRole } from "../../lib/auth";
import { useAuth } from "../../context/AuthContext";
import {
  getAchievementSummaryRequest,
  getPendingAchievementNotificationsRequest,
} from "../../services/achievements";
import {
  changePasswordRequest,
  getMyProfileRequest,
  updateUsernameRequest,
} from "../../services/users";
import type { AchievementDashboardSummary } from "../../types/achievement";
import type { FieldErrors, UserProfile } from "../../types/auth";
import type { NavigateFn } from "../../types/navigation";

export interface ProfilePageProps {
  navigate: NavigateFn;
}

const ROLE_LABELS: Record<string, string> = {
  STUDENT: "Estudiante",
  TEACHER: "Docente",
  ADMINISTRATIVE: "Administrador",
  VISITOR: "Visitante",
  MENTOR: "Mentor",
};

function roleLabel(role: string): string {
  return ROLE_LABELS[role] ?? role;
}

export function ProfilePage({ navigate }: ProfilePageProps) {
  const { user, logout } = useAuth();
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [summary, setSummary] = useState<AchievementDashboardSummary | null>(
    null,
  );
  const [pendingNotifications, setPendingNotifications] = useState(0);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);

  const [username, setUsername] = useState("");
  const [usernameErrors, setUsernameErrors] = useState<FieldErrors>({});
  const [usernameMessage, setUsernameMessage] = useState<{
    variant: "success" | "error";
    text: string;
  } | null>(null);
  const [savingUsername, setSavingUsername] = useState(false);

  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [passwordErrors, setPasswordErrors] = useState<FieldErrors>({});
  const [passwordMessage, setPasswordMessage] = useState<{
    variant: "success" | "error";
    text: string;
  } | null>(null);
  const [savingPassword, setSavingPassword] = useState(false);

  useEffect(() => {
    let active = true;

    setLoading(true);

    void Promise.all([
      getMyProfileRequest(),
      getAchievementSummaryRequest(),
      getPendingAchievementNotificationsRequest(),
    ])
      .then(([loadedProfile, loadedSummary, pending]) => {
        if (!active) {
          return;
        }

        setProfile(loadedProfile);
        setUsername(loadedProfile.username ?? "");
        setSummary(loadedSummary);
        setPendingNotifications(pending.notifications.length);
        setLoading(false);
      })
      .catch((requestError: unknown) => {
        if (!active) {
          return;
        }

        setLoadError(
          requestError instanceof ApiError
            ? requestError.message
            : "No se pudo cargar tu perfil.",
        );
        setLoading(false);
      });

    return () => {
      active = false;
    };
  }, []);

  if (!user) {
    return null;
  }

  const handleUsernameSubmit = async (
    event: FormEvent<HTMLFormElement>,
  ) => {
    event.preventDefault();

    if (savingUsername) {
      return;
    }

    const trimmed = username.trim();
    const errors: FieldErrors = {};

    if (!trimmed) {
      errors["username"] = "Este campo es obligatorio.";
    } else if (trimmed.length < 3) {
      errors["username"] =
        "El nombre de usuario debe tener al menos 3 caracteres.";
    } else if (trimmed.length > 100) {
      errors["username"] =
        "El nombre de usuario no puede superar los 100 caracteres.";
    }

    setUsernameErrors(errors);
    setUsernameMessage(null);

    if (Object.keys(errors).length > 0) {
      return;
    }

    setSavingUsername(true);

    try {
      const updated = await updateUsernameRequest({ username: trimmed });
      setProfile(updated);
      setUsername(updated.username ?? "");
      setUsernameMessage({
        variant: "success",
        text: "Nombre de usuario actualizado correctamente.",
      });
    } catch (error) {
      if (error instanceof ApiError) {
        if (error.fields) {
          setUsernameErrors(error.fields);
        }

        setUsernameMessage({ variant: "error", text: error.message });
      } else {
        setUsernameMessage({
          variant: "error",
          text: "No se pudo actualizar el nombre de usuario.",
        });
      }
    } finally {
      setSavingUsername(false);
    }
  };

  const handlePasswordSubmit = async (
    event: FormEvent<HTMLFormElement>,
  ) => {
    event.preventDefault();

    if (savingPassword) {
      return;
    }

    const errors: FieldErrors = {};

    if (!currentPassword) {
      errors["currentPassword"] = "Este campo es obligatorio.";
    }

    if (!newPassword) {
      errors["newPassword"] = "Este campo es obligatorio.";
    } else if (newPassword.length < 8) {
      errors["newPassword"] =
        "La contraseña debe tener al menos 8 caracteres.";
    } else if (newPassword.length > 128) {
      errors["newPassword"] =
        "La contraseña no puede superar los 128 caracteres.";
    }

    if (newPassword !== confirmPassword) {
      errors["confirmPassword"] = "Las contraseñas no coinciden.";
    }

    setPasswordErrors(errors);
    setPasswordMessage(null);

    if (Object.keys(errors).length > 0) {
      return;
    }

    setSavingPassword(true);

    try {
      await changePasswordRequest({
        currentPassword,
        newPassword,
        confirmPassword,
      });
      setPasswordMessage({
        variant: "success",
        text: "Contraseña actualizada. Inicia sesión nuevamente con tu nueva contraseña.",
      });
      setCurrentPassword("");
      setNewPassword("");
      setConfirmPassword("");
      await logout(
        "Contraseña actualizada. Inicia sesión nuevamente con tu nueva contraseña.",
      );
      navigate("/login");
    } catch (error) {
      if (error instanceof ApiError) {
        if (error.fields) {
          setPasswordErrors(error.fields);
        }

        setPasswordMessage({ variant: "error", text: error.message });
      } else {
        setPasswordMessage({
          variant: "error",
          text: "No se pudo cambiar la contraseña.",
        });
      }
    } finally {
      setSavingPassword(false);
    }
  };

  const fullName = `${user.firstName} ${user.lastName}`;

  return (
    <AuthenticatedLayout
      title="Mi perfil"
      currentPath="/profile"
      navigate={navigate}
    >
      <div className="mx-auto max-w-3xl space-y-5">
        <Card className="flex flex-col gap-4 p-5 sm:flex-row sm:items-center">
          <Avatar name={fullName} size="lg" />
          <div className="min-w-0 flex-1">
            <h1 className="text-xl font-bold text-white">{fullName}</h1>
            <p className="text-sm text-muted-foreground">{user.email}</p>
          </div>
          <Badge color={isAdminRole(user.role) ? "purple" : "blue"}>
            {roleLabel(user.role)}
          </Badge>
        </Card>

        {loadError && (
          <Alert variant="error">{loadError}</Alert>
        )}

        {loading ? (
          <Card className="p-5">
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <span
                className="h-4 w-4 animate-spin rounded-full border-2 border-primary border-t-transparent"
                aria-hidden="true"
              />
              Cargando tu perfil...
            </div>
          </Card>
        ) : (
          <>
            <Card className="p-5">
              <div className="mb-4 flex items-center gap-2">
                <UserRound size={18} className="text-primary" aria-hidden="true" />
                <h2 className="text-sm font-semibold text-white">
                  Información personal
                </h2>
              </div>

              <dl className="grid gap-3 sm:grid-cols-2">
                <div>
                  <dt className="text-xs text-muted-foreground">
                    Nombre completo
                  </dt>
                  <dd className="text-sm text-white">{fullName}</dd>
                </div>
                <div>
                  <dt className="text-xs text-muted-foreground">
                    Correo electrónico
                  </dt>
                  <dd className="truncate text-sm text-white">{user.email}</dd>
                </div>
                <div>
                  <dt className="text-xs text-muted-foreground">Rol</dt>
                  <dd className="text-sm text-white">
                    {roleLabel(profile?.role ?? user.role)}
                  </dd>
                </div>
                <div>
                  <dt className="text-xs text-muted-foreground">
                    Estado de la cuenta
                  </dt>
                  <dd className="text-sm text-white">
                    {(profile?.status ?? user.status) === "ACTIVE"
                      ? "Activa"
                      : "Deshabilitada"}
                  </dd>
                </div>
              </dl>

              <form
                className="mt-5 space-y-3 border-t border-border-subtle pt-5"
                onSubmit={handleUsernameSubmit}
                noValidate
              >
                <h3 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                  Nombre de usuario
                </h3>

                {usernameMessage && (
                  <Alert variant={usernameMessage.variant}>
                    {usernameMessage.text}
                  </Alert>
                )}

                <Input
                  label="Nombre de usuario"
                  name="username"
                  value={username}
                  onChange={(event) => setUsername(event.target.value)}
                  error={usernameErrors["username"]}
                  helperText="Este nombre te identifica dentro de la plataforma."
                  disabled={savingUsername}
                  autoComplete="username"
                />

                <div className="flex justify-end">
                  <Button
                    type="submit"
                    variant="primary"
                    disabled={
                      savingUsername ||
                      username.trim() === (profile?.username ?? "")
                    }
                  >
                    {savingUsername ? "Guardando..." : "Guardar cambios"}
                  </Button>
                </div>
              </form>
            </Card>

            <Card className="p-5">
              <div className="mb-4 flex items-center gap-2">
                <KeyRound size={18} className="text-accent" aria-hidden="true" />
                <h2 className="text-sm font-semibold text-white">
                  Seguridad de la cuenta
                </h2>
              </div>

              <p className="mb-4 flex items-center gap-2 text-xs text-muted-foreground">
                <ShieldCheck size={14} aria-hidden="true" />
                Al cambiar la contraseña se cerrarán tus sesiones activas.
              </p>

              <form
                className="space-y-3"
                onSubmit={handlePasswordSubmit}
                noValidate
              >
                {passwordMessage && (
                  <Alert variant={passwordMessage.variant}>
                    {passwordMessage.text}
                  </Alert>
                )}

                <Input
                  label="Contraseña actual"
                  name="currentPassword"
                  type="password"
                  value={currentPassword}
                  onChange={(event) => setCurrentPassword(event.target.value)}
                  error={passwordErrors["currentPassword"]}
                  autoComplete="current-password"
                  disabled={savingPassword}
                />

                <Input
                  label="Nueva contraseña"
                  name="newPassword"
                  type="password"
                  value={newPassword}
                  onChange={(event) => setNewPassword(event.target.value)}
                  error={passwordErrors["newPassword"]}
                  helperText="Debe tener al menos 8 caracteres."
                  autoComplete="new-password"
                  disabled={savingPassword}
                />

                <Input
                  label="Confirmar nueva contraseña"
                  name="confirmPassword"
                  type="password"
                  value={confirmPassword}
                  onChange={(event) => setConfirmPassword(event.target.value)}
                  error={passwordErrors["confirmPassword"]}
                  autoComplete="new-password"
                  disabled={savingPassword}
                />

                <div className="flex justify-end">
                  <Button
                    type="submit"
                    variant="primary"
                    disabled={savingPassword}
                    aria-busy={savingPassword}
                  >
                    {savingPassword
                      ? "Actualizando..."
                      : "Cambiar contraseña"}
                  </Button>
                </div>
              </form>
            </Card>

            <AchievementSummaryCard
              summary={summary}
              pendingNotifications={pendingNotifications}
              loading={false}
              onViewAchievements={() => navigate("/achievements")}
            />
          </>
        )}
      </div>
    </AuthenticatedLayout>
  );
}
