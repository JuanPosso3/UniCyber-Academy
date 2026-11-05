import { useEffect, useRef, useState } from "react";
import {
  ArrowLeft,
  ArrowRight,
  CheckCircle2,
  Lock,
  Save,
} from "lucide-react";
import { AuthenticatedLayout } from "../../components/layout/AuthenticatedLayout";
import { Alert } from "../../components/ui/Alert";
import { Badge } from "../../components/ui/Badge";
import { Button } from "../../components/ui/Button";
import { Card } from "../../components/ui/Card";
import { StatePanel } from "../../components/ui/StatePanel";
import { LessonSidebar } from "../../components/lessons/LessonSidebar";
import { LessonTypeBadge } from "../../components/lessons/LessonTypeBadge";
import { TheoryRenderer } from "../../components/lessons/TheoryRenderer";
import { LaboratoryRenderer } from "../../components/lessons/lab/LaboratoryRenderer";
import { isLabContent, isTheoryContent } from "../../lib/lab";
import { ApiError } from "../../lib/api";
import {
  completeTheoryLessonRequest,
  getStudentLessonRequest,
} from "../../services/lessons";
import { useAchievementToast } from "../../context/AchievementToastContext";
import type { StudentLessonResponse } from "../../types/lesson";
import type { NavigateFn } from "../../types/navigation";

export interface LessonPageProps {
  courseId: number;
  lessonId: number;
  navigate: NavigateFn;
}

