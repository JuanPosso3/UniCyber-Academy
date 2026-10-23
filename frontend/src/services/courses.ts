import { apiRequest } from "../lib/api";
import type {
  ContentStatus,
  CourseDetailResponse,
  CourseListResponse,
  CourseModuleList,
  CoursePayload,
  CourseResponse,
  ModuleListResponse,
  ModulePayload,
  ModuleResponse,
} from "../types/course";

export function listAvailableCoursesRequest(): Promise<CourseListResponse> {
  return apiRequest<CourseListResponse>("/courses");
}

export function getAvailableCourseRequest(
  courseId: number,
): Promise<CourseDetailResponse> {
  return apiRequest<CourseDetailResponse>(`/courses/${courseId}`);
}

export function listAdminCoursesRequest(): Promise<CourseListResponse> {
  return apiRequest<CourseListResponse>("/admin/courses");
}

export function getAdminCourseRequest(
  courseId: number,
): Promise<CourseDetailResponse> {
  return apiRequest<CourseDetailResponse>(`/admin/courses/${courseId}`);
}

export function createCourseRequest(
  payload: CoursePayload,
): Promise<CourseResponse> {
  return apiRequest<CourseResponse>("/admin/courses", {
    method: "POST",
    body: JSON.stringify(payload),
  });
}

export function updateCourseRequest(
  courseId: number,
  payload: CoursePayload,
): Promise<CourseResponse> {
  return apiRequest<CourseResponse>(`/admin/courses/${courseId}`, {
    method: "PATCH",
    body: JSON.stringify(payload),
  });
}

export function changeCourseStatusRequest(
  courseId: number,
  status: ContentStatus,
): Promise<CourseResponse> {
  return apiRequest<CourseResponse>(`/admin/courses/${courseId}/status`, {
    method: "PATCH",
    body: JSON.stringify({ status }),
  });
}

export function listAdminModulesRequest(
  courseId: number,
): Promise<CourseModuleList> {
  return apiRequest<CourseModuleList>(`/admin/courses/${courseId}/modules`);
}

export function createModuleRequest(
  courseId: number,
  payload: ModulePayload,
): Promise<ModuleResponse> {
  return apiRequest<ModuleResponse>(
    `/admin/courses/${courseId}/modules`,
    {
      method: "POST",
      body: JSON.stringify(payload),
    },
  );
}

export function getAdminModuleRequest(
  courseId: number,
  moduleId: number,
): Promise<ModuleResponse> {
  return apiRequest<ModuleResponse>(
    `/admin/courses/${courseId}/modules/${moduleId}`,
  );
}

export function updateModuleRequest(
  courseId: number,
  moduleId: number,
  payload: ModulePayload,
): Promise<ModuleResponse> {
  return apiRequest<ModuleResponse>(
    `/admin/courses/${courseId}/modules/${moduleId}`,
    {
      method: "PATCH",
      body: JSON.stringify(payload),
    },
  );
}

export function changeModuleStatusRequest(
  courseId: number,
  moduleId: number,
  status: ContentStatus,
): Promise<ModuleResponse> {
  return apiRequest<ModuleResponse>(
    `/admin/courses/${courseId}/modules/${moduleId}/status`,
    {
      method: "PATCH",
      body: JSON.stringify({ status }),
    },
  );
}

export function moveModuleRequest(
  courseId: number,
  moduleId: number,
  direction: "up" | "down",
): Promise<ModuleListResponse> {
  return apiRequest<ModuleListResponse>(
    `/admin/courses/${courseId}/modules/${moduleId}/order`,
    {
      method: "PATCH",
      body: JSON.stringify({ direction }),
    },
  );
}
