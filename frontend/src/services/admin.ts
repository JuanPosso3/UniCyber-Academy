import { apiRequest } from "../lib/api";
import type { UserRole, UserStatus } from "../types/auth";

export interface RegistrationPoint {
  period: string;
  label: string;
  count: number;
}

export interface TopCourseStat {
  courseId: number;
  title: string;
  students: number;
}

export interface AdminDashboardStatistics {
  students: {
    total: number;
    active: number;
    disabled: number;
  };
  registrations: RegistrationPoint[];
  courses: {
    total: number;
    published: number;
    unpublished: number;
  };
  modules: number;
  lessons: {
    theory: number;
    laboratory: number;
  };
  topCourses: TopCourseStat[];
  passingRate: {
    attemptedStudents: number;
    passedStudents: number;
    rate: number;
  };
  completedCourses: number;
  assessmentAttempts: number;
}

export interface AdminUser {
  id: number;
  firstName: string;
  lastName: string;
  username: string | null;
  email: string;
  role: UserRole;
  status: UserStatus;
  createdAt: string;
}

export interface UpdateManagedUserPayload {
  username?: string;
  role?: UserRole;
}

export function getAdminStatisticsRequest(): Promise<AdminDashboardStatistics> {
  return apiRequest<{ statistics: AdminDashboardStatistics }>(
    "/admin/statistics",
  ).then((response) => response.statistics);
}

export function listAdminUsersRequest(
  search?: string,
): Promise<AdminUser[]> {
  const query = search?.trim()
    ? `?search=${encodeURIComponent(search.trim())}`
    : "";

  return apiRequest<{ users: AdminUser[] }>(`/admin/users${query}`).then(
    (response) => response.users,
  );
}

export function updateAdminUserRequest(
  userId: number,
  payload: UpdateManagedUserPayload,
): Promise<AdminUser> {
  return apiRequest<{ user: AdminUser }>(`/admin/users/${userId}`, {
    method: "PATCH",
    body: JSON.stringify(payload),
  }).then((response) => response.user);
}
