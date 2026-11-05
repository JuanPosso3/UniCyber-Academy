import {
  CheckCircle2,
  ChevronRight,
  Circle,
  Lock,
  PlayCircle,
} from "lucide-react";
import { Badge } from "../ui/Badge";
import { ProgressBar } from "./ProgressBar";
import type {
  CourseProgressSummary,
  LearningLesson,
  LearningModule,
} from "../../types/lesson";
import type { NavigateFn } from "../../types/navigation";

export interface LessonSidebarProps {
  courseId: number;
  courseTitle: string;
  progress: CourseProgressSummary;
  modules: LearningModule[];
  currentLessonId: number;
  navigate: NavigateFn;
}

function lessonIcon(lesson: LearningLesson) {
  if (lesson.completed) {
    return <CheckCircle2 size={15} className="text-success" aria-hidden="true" />;
  }

  if (lesson.locked) {
    return <Lock size={14} className="text-muted-foreground" aria-hidden="true" />;
  }

  if (lesson.isNext) {
    return <PlayCircle size={15} className="text-accent" aria-hidden="true" />;
  }

  return <Circle size={13} className="text-muted-foreground" aria-hidden="true" />;
}

export function LessonSidebar({
  courseId,
  courseTitle,
  progress,
  modules,
  currentLessonId,
  navigate,
}: LessonSidebarProps) {
  return (
    <aside className="space-y-4 lg:sticky lg:top-20">
      <div className="rounded-2xl border border-border bg-card p-4">
        <p className="mb-1 text-xs font-semibold uppercase tracking-wide text-accent">
          Curso
        </p>
        <h2 className="mb-4 text-sm font-bold text-white">{courseTitle}</h2>
        <ProgressBar value={progress.percentage} />
        <p className="mt-2 text-xs text-muted-foreground">
          {progress.completedLessons} de {progress.totalLessons} lecciones
          completadas
        </p>
      </div>

      <nav aria-label="Lecciones del curso" className="space-y-3">
        {modules.map((module) => (
          <div
            key={module.id}
            className="overflow-hidden rounded-2xl border border-border bg-card"
          >
            <div className="border-b border-border px-4 py-3">
              <div className="flex items-center justify-between gap-2">
                <p className="text-xs font-bold uppercase tracking-wide text-muted-foreground">
                  Módulo {module.order}
                </p>
                {module.locked ? (
                  <Badge color="gray">
                    <Lock size={10} className="mr-1" aria-hidden="true" />
                    Bloqueado
                  </Badge>
                ) : module.completed ? (
                  <Badge color="green">Completado</Badge>
                ) : null}
              </div>
              <p className="mt-1 text-sm font-semibold text-white">
                {module.title}
              </p>
            </div>

            <ul className="divide-y divide-border/70">
              {module.lessons.map((lesson) => {
                const current = lesson.id === currentLessonId;
                const disabled = lesson.locked;

                return (
                  <li key={lesson.id}>
                    <button
                      type="button"
                      disabled={disabled}
                      aria-current={current ? "page" : undefined}
                      onClick={() =>
                        navigate(`/courses/${courseId}/lessons/${lesson.id}`)
                      }
                      className={`flex w-full items-center gap-2 px-3 py-2.5 text-left text-xs transition-colors ${
                        current
                          ? "bg-accent/10 text-white"
                          : disabled
                            ? "cursor-not-allowed text-muted-foreground/60"
                            : "text-muted-foreground hover:bg-white/5 hover:text-white"
                      }`}
                    >
                      <span className="flex-shrink-0">{lessonIcon(lesson)}</span>
                      <span className="min-w-0 flex-1">
                        <span className="block truncate font-medium">
                          {lesson.title}
                        </span>
                        <span className="block text-[10px] uppercase tracking-wide text-muted-foreground/70">
                          {lesson.type === "LABORATORY"
                            ? "Laboratorio"
                            : "Teoría"}
                        </span>
                      </span>
                      {!disabled && (
                        <ChevronRight
                          size={13}
                          className="flex-shrink-0 text-muted-foreground"
                          aria-hidden="true"
                        />
                      )}
                    </button>
                  </li>
                );
              })}
            </ul>

            {module.lessons.length === 0 && (
              <p className="px-4 py-3 text-xs text-muted-foreground">
                Este módulo todavía no tiene lecciones publicadas.
              </p>
            )}
          </div>
        ))}
      </nav>
    </aside>
  );
}
