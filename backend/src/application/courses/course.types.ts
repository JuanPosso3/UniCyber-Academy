import type { ContentStatus } from '../../domain/content.js';

export interface CourseSummary {
  id: number;
  title: string;
  description: string | null;
  status: ContentStatus;
  moduleCount: number;
  createdAt: string;
  updatedAt: string;
}

export interface ModuleSummary {
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
  modules: ModuleSummary[];
}

export interface CourseModuleList {
  course: Pick<CourseSummary, 'id' | 'title' | 'status'>;
  modules: ModuleSummary[];
}

export interface CreateCourseInput {
  title: string;
  description: string | null;
}

export interface UpdateCourseInput {
  title?: string;
  description?: string | null;
}

export interface CreateModuleInput {
  title: string;
  description: string | null;
}

export interface UpdateModuleInput {
  title?: string;
  description?: string | null;
}

export interface MoveModuleInput {
  direction: 'up' | 'down';
}
