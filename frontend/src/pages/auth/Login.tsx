import { useEffect, useRef, useState, type FormEvent } from "react";
import ReCAPTCHA from "react-google-recaptcha";
import { ArrowRight, Lock, User } from "lucide-react";
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
  const siteKey = import.meta.env.VITE_RECAPTCHA_SITE_KEY?.trim();
  const [recaptchaToken, setRecaptchaToken] = useState<string | null>(null);
  const [captchaError, setCaptchaError] = useState<string | null>(null);
  const [compactCaptcha, setCompactCaptcha] = useState(() => window.matchMedia("(max-width: 400px)").matches);
  const captchaRef = useRef<ReCAPTCHA>(null);
  const captchaRegionRef = useRef<HTMLDivElement>(null);
  const mountedRef = useRef(true);
  const pendingRef = useRef(false);

  useEffect(() => {
    mountedRef.current = true;
    const media = window.matchMedia("(max-width: 400px)");
    const handleResize = () => {
      setCompactCaptcha(media.matches);
      setRecaptchaToken(null);
    };
    media.addEventListener("change", handleResize);
    // También cubre bloqueo del script por red, extensiones o CSP.
    const loadTimeout = window.setTimeout(() => {
      if (siteKey && captchaRef.current?.getWidgetId() == null) {
        setCaptchaError("No se pudo cargar la verificación de seguridad. Recarga la página e inténtalo nuevamente.");
      }
    }, 20_000);
    return () => {
      mountedRef.current = false;
      window.clearTimeout(loadTimeout);
      media.removeEventListener("change", handleResize);
    };
  }, [siteKey]);

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    if (isSubmitting || pendingRef.current) {
      return;
    }

    const nextErrors = validateLoginForm(email, password);
    setFieldErrors(nextErrors);
    if (!siteKey || !recaptchaToken) {
      setCaptchaError("Completa la verificación de seguridad para continuar.");
      if (Object.keys(nextErrors).length === 0) captchaRegionRef.current?.focus();
      return;
    }

    if (Object.keys(nextErrors).length > 0) {
      return;
    }

    setGeneralError(null);
    setCaptchaError(null);
    pendingRef.current = true;
    const token = recaptchaToken;
    setRecaptchaToken(null);

    try {
      await login(email.trim(), password, token);
      if (mountedRef.current) navigate("dashboard");
    } catch (error) {
      if (!mountedRef.current) return;
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
    } finally {
      if (mountedRef.current) {
        captchaRef.current?.reset();
        setRecaptchaToken(null);
      }
      pendingRef.current = false;
    }
  };

  return (
    <AuthLayout
      featured
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
            className="text-xs text-primary hover:underline disabled:opacity-60 disabled:no-underline"
            onClick={() => navigate("/forgot-password")}
            disabled={isSubmitting}
          >
            ¿Olvidaste tu contraseña?
          </button>
        </div>

        <div ref={captchaRegionRef} tabIndex={-1} aria-labelledby="captcha-label" aria-describedby="captcha-feedback" className="rounded-lg focus-visible:outline-2 focus-visible:outline-primary">
          <p id="captcha-label" className="mb-2 text-xs font-semibold text-muted-foreground">Verificación de seguridad</p>
          {siteKey ? (
            <div className="flex justify-center">
              <ReCAPTCHA
                key={compactCaptcha ? "compact" : "normal"}
                ref={captchaRef}
                sitekey={siteKey}
                hl="es"
                theme="dark"
                size={compactCaptcha ? "compact" : "normal"}
                onChange={(token) => {
                  if (!mountedRef.current || pendingRef.current) return;
                  setRecaptchaToken(token);
                  if (token) setCaptchaError(null);
                }}
                onExpired={() => {
                  if (!mountedRef.current) return;
                  setRecaptchaToken(null);
                  setCaptchaError("La verificación ha expirado. Inténtalo nuevamente.");
                  captchaRef.current?.reset();
                }}
                onErrored={() => {
                  if (!mountedRef.current) return;
                  setRecaptchaToken(null);
                  setCaptchaError("No se pudo completar la verificación de seguridad. Inténtalo más tarde.");
                  captchaRef.current?.reset();
                }}
              />
            </div>
          ) : <p className="text-xs text-muted-foreground">La verificación de seguridad no está disponible. Inténtalo más tarde.</p>}
          <p id="captcha-feedback" role="status" aria-live="polite" className="mt-2 text-xs text-destructive">
            {captchaError ?? fieldErrors["recaptchaToken"]}
          </p>
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
        {/* Divider Por si se implementa inicio con git o google pero no creo
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
        */}
      </form>
    </AuthLayout>
  );
}
