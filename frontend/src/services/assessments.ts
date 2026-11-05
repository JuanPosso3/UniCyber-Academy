import { apiRequest } from "../lib/api";
import type {
  AdminCourseFinalAssessmentResponse,
  AssessmentEligibility,
  CourseFinalAssessmentSummary,
  StudentAssessmentResults,
  StudentAssessmentResponse,
  SubmitAssessmentResponse,
  SubmittedAnswer,
} from "../types/assessment";

export function getAdminCourseAssessmentRequest(
  courseId: number,
): Promise<AdminCourseFinalAssessmentResponse> {
  return apiRequest<AdminCourseFinalAssessmentResponse>(
    `/admin/courses/${courseId}/assessment`,
  );
}

export function createCourseAssessmentRequest(
  courseId: number,
  body: {
    title: string;
    description: string | null;
    questions: unknown;
  },
): Promise<AdminCourseFinalAssessmentResponse> {
  return apiRequest<AdminCourseFinalAssessmentResponse>(
    `/admin/courses/${courseId}/assessment`,
    {
      method: "POST",
      body: JSON.stringify(body),
    },
  );
}

export function updateCourseAssessmentRequest(
  courseId: number,
  body: { title?: string; description?: string | null },
): Promise<AdminCourseFinalAssessmentResponse> {
  return apiRequest<AdminCourseFinalAssessmentResponse>(
    `/admin/courses/${courseId}/assessment`,
    {
      method: "PATCH",
      body: JSON.stringify(body),
    },
  );
}

export function replaceCourseAssessmentQuestionsRequest(
  courseId: number,
  questions: unknown,
): Promise<AdminCourseFinalAssessmentResponse> {
  return apiRequest<AdminCourseFinalAssessmentResponse>(
    `/admin/courses/${courseId}/assessment/questions`,
    {
      method: "PUT",
      body: JSON.stringify({ questions }),
    },
  );
}

export function changeCourseAssessmentStatusRequest(
  courseId: number,
  status: string,
): Promise<AdminCourseFinalAssessmentResponse> {
  return apiRequest<AdminCourseFinalAssessmentResponse>(
    `/admin/courses/${courseId}/assessment/status`,
    {
      method: "PATCH",
      body: JSON.stringify({ status }),
    },
  );
}

export function getStudentAssessmentRequest(
  courseId: number,
): Promise<StudentAssessmentResponse> {
  return apiRequest<StudentAssessmentResponse>(
    `/courses/${courseId}/assessment`,
  );
}

export function submitAssessmentRequest(
  courseId: number,
  answers: SubmittedAnswer[],
): Promise<SubmitAssessmentResponse> {
  return apiRequest<SubmitAssessmentResponse>(
    `/courses/${courseId}/assessment/submit`,
    {
      method: "POST",
      body: JSON.stringify({ answers }),
    },
  );
}

export function getAssessmentResultsRequest(
  courseId: number,
): Promise<{
  attempt: StudentAssessmentResults["attempt"];
  questions: StudentAssessmentResults["questions"];
}> {
  return apiRequest<{
    attempt: StudentAssessmentResults["attempt"];
    questions: StudentAssessmentResults["questions"];
  }>(`/courses/${courseId}/assessment/results`);
}

export type {
  AssessmentEligibility,
  CourseFinalAssessmentSummary,
  StudentAssessmentResults,
  StudentAssessmentResponse,
  SubmitAssessmentResponse,
};
