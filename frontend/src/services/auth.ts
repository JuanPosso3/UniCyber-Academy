import { apiRequest } from "../lib/api";
import type { AuthResponse } from "../types/auth";

export interface LoginPayload {
  email: string;
  password: string;
}

export interface RegisterPayload {
  firstName: string;
  lastName: string;
  email: string;
  password: string;
}

export function loginRequest(payload: LoginPayload): Promise<AuthResponse> {
  return apiRequest<AuthResponse>("/auth/login", {
    method: "POST",
    body: JSON.stringify(payload),
  });
}

export function registerRequest(
  payload: RegisterPayload,
): Promise<AuthResponse> {
  return apiRequest<AuthResponse>("/auth/register", {
    method: "POST",
    body: JSON.stringify(payload),
  });
}

export function getCurrentUserRequest(): Promise<AuthResponse> {
  return apiRequest<AuthResponse>("/auth/me");
}

export function logoutRequest(): Promise<void> {
  return apiRequest<void>("/auth/logout", {
    method: "POST",
  });
}
