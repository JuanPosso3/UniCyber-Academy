import type { ContentStatus } from '../../domain/content.js';
import type { LessonType } from '../../domain/lesson.js';
import type { CourseFinalAssessmentSummary } from '../assessments/assessment.types.js';
import type {
  ContentValidationIssue,
  LessonContent,
} from '../../domain/lesson-content.js';
import type { ModuleSummary } from '../courses/course.types.js';

export interface LessonSummary {
  id: number;
  moduleId: number;
  title: string;
  type: LessonType;
  order: number;
  status: ContentStatus;
  createdAt: string;
  updatedAt: string;
}

export interface AdminLessonSummary extends LessonSummary {
  progressCount: number;
}

export interface AdminLesson extends AdminLessonSummary {
  content: LessonContent;
}

export interface CourseProgressSummary {
  completedLessons: number;
  totalLessons: number;
  percentage: number;
}

export interface LearningLesson extends LessonSummary {
  completed: boolean;
  completedAt: string | null;
  locked: boolean;
  isNext: boolean;
}

export interface LearningModule extends ModuleSummary {
  locked: boolean;
  completed: boolean;
  lessons: LearningLesson[];
}

export interface LearningCourse {
  id: number;
  title: string;
  description: string | null;
  status: ContentStatus;
  moduleCount: number;
  createdAt: string;
  updatedAt: string;
  progress: CourseProgressSummary;
  assessment: CourseFinalAssessmentSummary | null;
  modules: LearningModule[];
}

export interface StudentLesson extends LessonSummary {
  content: LessonContent;
  completed: boolean;
  completedAt: string | null;
  locked: boolean;
  isNext: boolean;
}

export interface LessonNavigation {
  previousLessonId: number | null;
  nextLessonId: number | null;
  nextLessonLocked: boolean;
}

export interface StudentLessonResponse {
  lesson: StudentLesson;
  course: {
    id: number;
    title: string;
    progress: CourseProgressSummary;
  };
  module: {
    id: number;
    title: string;
    order: number;
  };
  navigation: LessonNavigation;
  modules: LearningModule[];
}

export interface AdminLessonList {
  course: {
    id: number;
    title: string;
    status: ContentStatus;
  };
  module: ModuleSummary;
  lessons: AdminLessonSummary[];
}

export interface AdminLessonResponse {
  course: {
    id: number;
    title: string;
    status: ContentStatus;
  };
  module: ModuleSummary;
  lesson: AdminLesson;
}

export interface CreateLessonInput {
  title: string;
  type: LessonType;
  content: LessonContent;
}

export interface UpdateLessonInput {
  title?: string;
  type?: LessonType;
  content?: LessonContent;
}

export interface ValidateLessonContentInput {
  type: LessonType;
  content: unknown;
}

export interface MoveLessonInput {
  direction: 'up' | 'down';
}

export interface LessonProgressResponse {
  completedAt: string;
}

export interface LessonCompletionResponse {
  lessonProgress: LessonProgressResponse;
  progress: CourseProgressSummary;
}

export interface ActivityCheckResponse {
  correct: boolean;
  message: string;
}

export interface TerminalResponse {
  command: string;
  output: string;
}

export interface LessonContentValidationResponse {
  valid: boolean;
  issues: ContentValidationIssue[];
}
