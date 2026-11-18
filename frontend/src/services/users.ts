import { apiRequest } from "../lib/api";
import type { UserProfile } from "../types/auth";

export interface UpdateUsernamePayload {
  username: string;
}

export interface ChangePasswordPayload {
  currentPassword: string;
  newPassword: string;
  confirmPassword: string;
}

export function getMyProfileRequest(): Promise<UserProfile> {
  return apiRequest<{ user: UserProfile }>("/users/me").then(
    (response) => response.user,
  );
}

export function updateUsernameRequest(
  payload: UpdateUsernamePayload,
): Promise<UserProfile> {
  return apiRequest<{ user: UserProfile }>("/users/me/username", {
    method: "PATCH",
    body: JSON.stringify(payload),
  }).then((response) => response.user);
}

export function changePasswordRequest(
  payload: ChangePasswordPayload,
): Promise<void> {
  return apiRequest<void>("/users/me/password", {
    method: "PATCH",
    body: JSON.stringify(payload),
  });
}
