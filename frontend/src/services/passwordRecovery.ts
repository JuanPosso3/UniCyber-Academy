import { apiRequest } from "../lib/api";

export interface RequestRecoveryCodePayload {
  email: string;
}

export interface ResetPasswordPayload {
  email: string;
  code: string;
  newPassword: string;
  confirmPassword: string;
}

export interface RecoveryMessageResponse {
  message: string;
}

export function requestRecoveryCodeRequest(
  payload: RequestRecoveryCodePayload,
): Promise<RecoveryMessageResponse> {
  return apiRequest<RecoveryMessageResponse>("/auth/password-reset/request", {
    method: "POST",
    body: JSON.stringify(payload),
  });
}

export function resetPasswordRequest(
  payload: ResetPasswordPayload,
): Promise<RecoveryMessageResponse> {
  return apiRequest<RecoveryMessageResponse>("/auth/password-reset/reset", {
    method: "POST",
    body: JSON.stringify(payload),
  });
}
