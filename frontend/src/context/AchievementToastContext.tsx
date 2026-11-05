import {
  createContext,
  useCallback,
  useContext,
  useState,
  type ReactNode,
} from "react";
import type { Achievement } from "../types/achievement";

interface AchievementToastContextType {
  toasts: Achievement[];
  addToast: (achievement: Achievement) => void;
  removeToast: (id: number) => void;
}

const AchievementToastContext =
  createContext<AchievementToastContextType | null>(null);

/**
 * Contexto global de notificaciones de logros desbloqueados.
 * Permite que cualquier acción académica (completar lección, laboratorio o
 * evaluación) muestre una notificación inmediata (toast) sin importar en
 * qué pantalla se encuentre el estudiante.
 */
export function useAchievementToast(): AchievementToastContextType {
  const ctx = useContext(AchievementToastContext);

  if (!ctx) {
    throw new Error(
      "useAchievementToast debe usarse dentro de AchievementToastProvider.",
    );
  }

  return ctx;
}

export function AchievementToastProvider({
  children,
}: {
  children: ReactNode;
}) {
  const [toasts, setToasts] = useState<Achievement[]>([]);

  const addToast = useCallback((achievement: Achievement): void => {
    setToasts((prev) => [...prev, achievement]);
  }, []);

  const removeToast = useCallback((id: number): void => {
    setToasts((prev) => prev.filter((toast) => toast.id !== id));
  }, []);

  return (
    <AchievementToastContext.Provider value={{ toasts, addToast, removeToast }}>
      {children}
    </AchievementToastContext.Provider>
  );
}
