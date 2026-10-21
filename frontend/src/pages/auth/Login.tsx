import { useState, type FormEvent } from "react";
import { ArrowRight, Github, Lock, User } from "lucide-react";
import { AuthLayout } from "../../components/layout/AuthLayout";
import { Alert } from "../../components/ui/Alert";
import { Button } from "../../components/ui/Button";
import { Input } from "../../components/ui/Input";
import { useAuth } from "../../context/AuthContext";
import { ApiError } from "../../lib/api";
import type { FieldErrors } from "../../types/auth";
import type { NavigateFn } from "../../types/navigation";

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

function validateLoginForm(email: string, password: string): FieldErrors {
  const errors: FieldErrors = {};

  if (!email.trim()) {
    errors["email"] = "Este campo es obligatorio.";
  } else if (!EMAIL_PATTERN.test(email.trim())) {
    errors["email"] = "El correo electrónico no es válido.";
  }

  if (!password) {
    errors["password"] = "Este campo es obligatorio.";
  }

  return errors;
}

export interface LoginProps {
  navigate: NavigateFn;
}

export function Login({ navigate }: LoginProps) {
  const { login, isSubmitting, sessionNotice } = useAuth();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [fieldErrors, setFieldErrors] = useState<FieldErrors>({});
  const [generalError, setGeneralError] = useState<string | null>(null);

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    if (isSubmitting) {
      return;
    }

    const nextErrors = validateLoginForm(email, password);
    setFieldErrors(nextErrors);

    if (Object.keys(nextErrors).length > 0) {
      return;
    }

    setGeneralError(null);

    try {
      await login(email.trim(), password);
      navigate("dashboard");
    } catch (error) {
      if (error instanceof ApiError) {
        if (error.fields) {
          setFieldErrors(error.fields);
        }

        setGeneralError(error.message);
        return;
      }

      setGeneralError(
        "Ocurrió un error inesperado. Inténtalo de nuevo.",
      );
    }
  };

  return (
    <AuthLayout
      title="Bienvenido de vuelta"
      subtitle="Inicia sesión en tu cuenta"
      footer={
        <>
          ¿No tienes cuenta?{" "}
          <button
            type="button"
            className="text-primary hover:underline font-medium disabled:opacity-60 disabled:no-underline"
            onClick={() => navigate("register")}
            disabled={isSubmitting}
          >
            Regístrate gratis
          </button>
        </>
      }
    >
      <form className="space-y-4" onSubmit={handleSubmit} noValidate>
        {sessionNotice && (
          <Alert variant={sessionNotice.variant}>
            {sessionNotice.message}
          </Alert>
        )}

        {generalError && <Alert variant="error">{generalError}</Alert>}

        <Input
          label="Correo electrónico"
          name="email"
          type="email"
          placeholder="tu@email.com"
          icon={<User size={15} />}
          autoComplete="email"
          value={email}
          onChange={(event) => setEmail(event.target.value)}
          error={fieldErrors["email"]}
          disabled={isSubmitting}
          required
        />

        <Input
          label="Contraseña"
          name="password"
          type="password"
          placeholder="••••••••"
          icon={<Lock size={15} />}
          autoComplete="current-password"
          value={password}
          onChange={(event) => setPassword(event.target.value)}
          error={fieldErrors["password"]}
          disabled={isSubmitting}
          required
        />

        <div className="flex justify-end">
          <button
            type="button"
            className="text-xs text-primary opacity-60 cursor-not-allowed"
            disabled
            title="Disponible próximamente"
          >
            ¿Olvidaste tu contraseña?
          </button>
        </div>

        <Button
          type="submit"
          className="w-full justify-center"
          disabled={isSubmitting}
          aria-busy={isSubmitting}
        >
          {isSubmitting ? (
            "Verificando credenciales..."
          ) : (
            <>
              Ingresar <ArrowRight size={16} />
            </>
          )}
        </Button>

        <div className="relative flex items-center gap-3 my-2">
          <div className="flex-1 border-t border-white/10" />
          <span className="text-xs text-muted-foreground">
            o continúa con
          </span>
          <div className="flex-1 border-t border-white/10" />
        </div>

        <button
          type="button"
          className="w-full flex items-center justify-center gap-2 bg-white/5 border border-white/10 rounded-xl py-2.5 text-sm text-white opacity-60 cursor-not-allowed"
          disabled
          title="Disponible próximamente"
        >
          <Github size={16} /> GitHub
        </button>
      </form>
    </AuthLayout>
  );
}
