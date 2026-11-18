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
  username?: string | null;
}

/** Perfil público de la cuenta autenticada. */
export interface UserProfile extends AuthUser {
  username: string | null;
}

export interface AuthResponse {
  user: AuthUser;
}

export type FieldErrors = Record<string, string>;
