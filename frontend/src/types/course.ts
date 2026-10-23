export type ContentStatus = "DRAFT" | "ACTIVE" | "ARCHIVED";

export interface CourseSummary {
  id: number;
  title: string;
  description: string | null;
  status: ContentStatus;
  moduleCount: number;
  createdAt: string;
  updatedAt: string;
}

export interface CourseModule {
  id: number;
  courseId: number;
  title: string;
  description: string | null;
  order: number;
  status: ContentStatus;
  createdAt: string;
  updatedAt: string;
}

export interface CourseDetail extends CourseSummary {
  modules: CourseModule[];
}

export interface CourseModuleList {
  course: Pick<CourseSummary, "id" | "title" | "status">;
  modules: CourseModule[];
}

export interface CoursePayload {
  title: string;
  description: string | null;
}

export interface ModulePayload {
  title: string;
  description: string | null;
}

export interface CourseListResponse {
  courses: CourseSummary[];
}

export interface CourseDetailResponse {
  course: CourseDetail;
}

export interface CourseResponse {
  course: CourseSummary;
}

export interface ModuleListResponse {
  modules: CourseModule[];
}

export interface ModuleResponse {
  module: CourseModule;
}
