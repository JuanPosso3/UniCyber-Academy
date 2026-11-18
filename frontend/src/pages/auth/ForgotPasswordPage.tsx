import { useState, type FormEvent } from "react";
import { ArrowLeft, ArrowRight, KeyRound, Lock, Mail } from "lucide-react";
import { AuthLayout } from "../../components/layout/AuthLayout";
import { Alert } from "../../components/ui/Alert";
import { Button } from "../../components/ui/Button";
import { Input } from "../../components/ui/Input";
import { ApiError } from "../../lib/api";
import {
  requestRecoveryCodeRequest,
  resetPasswordRequest,
} from "../../services/passwordRecovery";
import type { FieldErrors } from "../../types/auth";
import type { NavigateFn } from "../../types/navigation";

export interface ForgotPasswordPageProps {
  navigate: NavigateFn;
}

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export function ForgotPasswordPage({ navigate }: ForgotPasswordPageProps) {
  const [step, setStep] = useState<"request" | "reset">("request");
  const [email, setEmail] = useState("");
  const [code, setCode] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [fieldErrors, setFieldErrors] = useState<FieldErrors>({});
  const [generalError, setGeneralError] = useState<string | null>(null);
  const [requestMessage, setRequestMessage] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleRequestCode = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    if (isSubmitting) {
      return;
    }

    const normalizedEmail = email.trim().toLowerCase();
    const errors: FieldErrors = {};

    if (!normalizedEmail) {
      errors["email"] = "Este campo es obligatorio.";
    } else if (!EMAIL_PATTERN.test(normalizedEmail)) {
      errors["email"] = "El correo electrónico no es válido.";
    }

    setFieldErrors(errors);
    setGeneralError(null);
    setRequestMessage(null);

    if (Object.keys(errors).length > 0) {
      return;
    }

    setIsSubmitting(true);

    try {
      const response = await requestRecoveryCodeRequest({
        email: normalizedEmail,
      });
      setRequestMessage(response.message);
      setEmail(normalizedEmail);
      setStep("reset");
    } catch (error) {
      if (error instanceof ApiError) {
        if (error.fields) {
          setFieldErrors(error.fields);
        }

        setGeneralError(error.message);
      } else {
        setGeneralError(
          "No se pudo procesar la solicitud. Inténtalo de nuevo.",
        );
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleResetPassword = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    if (isSubmitting) {
      return;
    }

    const errors: FieldErrors = {};

    if (!code.trim()) {
      errors["code"] = "Este campo es obligatorio.";
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

    setFieldErrors(errors);
    setGeneralError(null);
    setSuccessMessage(null);

    if (Object.keys(errors).length > 0) {
      return;
    }

    setIsSubmitting(true);

    try {
      const response = await resetPasswordRequest({
        email: email.trim().toLowerCase(),
        code: code.trim(),
        newPassword,
        confirmPassword,
      });
      setSuccessMessage(response.message);
      setCode("");
      setNewPassword("");
      setConfirmPassword("");
    } catch (error) {
      if (error instanceof ApiError) {
        if (error.fields) {
          setFieldErrors(error.fields);
        }

        setGeneralError(error.message);
      } else {
        setGeneralError(
          "No se pudo restablecer la contraseña. Inténtalo de nuevo.",
        );
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  const backToLogin = (
    <button
      type="button"
      className="font-medium text-primary hover:underline disabled:opacity-60 disabled:no-underline"
      onClick={() => navigate("/login")}
      disabled={isSubmitting}
    >
      Volver al inicio de sesión
    </button>
  );

  if (successMessage) {
    return (
      <AuthLayout
        title="Contraseña restablecida"
        subtitle="Ya puedes acceder con tu nueva contraseña"
        footer={backToLogin}
      >
        <div className="space-y-4">
          <Alert variant="success">{successMessage}</Alert>
          <Button
            type="button"
            className="w-full justify-center"
            onClick={() => navigate("/login")}
          >
            Ir al inicio de sesión <ArrowRight size={16} />
          </Button>
        </div>
      </AuthLayout>
    );
  }

  return (
    <AuthLayout
      title="Recuperar contraseña"
      subtitle={
        step === "request"
          ? "Indica el correo de tu cuenta"
          : "Ingresa el código que enviamos a tu correo"
      }
      footer={backToLogin}
    >
      {step === "request" ? (
        <form className="space-y-4" onSubmit={handleRequestCode} noValidate>
          {generalError && <Alert variant="error">{generalError}</Alert>}

          <Input
            label="Correo electrónico"
            name="email"
            type="email"
            placeholder="tu@email.com"
            icon={<Mail size={15} />}
            autoComplete="email"
            value={email}
            onChange={(event) => setEmail(event.target.value)}
            error={fieldErrors["email"]}
            disabled={isSubmitting}
            required
          />

          <Button
            type="submit"
            className="w-full justify-center"
            disabled={isSubmitting}
            aria-busy={isSubmitting}
          >
            {isSubmitting ? (
              "Enviando..."
            ) : (
              <>
                Enviar código <ArrowRight size={16} />
              </>
            )}
          </Button>
        </form>
      ) : (
        <form className="space-y-4" onSubmit={handleResetPassword} noValidate>
          {requestMessage && <Alert variant="info">{requestMessage}</Alert>}
          {generalError && <Alert variant="error">{generalError}</Alert>}

          <p className="text-xs text-muted-foreground">
            Código enviado a <span className="text-white">{email}</span>. El
            código expira en 15 minutos y solo se puede usar una vez.
          </p>

          <Input
            label="Código de recuperación"
            name="code"
            placeholder="Ej. 1a2b3c4d"
            icon={<KeyRound size={15} />}
            value={code}
            onChange={(event) => setCode(event.target.value)}
            error={fieldErrors["code"]}
            disabled={isSubmitting}
            autoComplete="one-time-code"
            required
          />

          <Input
            label="Nueva contraseña"
            name="newPassword"
            type="password"
            placeholder="••••••••"
            icon={<Lock size={15} />}
            value={newPassword}
            onChange={(event) => setNewPassword(event.target.value)}
            error={fieldErrors["newPassword"]}
            helperText="Debe tener al menos 8 caracteres."
            autoComplete="new-password"
            disabled={isSubmitting}
            required
          />

          <Input
            label="Confirmar nueva contraseña"
            name="confirmPassword"
            type="password"
            placeholder="••••••••"
            icon={<Lock size={15} />}
            value={confirmPassword}
            onChange={(event) => setConfirmPassword(event.target.value)}
            error={fieldErrors["confirmPassword"]}
            autoComplete="new-password"
            disabled={isSubmitting}
            required
          />

          <Button
            type="submit"
            className="w-full justify-center"
            disabled={isSubmitting}
            aria-busy={isSubmitting}
          >
            {isSubmitting ? (
              "Actualizando..."
            ) : (
              <>
                Restablecer contraseña <ArrowRight size={16} />
              </>
            )}
          </Button>

          <button
            type="button"
            className="flex w-full items-center justify-center gap-1 text-xs text-muted-foreground hover:text-white disabled:opacity-60"
            onClick={() => {
              setStep("request");
              setRequestMessage(null);
              setGeneralError(null);
            }}
            disabled={isSubmitting}
          >
            <ArrowLeft size={12} /> Solicitar un nuevo código
          </button>
        </form>
      )}
    </AuthLayout>
  );
}
