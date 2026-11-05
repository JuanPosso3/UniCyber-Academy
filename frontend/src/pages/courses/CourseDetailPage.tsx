import { useEffect, useState } from "react";
import {
  ArrowLeft,
  BookOpen,
  CheckCircle2,
  ChevronRight,
  Circle,
  FlaskConical,
  Layers,
  Lock,
  PlayCircle,
} from "lucide-react";
import { AuthenticatedLayout } from "../../components/layout/AuthenticatedLayout";
import { Badge } from "../../components/ui/Badge";
import { Button } from "../../components/ui/Button";
import { Card } from "../../components/ui/Card";
import { StatePanel } from "../../components/ui/StatePanel";
import { ProgressBar } from "../../components/lessons/ProgressBar";
import { ApiError } from "../../lib/api";
import { getAvailableCourseRequest } from "../../services/courses";
import type { LearningCourse, LearningLesson } from "../../types/lesson";
import type { NavigateFn } from "../../types/navigation";

export interface CourseDetailPageProps {
  courseId: number;
  navigate: NavigateFn;
}

function LessonIcon({ lesson }: { lesson: LearningLesson }) {
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

export function CourseDetailPage({
  courseId,
  navigate,
}: CourseDetailPageProps) {
  const [course, setCourse] = useState<LearningCourse | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [reloadKey, setReloadKey] = useState(0);

  useEffect(() => {
    let active = true;

    setError(null);

    void getAvailableCourseRequest(courseId)
      .then(({ course: loadedCourse }) => {
        if (active) {
          setCourse(loadedCourse);
        }
      })
      .catch((requestError: unknown) => {
        if (!active) {
          return;
        }

        setCourse(null);
        setError(
          requestError instanceof ApiError
            ? requestError.message
            : "No se pudo cargar el curso.",
        );
      });

    return () => {
      active = false;
    };
  }, [courseId, reloadKey]);

  return (
    <AuthenticatedLayout
      title="Detalle del curso"
      currentPath="/courses"
      navigate={navigate}
    >
      <div className="mx-auto max-w-5xl space-y-5">
        <Button
          type="button"
          variant="ghost"
          onClick={() => navigate("/courses")}
        >
          <ArrowLeft size={15} /> Volver al catálogo
        </Button>

        {error && (
          <StatePanel
            variant="error"
            title="No se pudo abrir el curso"
            description={error}
            action={
              <div className="flex flex-wrap justify-center gap-2">
                <Button
                  type="button"
                  variant="secondary"
                  onClick={() => setReloadKey((value) => value + 1)}
                >
                  Reintentar
                </Button>
                <Button
                  type="button"
                  variant="ghost"
                  onClick={() => navigate("/courses")}
                >
                  Ir al catálogo
                </Button>
              </div>
            }
          />
        )}

        {!error && course === null && (
          <StatePanel
            variant="loading"
            title="Cargando curso"
            description="Estamos consultando la información del curso."
          />
        )}

        {course && (
          <>
            <Card className="p-6">
              <div className="flex flex-col gap-4 sm:flex-row sm:items-start">
                <div className="flex h-14 w-14 flex-shrink-0 items-center justify-center rounded-2xl bg-gradient-to-br from-primary/25 to-accent/20 text-primary">
                  <BookOpen size={26} aria-hidden="true" />
                </div>
                <div className="min-w-0 flex-1">
                  <div className="mb-2 flex flex-wrap items-center gap-2">
                    <Badge color="green">Publicado</Badge>
                    <span className="flex items-center gap-1.5 text-xs text-muted-foreground">
                      <Layers size={13} aria-hidden="true" />
                      {course.moduleCount}{" "}
                      {course.moduleCount === 1 ? "módulo" : "módulos"}
                    </span>
                  </div>
                  <h1 className="text-2xl font-bold text-white">
                    {course.title}
                  </h1>
                  <p className="mt-2 text-sm text-muted-foreground">
                    {course.description ?? "Sin descripción."}
                  </p>
                </div>
              </div>

              <div className="mt-5 rounded-2xl border border-border bg-white/[0.03] p-4">
                <ProgressBar value={course.progress.percentage} />
                <p className="mt-2 text-xs text-muted-foreground">
                  {course.progress.completedLessons} de{" "}
                  {course.progress.totalLessons} lecciones activas completadas.
                </p>
              </div>

              {course.assessment && (
                <div className="mt-5 rounded-2xl border border-border bg-white/[0.03] p-4">
                  <div className="flex items-center justify-between mb-2">
                    <h3 className="text-sm font-semibold text-white">
                      Evaluación final del curso
                    </h3>
                    <Badge
                      color={
                        course.assessment.passed
                          ? "green"
                          : course.assessment.status === "ACTIVE"
                            ? "blue"
                            : "yellow"
                      }
                    >
                      {course.assessment.passed
                        ? "Completada"
                        : course.assessment.status === "ACTIVE"
                          ? "Disponible"
                          : course.assessment.status === "DRAFT"
                            ? "Borrador"
                            : "Archivada"}
                    </Badge>
                  </div>
                  <p className="mt-1 text-xs text-muted-foreground">
                    {course.assessment.questionCount} de 8 preguntas
                  </p>
                  {course.assessment.attempted && (
                    <p className="mt-1 text-xs text-muted-foreground">
                      Último intento:{" "}
                      <span className="font-medium text-white">
                        {course.assessment.score}%
                      </span>{" "}
                      {course.assessment.passed ? "Aprobado" : "No aprobado"}
                    </p>
                  )}
                  {!course.assessment.attempted && course.assessment.status === "ACTIVE" && (
                    <p className="mt-1 text-xs text-muted-foreground">
                      Aún no has presentado el examen final.
                    </p>
                  )}
                </div>
              )}

            </Card>

            <section aria-labelledby="modules-title">
              <div className="mb-3 flex items-center justify-between">
                <h2
                  id="modules-title"
                  className="text-lg font-semibold text-white"
                >
                  Contenido del curso
                </h2>
                <span className="text-xs text-muted-foreground">
                  {course.modules.length} módulos publicados
                </span>
              </div>

              {course.modules.length === 0 ? (
                <StatePanel
                  variant="empty"
                  title="Este curso aún no tiene módulos disponibles"
                  description="El equipo administrativo publicará el contenido próximamente."
                />
              ) : (
                <ol className="space-y-4">
                  {course.modules.map((module) => (
                    <li key={module.id}>
                      <Card className="overflow-hidden">
                        <div className="border-b border-border bg-white/[0.03] p-4">
                          <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
                            <div className="flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-xl bg-accent/15 text-sm font-bold text-accent">
                              {module.order}
                            </div>
                            <div className="min-w-0 flex-1">
                              <div className="flex flex-wrap items-center gap-2">
                                <h3 className="text-sm font-semibold text-white">
                                  {module.title}
                                </h3>
                                {module.locked && (
                                  <Badge color="gray">
                                    <Lock
                                      size={10}
                                      className="mr-1"
                                      aria-hidden="true"
                                    />
                                    Bloqueado
                                  </Badge>
                                )}
                                {!module.locked && module.completed && (
                                  <Badge color="green">Completado</Badge>
                                )}
                              </div>
                              <p className="mt-1 text-sm text-muted-foreground">
                                {module.description ?? "Sin descripción."}
                              </p>
                            </div>
                          </div>
                        </div>

                        {module.lessons.length === 0 ? (
                          <p className="p-4 text-sm text-muted-foreground">
                            Este módulo todavía no tiene lecciones publicadas.
                          </p>
                        ) : (
                          <ul className="divide-y divide-border/70">
                            {module.lessons.map((lesson) => (
                              <li key={lesson.id}>
                                <button
                                  type="button"
                                  disabled={lesson.locked}
                                  onClick={() =>
                                    navigate(
                                      `/courses/${courseId}/lessons/${lesson.id}`,
                                    )
                                  }
                                  className={`flex w-full items-center gap-3 px-4 py-3 text-left transition-colors ${
                                    lesson.locked
                                      ? "cursor-not-allowed opacity-60"
                                      : "hover:bg-white/5"
                                  }`}
                                >
                                  <LessonIcon lesson={lesson} />
                                  <span className="min-w-0 flex-1">
                                    <span className="block text-sm font-medium text-white">
                                      {lesson.title}
                                    </span>
                                    <span className="mt-0.5 flex items-center gap-1 text-[11px] text-muted-foreground">
                                      {lesson.type === "LABORATORY" ? (
                                        <FlaskConical
                                          size={11}
                                          aria-hidden="true"
                                        />
                                      ) : (
                                        <BookOpen
                                          size={11}
                                          aria-hidden="true"
                                        />
                                      )}
                                      {lesson.type === "LABORATORY"
                                        ? "Laboratorio interactivo"
                                        : "Lección teórica"}
                                      {lesson.completed && " · Completada"}
                                    </span>
                                  </span>
                                  {!lesson.locked && (
                                    <ChevronRight
                                      size={15}
                                      className="flex-shrink-0 text-muted-foreground"
                                      aria-hidden="true"
                                    />
                                  )}
                                </button>
                              </li>
                            ))}
                          </ul>
                        )}
                      </Card>
                    </li>
                  ))}
                </ol>
              )}
            </section>
          </>
        )}
      </div>
    </AuthenticatedLayout>
  );
}
