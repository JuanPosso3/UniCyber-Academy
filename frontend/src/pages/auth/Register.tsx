import { useState, type FormEvent } from "react";
import { ArrowRight, Lock, User } from "lucide-react";
import { AuthLayout } from "../../components/layout/AuthLayout";
import { Alert } from "../../components/ui/Alert";
import { Button } from "../../components/ui/Button";
import { Input } from "../../components/ui/Input";
import { ApiError } from "../../lib/api";
import { registerRequest } from "../../services/auth";
import type { FieldErrors } from "../../types/auth";
import type { NavigateFn } from "../../types/navigation";

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const MIN_PASSWORD_LENGTH = 8;
const MAX_PASSWORD_LENGTH = 128;
const MAX_NAME_LENGTH = 100;
const MAX_EMAIL_LENGTH = 254;

function validateRegisterForm(values: {
  firstName: string;
  lastName: string;
  email: string;
  password: string;
  confirmPassword: string;
  agreed: boolean;
}): FieldErrors {
  const errors: FieldErrors = {};
  const firstName = values.firstName.trim();
  const lastName = values.lastName.trim();
  const email = values.email.trim();

  if (!firstName) {
    errors["firstName"] = "Este campo es obligatorio.";
  } else if (firstName.length > MAX_NAME_LENGTH) {
    errors["firstName"] =
      `El nombre no puede superar los ${MAX_NAME_LENGTH} caracteres.`;
  }

  if (!lastName) {
    errors["lastName"] = "Este campo es obligatorio.";
  } else if (lastName.length > MAX_NAME_LENGTH) {
    errors["lastName"] =
      `El apellido no puede superar los ${MAX_NAME_LENGTH} caracteres.`;
  }

  if (!email) {
    errors["email"] = "Este campo es obligatorio.";
  } else if (email.length > MAX_EMAIL_LENGTH || !EMAIL_PATTERN.test(email)) {
    errors["email"] = "El correo electrónico no es válido.";
  }

  if (!values.password) {
    errors["password"] = "Este campo es obligatorio.";
  } else if (values.password.length < MIN_PASSWORD_LENGTH) {
    errors["password"] =
      `La contraseña debe tener al menos ${MIN_PASSWORD_LENGTH} caracteres.`;
  } else if (values.password.length > MAX_PASSWORD_LENGTH) {
    errors["password"] =
      `La contraseña no puede superar los ${MAX_PASSWORD_LENGTH} caracteres.`;
  }

  if (!values.confirmPassword) {
    errors["confirmPassword"] = "Este campo es obligatorio.";
  } else if (values.confirmPassword !== values.password) {
    errors["confirmPassword"] = "Las contraseñas no coinciden.";
  }

  if (!values.agreed) {
    errors["terms"] =
      "Debes aceptar los términos y condiciones para crear tu cuenta.";
  }

  return errors;
}

export interface RegisterProps {
  navigate: NavigateFn;
}

