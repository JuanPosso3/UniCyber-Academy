import type { ContentStatus } from '../../domain/content.js';
import type { QuestionType } from '../../domain/assessment.js';
import type { Achievement } from '../achievements/achievement.types.js';

/** Resumen del estado de la evaluación final para una persona. */
export interface CourseFinalAssessmentSummary {
  status: ContentStatus;
  questionCount: number;
  complete: boolean;
  attempted: boolean;
  passed: boolean;
  score: number | null;
  completedAt: string | null;
}

/** Pregunta vista por el administrador, incluidas las respuestas correctas. */
export interface AdminQuestion {
  id: number;
  order: number;
  statement: string;
  type: QuestionType;
  status: ContentStatus;
  explanation: string | null;
  hint: string | null;
  options: AdminQuestionOption[];
}

export interface AdminQuestionOption {
  id: number;
  order: number;
  text: string;
  isCorrect: boolean;
}

/** Evaluación final completa para el administrador. */
export interface AdminFinalAssessment {
  id: number;
  title: string;
  description: string | null;
  status: ContentStatus;
  questionCount: number;
  complete: boolean;
  attemptCount: number;
  questions: AdminQuestion[];
}

export interface AdminCourseFinalAssessmentResponse {
  course: {
    id: number;
    title: string;
    status: ContentStatus;
  };
  assessment: AdminFinalAssessment | null;
}

export interface AdminCourseFinalAssessmentListResponse {
  assessments: Array<{
    courseId: number;
    courseTitle: string;
    courseStatus: ContentStatus;
    assessmentId: number | null;
    status: ContentStatus | null;
    questionCount: number | null;
    complete: boolean | null;
    attemptCount: number | null;
  }>;
}

/** Pregunta vista por el estudiante, sin revelar la respuesta correcta. */
export interface StudentQuestion {
  id: number;
  order: number;
  statement: string;
  type: QuestionType;
  options: StudentQuestionOption[];
}

export interface StudentQuestionOption {
  id: number;
  order: number;
  text: string;
}

/** Datos de la evaluación disponibles para el estudiante. */
export interface StudentFinalAssessment {
  id: number;
  title: string;
  description: string | null;
  questions: StudentQuestion[];
}

/** Estado de elegibilidad para presentar la evaluación final. */
export interface AssessmentEligibility {
  available: boolean;
  reason: string | null;
  remainingLessons: Array<{
    lessonId: number;
    lessonTitle: string;
    moduleTitle: string;
  }>;
}

/** Intento de evaluación ya presentado. */
export interface StudentAssessmentAttemptSummary {
  score: number;
  correctAnswers: number;
  incorrectAnswers: number;
  passed: boolean;
  completedAt: string;
}

/** Revisión pregunta por pregunta de un intento presentado. */
export interface AttemptQuestionReview {
  questionId: number;
  order: number;
  statement: string;
  type: QuestionType;
  answeredCorrectly: boolean;
  selectedOptionText: string | null;
  explanation: string | null;
  hint: string | null;
}

export interface StudentAssessmentResults {
  attempt: StudentAssessmentAttemptSummary;
  questions: AttemptQuestionReview[];
}

/** Respuesta de consulta del examen para el estudiante. */
export interface StudentAssessmentResponse {
  course: {
    id: number;
    title: string;
    status: ContentStatus;
  };
  assessment: StudentFinalAssessment | null;
  eligibility: AssessmentEligibility;
  attempt: StudentAssessmentAttemptSummary | null;
  progress: {
    completedLessons: number;
    totalLessons: number;
    percentage: number;
  };
}

/** Resultado inmediato tras enviar un intento. */
export interface SubmitAssessmentResponse {
  results: StudentAssessmentResults;
  newlyUnlocked?: Achievement[];
}
