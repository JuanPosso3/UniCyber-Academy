import { apiRequest } from "../lib/api";
import type {
  Achievement,
  AchievementCollection,
  AchievementDashboardSummary,
  UserAchievement,
} from "../types/achievement";

export function listAchievementsRequest(): Promise<{
  achievements: Achievement[];
}> {
  return apiRequest<{ achievements: Achievement[] }>("/achievements");
}

export function getAchievementCollectionRequest(): Promise<
  AchievementCollection
> {
  return apiRequest<AchievementCollection>("/achievements/collection");
}

export function getAchievementSummaryRequest(): Promise<
  AchievementDashboardSummary
> {
  return apiRequest<AchievementDashboardSummary>("/achievements/summary");
}

export function getPendingAchievementNotificationsRequest(): Promise<{
  notifications: UserAchievement[];
}> {
  return apiRequest<{ notifications: UserAchievement[] }>(
    "/achievements/notifications/pending",
  );
}

export function markAchievementNotificationViewedRequest(
  userAchievementId: number,
): Promise<void> {
  return apiRequest<void>(
    `/achievements/notifications/${userAchievementId}/view`,
    {
      method: "POST",
    },
  );
}