export function Register({ navigate }: RegisterProps) {
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [agreed, setAgreed] = useState(false);
  const [fieldErrors, setFieldErrors] = useState<FieldErrors>({});
  const [generalError, setGeneralError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    if (isSubmitting) {
      return;
    }

    const nextErrors = validateRegisterForm({
      firstName,
      lastName,
      email,
      password,
      confirmPassword,
      agreed,
    });

    setFieldErrors(nextErrors);

    if (Object.keys(nextErrors).length > 0) {
      return;
    }

    setGeneralError(null);
    setIsSubmitting(true);

    try {
      await registerRequest({
        firstName: firstName.trim(),
        lastName: lastName.trim(),
        email: email.trim().toLowerCase(),
        password,
      });

      setIsSuccess(true);
    } catch (error) {
      if (error instanceof ApiError) {
        if (error.fields) {
          setFieldErrors(error.fields);
        }

        if (error.code === "EMAIL_ALREADY_REGISTERED") {
          setFieldErrors((current) => ({
            ...current,
            email: error.message,
          }));
        }

        setGeneralError(error.message);
        return;
      }

      setGeneralError(
        "Ocurrió un error inesperado. Inténtalo de nuevo.",
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  if (isSuccess) {
    return (
      <AuthLayout
        title="Cuenta creada"
        subtitle="Tu cuenta está lista para usar"
        footer={
          <>
            ¿Ya tienes cuenta?{" "}
            <button
              type="button"
              className="text-primary hover:underline font-medium"
              onClick={() => navigate("login")}
            >
              Iniciar sesión
            </button>
          </>
        }
      >
        <div className="space-y-4">
          <Alert variant="success">
            Tu cuenta se ha creado correctamente. Ya puedes iniciar sesión.
          </Alert>
          <Button
            type="button"
            className="w-full justify-center"
            onClick={() => navigate("login")}
          >
            Iniciar sesión <ArrowRight size={16} />
          </Button>
        </div>
      </AuthLayout>
    );
  }

  return (
    <AuthLayout
      title="Crear cuenta"
      subtitle="Únete a UniCyber Academy gratis"
      footer={
        <>
          ¿Ya tienes cuenta?{" "}
          <button
            type="button"
            className="text-primary hover:underline font-medium disabled:opacity-60 disabled:no-underline"
            onClick={() => navigate("login")}
            disabled={isSubmitting}
          >
            Iniciar sesión
          </button>
        </>
      }
    >
      <form className="space-y-3" onSubmit={handleSubmit} noValidate>
        {generalError && <Alert variant="error">{generalError}</Alert>}

        <div className="grid grid-cols-2 gap-3">
          <Input
            label="Nombre"
            name="firstName"
            placeholder="Juan"
            autoComplete="given-name"
            value={firstName}
            onChange={(event) => setFirstName(event.target.value)}
            error={fieldErrors["firstName"]}
            disabled={isSubmitting}
            required
          />
          <Input
            label="Apellido"
            name="lastName"
            placeholder="García"
            autoComplete="family-name"
            value={lastName}
            onChange={(event) => setLastName(event.target.value)}
            error={fieldErrors["lastName"]}
            disabled={isSubmitting}
            required
          />
        </div>

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
          placeholder="Mínimo 8 caracteres"
          icon={<Lock size={15} />}
          autoComplete="new-password"
          value={password}
          onChange={(event) => setPassword(event.target.value)}
          error={fieldErrors["password"]}
          disabled={isSubmitting}
          required
        />

        <Input
          label="Confirmar contraseña"
          name="confirmPassword"
          type="password"
          placeholder="Repite tu contraseña"
          icon={<Lock size={15} />}
          autoComplete="new-password"
          value={confirmPassword}
          onChange={(event) => setConfirmPassword(event.target.value)}
          error={fieldErrors["confirmPassword"]}
          disabled={isSubmitting}
          required
        />

        <div>
          <label className="flex items-start gap-2 cursor-pointer">
            <input
              type="checkbox"
              checked={agreed}
              onChange={(event) => setAgreed(event.target.checked)}
              className="mt-0.5 accent-primary"
              disabled={isSubmitting}
            />
            <span className="text-xs text-muted-foreground">
              Acepto los{" "}
              <span className="text-primary">términos y condiciones</span> y
              la{" "}
              <span className="text-primary">política de privacidad</span>
            </span>
          </label>
          {fieldErrors["terms"] && (
            <p className="mt-1.5 text-xs text-destructive">
              {fieldErrors["terms"]}
            </p>
          )}
        </div>

        <Button
          type="submit"
          className="w-full justify-center"
          disabled={isSubmitting}
          aria-busy={isSubmitting}
        >
          {isSubmitting ? (
            "Creando cuenta..."
          ) : (
            <>
              Crear cuenta <ArrowRight size={16} />
            </>
          )}
        </Button>
      </form>
    </AuthLayout>
  );
}
