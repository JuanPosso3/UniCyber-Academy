import {
  createContext,
  useContext,
  useEffect,
  useState,
  type ReactNode,
} from "react";
import { ApiError } from "../lib/api";
import {
  getCurrentUserRequest,
  loginRequest,
  logoutRequest,
} from "../services/auth";
import type { AuthUser } from "../types/auth";

export interface SessionNotice {
  variant: "success" | "error";
  message: string;
}

interface AuthContextValue {
  user: AuthUser | null;
  isBootstrapping: boolean;
  isSubmitting: boolean;
  sessionNotice: SessionNotice | null;
  login: (email: string, password: string) => Promise<AuthUser>;
  logout: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [isBootstrapping, setIsBootstrapping] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [sessionNotice, setSessionNotice] = useState<SessionNotice | null>(
    null,
  );

  useEffect(() => {
    let isActive = true;

    void getCurrentUserRequest()
      .then(({ user: currentUser }) => {
        if (isActive) {
          setUser(currentUser);
        }
      })
      .catch((error: unknown) => {
        if (!isActive) {
          return;
        }

        setUser(null);

        // Un 401 al arrancar solo significa que no hay sesión; no es
        // un error que deba mostrarse al visitante.
        if (error instanceof ApiError && error.status !== 401) {
          setSessionNotice({
            variant: "error",
            message: error.message,
          });
        }
      })
      .finally(() => {
        if (isActive) {
          setIsBootstrapping(false);
        }
      });

    return () => {
      isActive = false;
    };
  }, []);

  const login = async (
    email: string,
    password: string,
  ): Promise<AuthUser> => {
    setIsSubmitting(true);

    try {
      const { user: authenticatedUser } = await loginRequest({
        email,
        password,
      });

      setUser(authenticatedUser);
      setSessionNotice(null);

      return authenticatedUser;
    } finally {
      setIsSubmitting(false);
    }
  };

  const logout = async (): Promise<void> => {
    setIsSubmitting(true);

    try {
      await logoutRequest();
      setSessionNotice({
        variant: "success",
        message: "Has cerrado sesión correctamente.",
      });
    } catch (error) {
      setSessionNotice({
        variant: "error",
        message:
          error instanceof ApiError
            ? error.message
            : "No se pudo cerrar la sesión en el servidor.",
      });
    } finally {
      // Las credenciales locales se descartan siempre. La cookie
      // HttpOnly solo puede eliminarla el backend; si la petición
      // falló, se informa con el aviso anterior.
      setUser(null);
      setIsSubmitting(false);
    }
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        isBootstrapping,
        isSubmitting,
        sessionNotice,
        login,
        logout,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth(): AuthContextValue {
  const context = useContext(AuthContext);

  if (!context) {
    throw new Error("useAuth debe utilizarse dentro de AuthProvider.");
  }

  return context;
}
