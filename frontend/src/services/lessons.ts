import { apiRequest } from "../lib/api";
import type { ContentStatus } from "../types/course";
import type {
  ActivityCheckResponse,
  AdminLessonDetailResponse,
  AdminLessonList,
  CreateLessonPayload,
  LessonCompletionResponse,
  LessonContent,
  LessonContentValidationResponse,
  LessonListResponse,
  LessonResponse,
  LessonType,
  StudentLessonResponse,
  TerminalResponse,
  UpdateLessonPayload,
} from "../types/lesson";

export function listAdminLessonsRequest(
  courseId: number,
  moduleId: number,
): Promise<AdminLessonList> {
  return apiRequest<AdminLessonList>(
    `/admin/courses/${courseId}/modules/${moduleId}/lessons`,
  );
}

export function getAdminLessonRequest(
  courseId: number,
  moduleId: number,
  lessonId: number,
): Promise<AdminLessonDetailResponse> {
  return apiRequest<AdminLessonDetailResponse>(
    `/admin/courses/${courseId}/modules/${moduleId}/lessons/${lessonId}`,
  );
}

export function createLessonRequest(
  courseId: number,
  moduleId: number,
  payload: CreateLessonPayload,
): Promise<LessonResponse> {
  return apiRequest<LessonResponse>(
    `/admin/courses/${courseId}/modules/${moduleId}/lessons`,
    {
      method: "POST",
      body: JSON.stringify(payload),
    },
  );
}

export function updateLessonRequest(
  courseId: number,
  moduleId: number,
  lessonId: number,
  payload: UpdateLessonPayload,
): Promise<LessonResponse> {
  return apiRequest<LessonResponse>(
    `/admin/courses/${courseId}/modules/${moduleId}/lessons/${lessonId}`,
    {
      method: "PATCH",
      body: JSON.stringify(payload),
    },
  );
}

export function changeLessonStatusRequest(
  courseId: number,
  moduleId: number,
  lessonId: number,
  status: ContentStatus,
): Promise<LessonResponse> {
  return apiRequest<LessonResponse>(
    `/admin/courses/${courseId}/modules/${moduleId}/lessons/${lessonId}/status`,
    {
      method: "PATCH",
      body: JSON.stringify({ status }),
    },
  );
}

export function moveLessonRequest(
  courseId: number,
  moduleId: number,
  lessonId: number,
  direction: "up" | "down",
): Promise<LessonListResponse> {
  return apiRequest<LessonListResponse>(
    `/admin/courses/${courseId}/modules/${moduleId}/lessons/${lessonId}/order`,
    {
      method: "PATCH",
      body: JSON.stringify({ direction }),
    },
  );
}

export function deleteLessonRequest(
  courseId: number,
  moduleId: number,
  lessonId: number,
): Promise<LessonListResponse> {
  return apiRequest<LessonListResponse>(
    `/admin/courses/${courseId}/modules/${moduleId}/lessons/${lessonId}`,
    { method: "DELETE" },
  );
}

export function validateLessonContentRequest(
  courseId: number,
  moduleId: number,
  type: LessonType,
  content: LessonContent,
): Promise<LessonContentValidationResponse> {
  return apiRequest<LessonContentValidationResponse>(
    `/admin/courses/${courseId}/modules/${moduleId}/lessons/validate`,
    {
      method: "POST",
      body: JSON.stringify({ type, content }),
    },
  );
}

export function validateStoredLessonContentRequest(
  courseId: number,
  moduleId: number,
  lessonId: number,
): Promise<LessonContentValidationResponse> {
  return apiRequest<LessonContentValidationResponse>(
    `/admin/courses/${courseId}/modules/${moduleId}/lessons/${lessonId}/validate`,
    { method: "POST" },
  );
}

export function previewActivityAnswerRequest(
  courseId: number,
  moduleId: number,
  lessonId: number,
  activityId: string,
  answer: unknown,
): Promise<ActivityCheckResponse> {
  return apiRequest<ActivityCheckResponse>(
    `/admin/courses/${courseId}/modules/${moduleId}/lessons/${lessonId}/preview/activities/${encodeURIComponent(activityId)}/check`,
    {
      method: "POST",
      body: JSON.stringify({ answer }),
    },
  );
}

export function previewTerminalCommandRequest(
  courseId: number,
  moduleId: number,
  lessonId: number,
  activityId: string,
  command: string,
): Promise<TerminalResponse> {
  return apiRequest<TerminalResponse>(
    `/admin/courses/${courseId}/modules/${moduleId}/lessons/${lessonId}/preview/activities/${encodeURIComponent(activityId)}/terminal`,
    {
      method: "POST",
      body: JSON.stringify({ command }),
    },
  );
}

export function getStudentLessonRequest(
  courseId: number,
  lessonId: number,
): Promise<StudentLessonResponse> {
  return apiRequest<StudentLessonResponse>(
    `/courses/${courseId}/lessons/${lessonId}`,
  );
}

export function completeTheoryLessonRequest(
  courseId: number,
  lessonId: number,
): Promise<LessonCompletionResponse> {
  return apiRequest<LessonCompletionResponse>(
    `/courses/${courseId}/lessons/${lessonId}/complete`,
    { method: "POST" },
  );
}

export function checkActivityAnswerRequest(
  courseId: number,
  lessonId: number,
  activityId: string,
  answer: unknown,
): Promise<ActivityCheckResponse> {
  return apiRequest<ActivityCheckResponse>(
    `/courses/${courseId}/lessons/${lessonId}/activities/${encodeURIComponent(activityId)}/check`,
    {
      method: "POST",
      body: JSON.stringify({ answer }),
    },
  );
}

export function executeTerminalCommandRequest(
  courseId: number,
  lessonId: number,
  activityId: string,
  command: string,
): Promise<TerminalResponse> {
  return apiRequest<TerminalResponse>(
    `/courses/${courseId}/lessons/${lessonId}/activities/${encodeURIComponent(activityId)}/terminal`,
    {
      method: "POST",
      body: JSON.stringify({ command }),
    },
  );
}

export function finalizeLaboratoryRequest(
  courseId: number,
  lessonId: number,
  answers: Record<string, unknown>,
): Promise<LessonCompletionResponse> {
  return apiRequest<LessonCompletionResponse>(
    `/courses/${courseId}/lessons/${lessonId}/finalize`,
    {
      method: "POST",
      body: JSON.stringify({ answers }),
    },
  );
}
