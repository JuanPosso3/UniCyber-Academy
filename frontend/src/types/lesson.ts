import type {
  ContentStatus,
  CourseModule,
  CourseSummary,
} from "./course";
import type { CourseFinalAssessmentSummary } from "./assessment";
import type { Achievement } from "./achievement";

export type LessonType = "THEORY" | "LABORATORY";

export type TheoryBlockType =
  | "heading"
  | "paragraph"
  | "list"
  | "table"
  | "code"
  | "callout"
  | "link";

export type CalloutVariant =
  | "IMPORTANT"
  | "WARNING"
  | "TIP"
  | "COMMON_MISTAKE"
  | "INFO";

export interface TheoryHeadingBlock {
  id: string;
  type: "heading";
  content: string;
  level?: 2 | 3;
}

export interface TheoryParagraphBlock {
  id: string;
  type: "paragraph";
  content: string;
}

export interface TheoryListBlock {
  id: string;
  type: "list";
  style?: "ordered" | "unordered";
  items: string[];
}

export interface TheoryTableBlock {
  id: string;
  type: "table";
  headers: string[];
  rows: string[][];
  caption?: string;
}

export interface TheoryCodeBlock {
  id: string;
  type: "code";
  content: string;
  language?: string;
}

export interface TheoryCalloutBlock {
  id: string;
  type: "callout";
  variant: CalloutVariant;
  content: string;
}

export interface TheoryLinkBlock {
  id: string;
  type: "link";
  label: string;
  url: string;
  description?: string;
}

export type TheoryBlock =
  | TheoryHeadingBlock
  | TheoryParagraphBlock
  | TheoryListBlock
  | TheoryTableBlock
  | TheoryCodeBlock
  | TheoryCalloutBlock
  | TheoryLinkBlock;

export interface TheoryContent {
  schemaVersion: 1;
  blocks: TheoryBlock[];
}

export type LabActivityType =
  | "SINGLE_CHOICE"
  | "IDENTIFY_SUSPICIOUS"
  | "MULTIPLE_SELECT"
  | "DECISION_STEPS"
  | "ORDER_PROCEDURE"
  | "CHAINED"
  | "TERMINAL"
  | "EMAIL_ANALYSIS";

export interface LabOption {
  id: string;
  text: string;
}

export interface DecisionStep {
  id: string;
  prompt: string;
  options: LabOption[];
}

export interface DecisionAnswer {
  stepId: string;
  optionId: string;
}

export interface TerminalCommand {
  command: string;
  output: string;
  description?: string;
}

export interface LabActivityBase {
  id: string;
  title: string;
  instructions: string;
  required?: boolean;
  hints?: string[];
}

export interface SingleChoiceActivity extends LabActivityBase {
  type: "SINGLE_CHOICE";
  options: LabOption[];
  solution?: { optionId: string };
}

export interface IdentifySuspiciousActivity extends LabActivityBase {
  type: "IDENTIFY_SUSPICIOUS";
  elements: LabOption[];
  solution?: { elementIds: string[] };
}

export interface MultipleSelectActivity extends LabActivityBase {
  type: "MULTIPLE_SELECT";
  options: LabOption[];
  solution?: { optionIds: string[] };
}

export interface DecisionStepsActivity extends LabActivityBase {
  type: "DECISION_STEPS";
  steps: DecisionStep[];
  solution?: { answers: DecisionAnswer[] };
}

export interface OrderProcedureActivity extends LabActivityBase {
  type: "ORDER_PROCEDURE";
  items: LabOption[];
  solution?: { order: string[] };
}

export interface ChainedActivity extends LabActivityBase {
  type: "CHAINED";
  activities: LabActivity[];
}

export interface TerminalActivity extends LabActivityBase {
  type: "TERMINAL";
  prompt?: string;
  welcome?: string;
  commands: TerminalCommand[];
  solution?: { requiredCommands: string[] };
}

export interface EmailAnalysisElement {
  id: string;
  /** Etiqueta accesible que describe la parte del correo. */
  text: string;
}

export interface EmailAnalysisParagraph {
  text: string;
  /** Si se define, el párrafo se puede marcar como sospechoso. */
  elementId?: string;
}

export interface EmailAnalysisEmail {
  fromName: string;
  fromAddress: string;
  /** Parte seleccionable completa del remitente. */
  fromElementId?: string;
  toAddress: string;
  toElementId?: string;
  subject: string;
  subjectElementId?: string;
  datetime: string;
  datetimeElementId?: string;
  greeting?: string;
  greetingElementId?: string;
  body: EmailAnalysisParagraph[];
  linkLabel?: string;
  linkUrl?: string;
  linkElementId?: string;
  closingLines?: string[];
  closingElementId?: string;
  signatureLines?: string[];
  signatureElementId?: string;
  confidentialityNote?: string;
  /** Nota educativa que no forma parte del correo evaluado. */
  disclaimer?: string;
}

export interface EmailAnalysisActivity extends LabActivityBase {
  type: "EMAIL_ANALYSIS";
  email: EmailAnalysisEmail;
  elements: EmailAnalysisElement[];
  solution?: { elementIds: string[] };
}

export type LabActivity =
  | SingleChoiceActivity
  | IdentifySuspiciousActivity
  | MultipleSelectActivity
  | DecisionStepsActivity
  | OrderProcedureActivity
  | ChainedActivity
  | TerminalActivity
  | EmailAnalysisActivity;

export interface LabContent {
  schemaVersion: 1;
  introduction: string;
  objective: string;
  scenario: string;
  activities: LabActivity[];
  completion?: { requiredActivityIds?: string[] };
}

export type LessonContent = TheoryContent | LabContent;

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

export interface LearningModule extends CourseModule {
  locked: boolean;
  completed: boolean;
  lessons: LearningLesson[];
}

export interface LearningCourse extends CourseSummary {
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
  module: CourseModule;
  lessons: AdminLessonSummary[];
}

export interface AdminLessonResponse {
  course: {
    id: number;
    title: string;
    status: ContentStatus;
  };
  module: CourseModule;
  lesson: AdminLesson;
}

export interface LessonContentIssue {
  path: string;
  code: string;
  message: string;
  blockId?: string;
  activityId?: string;
}

export interface LessonContentValidationResponse {
  valid: boolean;
  issues: LessonContentIssue[];
}

export interface CreateLessonPayload {
  title: string;
  type: LessonType;
  content: LessonContent;
}

export interface UpdateLessonPayload {
  title?: string;
  type?: LessonType;
  content?: LessonContent;
}

export interface LessonListResponse {
  lessons: AdminLessonSummary[];
}

export interface LessonResponse {
  lesson: AdminLessonSummary;
}

export interface AdminLessonDetailResponse {
  course: AdminLessonList["course"];
  module: CourseModule;
  lesson: AdminLesson;
}

export interface StudentCourseDetailResponse {
  course: LearningCourse;
}

export interface ActivityCheckResponse {
  correct: boolean;
  message: string;
}

export interface TerminalResponse {
  command: string;
  output: string;
}

export interface LessonCompletionResponse {
  lessonProgress: { completedAt: string };
  progress: CourseProgressSummary;
  newlyUnlocked?: Achievement[];
}