export function LessonPage({ courseId, lessonId, navigate }: LessonPageProps) {
  const [data, setData] = useState<StudentLessonResponse | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<{
    variant: "success" | "error";
    message: string;
  } | null>(null);
  const [isCompleting, setIsCompleting] = useState(false);
  const [reloadKey, setReloadKey] = useState(0);
  const autoCompletedLessonRef = useRef<number | null>(null);
  const { addToast } = useAchievementToast();

  useEffect(() => {
    let active = true;

    setError(null);

    void getStudentLessonRequest(courseId, lessonId)
      .then((loaded) => {
        if (active) {
          setData(loaded);
        }
      })
      .catch((requestError: unknown) => {
        if (!active) {
          return;
        }

        setData(null);
        setError(
          requestError instanceof ApiError
            ? requestError.message
            : "No se pudo cargar la lección.",
        );
      });

    return () => {
      active = false;
    };
  }, [courseId, lessonId, reloadKey]);

  const completeTheory = async () => {
    if (!data) {
      return;
    }

    setIsCompleting(true);
    setNotice(null);

    try {
      const response = await completeTheoryLessonRequest(courseId, lessonId);
      const newlyUnlocked = response.newlyUnlocked ?? [];
      for (const achievement of newlyUnlocked) {
        addToast(achievement);
      }
      setNotice({
        variant: "success",
        message: "Lección completada. Tu progreso se actualizó.",
      });
      setReloadKey((value) => value + 1);
    } catch (requestError) {
      setNotice({
        variant: "error",
        message:
          requestError instanceof ApiError
            ? requestError.message
            : "No se pudo completar la lección.",
      });
    } finally {
      setIsCompleting(false);
    }
  };

  useEffect(() => {
    if (
      !data ||
      data.lesson.type !== "THEORY" ||
      data.lesson.completed ||
      autoCompletedLessonRef.current === data.lesson.id
    ) {
      return;
    }

    autoCompletedLessonRef.current = data.lesson.id;
    void completeTheory();
  }, [data]);

  const goToLesson = (targetId: number | null) => {
    if (targetId !== null) {
      navigate(`/courses/${courseId}/lessons/${targetId}`);
    }
  };

  return (
    <AuthenticatedLayout
      title={data?.lesson.title ?? "Lección"}
      currentPath={`/courses/${courseId}/lessons/${lessonId}`}
      navigate={navigate}
    >
      <div className="space-y-5">
        <Button
          type="button"
          variant="ghost"
          onClick={() => navigate(`/courses/${courseId}`)}
        >
          <ArrowLeft size={15} /> Volver al curso
        </Button>

        {error && (
          <StatePanel
            variant="error"
            title="No se pudo abrir la lección"
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
                  onClick={() => navigate(`/courses/${courseId}`)}
                >
                  Volver al curso
                </Button>
              </div>
            }
          />
        )}

        {!error && data === null && (
          <StatePanel
            variant="loading"
            title="Cargando lección"
            description="Estamos preparando el contenido."
          />
        )}

        {data && (
          <div className="grid gap-5 lg:grid-cols-[minmax(0,1fr)_19rem]">
            <main className="min-w-0 space-y-4">
              <Card className="p-5">
                <p className="mb-1 text-xs font-medium text-accent">
                  {data.course.title} · Módulo {data.module.order}
                </p>
                <div className="flex flex-wrap items-center gap-2">
                  <h1 className="text-2xl font-bold text-white">
                    {data.lesson.title}
                  </h1>
                  <LessonTypeBadge type={data.lesson.type} />
                  {data.lesson.completed && (
                    <Badge color="green">
                      <CheckCircle2
                        size={11}
                        className="mr-1"
                        aria-hidden="true"
                      />
                      Completada
                    </Badge>
                  )}
                </div>
                <p className="mt-2 text-sm text-muted-foreground">
                  {data.module.title}
                </p>
              </Card>

              {notice && (
                <Alert variant={notice.variant}>
                  <span className="flex-1">{notice.message}</span>
                  <button
                    type="button"
                    onClick={() => setNotice(null)}
                    className="ml-2 text-xs font-semibold underline"
                  >
                    Cerrar
                  </button>
                </Alert>
              )}


              {data.lesson.type === "THEORY" ? (
                isTheoryContent(data.lesson.content) ? (
                  <>
                    <Card className="p-5">
                      <TheoryRenderer content={data.lesson.content} />
                    </Card>
                    <Card className="flex flex-col items-start justify-between gap-3 p-5 sm:flex-row sm:items-center">
                      <div>
                        <p className="text-sm font-semibold text-white">
                          {data.lesson.completed
                            ? "Lección completada"
                            : "¿Terminaste de estudiar esta lección?"}
                        </p>
                        <p className="mt-1 text-xs text-muted-foreground">
                          {data.lesson.completed
                            ? "Puedes continuar con la siguiente lección disponible."
                            : "Marca la lección como completada para avanzar en el curso."}
                        </p>
                      </div>
                      {data.lesson.completed ? (
                        <Badge color="green">
                          <CheckCircle2
                            size={12}
                            className="mr-1"
                            aria-hidden="true"
                          />
                          Completada
                        </Badge>
                      ) : (
                        <Button
                          type="button"
                          variant="primary"
                          disabled={isCompleting}
                          onClick={() => {
                            void completeTheory();
                          }}
                        >
                          <Save size={15} />
                          {isCompleting
                            ? "Guardando..."
                            : "Marcar como completada"}
                        </Button>
                      )}
                    </Card>
                  </>
                ) : (
                  <Alert variant="error">
                    El contenido de esta lección no tiene un formato válido.
                  </Alert>
                )
              ) : isLabContent(data.lesson.content) ? (
                <LaboratoryRenderer
                  content={data.lesson.content}
                  mode="student"
                  courseId={courseId}
                  lessonId={lessonId}
                  completed={data.lesson.completed}
                  onCompleted={(response) => {
                    const newlyUnlocked = response.newlyUnlocked ?? [];
                    for (const achievement of newlyUnlocked) {
                      addToast(achievement);
                    }
                    setNotice({
                      variant: "success",
                      message:
                        "Laboratorio completado. Tu progreso se actualizó.",
                    });
                    setReloadKey((value) => value + 1);
                  }}
                />
              ) : (
                <Alert variant="error">
                  El contenido de este laboratorio no tiene un formato válido.
                </Alert>
              )}

              <Card className="flex flex-col gap-3 p-4 sm:flex-row sm:items-center sm:justify-between">
                <Button
                  type="button"
                  variant="secondary"
                  disabled={data.navigation.previousLessonId === null}
                  onClick={() => goToLesson(data.navigation.previousLessonId)}
                >
                  <ArrowLeft size={15} /> Lección anterior
                </Button>

                <div className="flex flex-col items-stretch gap-2 sm:items-end">
                  <Button
                    type="button"
                    variant="primary"
                    disabled={
                      data.navigation.nextLessonId === null ||
                      data.navigation.nextLessonLocked
                    }
                    onClick={() => goToLesson(data.navigation.nextLessonId)}
                  >
                    {data.navigation.nextLessonLocked ? (
                      <>
                        <Lock size={14} /> Siguiente bloqueada
                      </>
                    ) : (
                      <>
                        Siguiente lección <ArrowRight size={15} />
                      </>
                    )}
                  </Button>
                  {data.navigation.nextLessonLocked && (
                    <p className="text-[11px] text-muted-foreground sm:text-right">
                      Completa esta lección para desbloquear la siguiente.
                    </p>
                  )}
                  {data.navigation.nextLessonId === null &&
                    data.lesson.completed &&
                    data.course.progress.percentage === 100 && (
                      <p className="text-[11px] text-success sm:text-right">
                        Has completado todas las lecciones activas del curso.
                      </p>
                    )}
                </div>
              </Card>
            </main>

            <LessonSidebar
              courseId={courseId}
              courseTitle={data.course.title}
              progress={data.course.progress}
              modules={data.modules}
              currentLessonId={lessonId}
              navigate={navigate}
            />
          </div>
        )}
      </div>
    </AuthenticatedLayout>
  );
}
