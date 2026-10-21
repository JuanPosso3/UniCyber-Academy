export type UserRole =
  | "STUDENT"
  | "TEACHER"
  | "ADMINISTRATIVE"
  | "VISITOR"
  | "MENTOR";

export type UserStatus = "ACTIVE" | "DISABLED";

export interface AuthUser {
  id: number;
  firstName: string;
  lastName: string;
  email: string;
  role: UserRole;
  status: UserStatus;
}

export interface AuthResponse {
  user: AuthUser;
}

export type FieldErrors = Record<string, string>;
