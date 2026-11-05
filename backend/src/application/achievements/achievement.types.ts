import type { ContentStatus } from '../../domain/content.js';

/** Ítem del catálogo de logros. */
export interface Achievement {
  id: number;
  code: string;
  name: string;
  description: string;
  category: string;
  icon: string;
  condition: string | null;
  status: ContentStatus;
  order: number;
  createdAt: string;
  updatedAt: string;
}

/** Registro de un logro obtenido por una persona estudiante. */
export interface UserAchievement {
  id: number;
  userId: number;
  achievementId: number;
  achievement: Achievement;
  earnedAt: string;
  notifiedAt: string | null;
}

/** Estado de un logro para una persona específica. */
export interface AchievementEntry extends Achievement {
  earned: boolean;
  earnedAt: string | null;
  notifiedAt: string | null;
}

/** Colección de logros de una persona, agrupada por categoría. */
export interface AchievementCollection {
  courseMedals: AchievementEntry[];
  learningRanks: AchievementEntry[];
  complementary: AchievementEntry[];
}

/** Resumen de gamificación para el panel del estudiante. */
export interface AchievementDashboardSummary {
  completedCourses: number;
  totalCourses: number;
  earnedMedals: number;
  totalMedals: number;
  currentRank: string | null;
  nextAchievement: string | null;
  nextRankProgress: { completed: number; required: number } | null;
  pendingNotifications: number;
}

/** Resultado de un proceso de desbloqueo de logros. */
export interface UnlockResult {
  newlyUnlocked: Achievement[];
}
