import { useEffect, useState } from "react";
import {
  Archive,
  ArrowDown,
  ArrowLeft,
  ArrowUp,
  Edit2,
  Eye,
  Plus,
  Send,
  Trash2,
} from "lucide-react";
import { AuthenticatedLayout } from "../../components/layout/AuthenticatedLayout";
import { AdminNav } from "../../components/layout/AdminNav";
import { ContentStatusBadge } from "../../components/courses/ContentStatusBadge";
import { LessonTypeBadge } from "../../components/lessons/LessonTypeBadge";
import { Alert } from "../../components/ui/Alert";
import { Button } from "../../components/ui/Button";
import { Card } from "../../components/ui/Card";
import { ConfirmDialog } from "../../components/ui/ConfirmDialog";
import { StatePanel } from "../../components/ui/StatePanel";
import { ApiError } from "../../lib/api";
import { consumeFlash } from "../../lib/flash";
import {
  changeLessonStatusRequest,
  deleteLessonRequest,
  listAdminLessonsRequest,
  moveLessonRequest,
} from "../../services/lessons";
import type {
  AdminLessonList,
  AdminLessonSummary,
} from "../../types/lesson";
import type { ContentStatus } from "../../types/course";
import type { NavigateFn } from "../../types/navigation";

export interface CourseLessonsPageProps {
  courseId: number;
  moduleId: number;
  navigate: NavigateFn;
}

export function CourseLessonsPage({
  courseId,
  moduleId,
  navigate,
}: CourseLessonsPageProps) {
  const [data, setData] = useState<AdminLessonList | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<{
    variant: "success" | "error";
    message: string;
  } | null>(null);
  const [reloadKey, setReloadKey] = useState(0);
  const [pendingId, setPendingId] = useState<number | null>(null);
  const [lessonToArchive, setLessonToArchive] =
    useState<AdminLessonSummary | null>(null);
  const [lessonToDelete, setLessonToDelete] =
    useState<AdminLessonSummary | null>(null);

  useEffect(() => {
    setNotice(consumeFlash());
  }, []);

  useEffect(() => {
    let active = true;

    setError(null);

    void listAdminLessonsRequest(courseId, moduleId)
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
            : "No se pudieron cargar las lecciones del módulo.",
        );
      });

    return () => {
      active = false;
    };
  }, [courseId, moduleId, reloadKey]);

  const changeStatus = async (
    lesson: AdminLessonSummary,
    status: ContentStatus,
  ) => {
    setPendingId(lesson.id);
    setNotice(null);

    try {
      const { lesson: updated } = await changeLessonStatusRequest(
        courseId,
        moduleId,
        lesson.id,
        status,
      );

      setData((current) =>
        current
          ? {
              ...current,
              lessons: current.lessons.map((item) =>
                item.id === updated.id ? updated : item,
              ),
            }
          : current,
      );
      setNotice({
        variant: "success",
        message:
          status === "ACTIVE"
            ? "La lección se publicó correctamente."
            : "La lección se archivó correctamente.",
      });
      setLessonToArchive(null);
    } catch (requestError) {
      setNotice({
        variant: "error",
        message:
          requestError instanceof ApiError
            ? requestError.message
            : "No se pudo cambiar el estado de la lección.",
      });
    } finally {
      setPendingId(null);
    }
  };

  const move = async (
    lesson: AdminLessonSummary,
    direction: "up" | "down",
  ) => {
    setPendingId(lesson.id);
    setNotice(null);

    try {
      const { lessons } = await moveLessonRequest(
        courseId,
        moduleId,
        lesson.id,
        direction,
      );

      setData((current) => (current ? { ...current, lessons } : current));
      setNotice({
        variant: "success",
        message: "El orden de las lecciones se actualizó.",
      });
    } catch (requestError) {
      setNotice({
        variant: "error",
        message:
          requestError instanceof ApiError
            ? requestError.message
            : "No se pudo reordenar la lección.",
      });
    } finally {
      setPendingId(null);
    }
  };

  const remove = async (lesson: AdminLessonSummary) => {
    setPendingId(lesson.id);
    setNotice(null);

    try {
      const { lessons } = await deleteLessonRequest(
        courseId,
        moduleId,
        lesson.id,
      );

      setData((current) => (current ? { ...current, lessons } : current));
      setNotice({
        variant: "success",
        message: "La lección se eliminó definitivamente.",
      });
      setLessonToDelete(null);
    } catch (requestError) {
      setNotice({
        variant: "error",
        message:
          requestError instanceof ApiError
            ? requestError.message
            : "No se pudo eliminar la lección.",
      });
    } finally {
      setPendingId(null);
    }
  };

  const courseIsArchived = data?.course.status === "ARCHIVED";

  return (
    <AuthenticatedLayout
      title="Lecciones del módulo"
      currentPath="/admin/courses"
      navigate={navigate}
    >
      <div className="space-y-5">
        <Button
          type="button"
          variant="ghost"
          onClick={() =>
            navigate(`/admin/courses/${courseId}/modules`)
          }
        >
          <ArrowLeft size={15} /> Volver a los módulos
        </Button>

        <AdminNav currentPath="/admin/courses" navigate={navigate} />

        {data && (
          <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-start">
            <div>
              <p className="text-xs font-medium text-accent">
                {data.course.title}
              </p>
              <div className="mb-1 flex flex-wrap items-center gap-2">
                <h1 className="text-2xl font-bold text-white">
                  {data.module.title}
                </h1>
                <ContentStatusBadge status={data.module.status} />
              </div>
              <p className="text-sm text-muted-foreground">
                Administra las lecciones teóricas y los laboratorios del
                módulo. Las lecciones nuevas se crean como borrador.
              </p>
            </div>

            <div className="flex flex-wrap gap-2">
              <Button
                type="button"
                variant="secondary"
                onClick={() =>
                  navigate(
                    `/admin/courses/${courseId}/modules/${moduleId}/edit`,
                  )
                }
              >
                <Edit2 size={15} /> Editar módulo
              </Button>
              <Button
                type="button"
                variant="primary"
                disabled={courseIsArchived}
                onClick={() =>
                  navigate(
                    `/admin/courses/${courseId}/modules/${moduleId}/lessons/new`,
                  )
                }
              >
                <Plus size={16} /> Nueva lección
              </Button>
            </div>
          </div>
        )}

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

        {courseIsArchived && (
          <Alert variant="warning">
            El curso está archivado. Las lecciones se conservan, pero no se
            pueden modificar mientras el curso permanezca en ese estado.
          </Alert>
        )}

        {error && (
          <StatePanel
            variant="error"
            title="No se pudieron cargar las lecciones"
            description={error}
            action={
              <Button
                type="button"
                variant="secondary"
                onClick={() => setReloadKey((value) => value + 1)}
              >
                Reintentar
              </Button>
            }
          />
        )}

        {!error && data === null && (
          <StatePanel
            variant="loading"
            title="Cargando lecciones"
            description="Estamos consultando el contenido del módulo."
          />
        )}

        {!error && data && data.lessons.length === 0 && (
          <StatePanel
            variant="empty"
            title="Este módulo todavía no tiene lecciones"
            description={
              courseIsArchived
                ? "El curso está archivado y no admite nuevas lecciones."
                : "Crea la primera lección teórica o laboratorio para empezar."
            }
            action={
              !courseIsArchived ? (
                <Button
                  type="button"
                  variant="primary"
                  onClick={() =>
                    navigate(
                      `/admin/courses/${courseId}/modules/${moduleId}/lessons/new`,
                    )
                  }
                >
                  <Plus size={16} /> Nueva lección
                </Button>
              ) : undefined
            }
          />
        )}

        {!error && data && data.lessons.length > 0 && (
          <ol className="space-y-3">
            {data.lessons.map((lesson, index) => {
              const isPending = pendingId === lesson.id;
              const isFirst = index === 0;
              const isLast = index === data.lessons.length - 1;

              return (
                <li key={lesson.id}>
                  <Card className="p-4">
                    <div className="flex flex-col gap-4 sm:flex-row sm:items-center">
                      <div className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-xl bg-accent/15 text-sm font-bold text-accent">
                        {lesson.order}
                      </div>

                      <div className="min-w-0 flex-1">
                        <div className="flex flex-wrap items-center gap-2">
                          <h2 className="text-sm font-semibold text-white">
                            {lesson.title}
                          </h2>
                          <LessonTypeBadge type={lesson.type} />
                          <ContentStatusBadge status={lesson.status} />
                        </div>
                        <p className="mt-1 text-xs text-muted-foreground">
                          {lesson.progressCount}{" "}
                          {lesson.progressCount === 1
                            ? "estudiante ha completado"
                            : "estudiantes han completado"}{" "}
                          esta lección.
                        </p>
                      </div>

                      <div className="flex flex-wrap items-center gap-1.5 sm:justify-end">
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          disabled={courseIsArchived || isPending || isFirst}
                          onClick={() => {
                            void move(lesson, "up");
                          }}
                          aria-label={`Mover «${lesson.title}» hacia arriba`}
                        >
                          <ArrowUp size={14} />
                        </Button>
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          disabled={courseIsArchived || isPending || isLast}
                          onClick={() => {
                            void move(lesson, "down");
                          }}
                          aria-label={`Mover «${lesson.title}» hacia abajo`}
                        >
                          <ArrowDown size={14} />
                        </Button>

                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          disabled={isPending}
                          onClick={() =>
                            navigate(
                              `/admin/courses/${courseId}/modules/${moduleId}/lessons/${lesson.id}/preview`,
                            )
                          }
                        >
                          <Eye size={14} /> Vista previa
                        </Button>

                        <Button
                          type="button"
                          variant="secondary"
                          size="sm"
                          disabled={courseIsArchived}
                          onClick={() =>
                            navigate(
                              `/admin/courses/${courseId}/modules/${moduleId}/lessons/${lesson.id}/edit`,
                            )
                          }
                        >
                          <Edit2 size={14} /> Editar
                        </Button>

                        {lesson.status === "DRAFT" && (
                          <Button
                            type="button"
                            variant="primary"
                            size="sm"
                            disabled={courseIsArchived || isPending}
                            onClick={() => {
                              void changeStatus(lesson, "ACTIVE");
                            }}
                          >
                            <Send size={14} /> Publicar
                          </Button>
                        )}

                        {lesson.status === "ARCHIVED" && (
                          <Button
                            type="button"
                            variant="primary"
                            size="sm"
                            disabled={courseIsArchived || isPending}
                            onClick={() => {
                              void changeStatus(lesson, "ACTIVE");
                            }}
                          >
                            <Send size={14} /> Reactivar
                          </Button>
                        )}

                        {lesson.status !== "ARCHIVED" && (
                          <Button
                            type="button"
                            variant="danger"
                            size="sm"
                            disabled={courseIsArchived || isPending}
                            onClick={() => setLessonToArchive(lesson)}
                          >
                            <Archive size={14} /> Archivar
                          </Button>
                        )}

                        <Button
                          type="button"
                          variant="danger"
                          size="sm"
                          disabled={
                            courseIsArchived ||
                            isPending ||
                            lesson.progressCount > 0
                          }
                          title={
                            lesson.progressCount > 0
                              ? "No se puede eliminar una lección con progreso registrado."
                              : "Eliminar definitivamente"
                          }
                          onClick={() => setLessonToDelete(lesson)}
                        >
                          <Trash2 size={14} /> Eliminar
                        </Button>
                      </div>
                    </div>
                  </Card>
                </li>
              );
            })}
          </ol>
        )}
      </div>

      <ConfirmDialog
        open={lessonToArchive !== null}
        title="Archivar lección"
        description={
          lessonToArchive
            ? `La lección «${lessonToArchive.title}» dejará de estar visible para los estudiantes. Su contenido y los registros de progreso se conservarán.`
            : ""
        }
        confirmLabel="Archivar lección"
        isConfirming={
          lessonToArchive !== null && pendingId === lessonToArchive.id
        }
        onCancel={() => setLessonToArchive(null)}
        onConfirm={() => {
          if (lessonToArchive) {
            void changeStatus(lessonToArchive, "ARCHIVED");
          }
        }}
      />

      <ConfirmDialog
        open={lessonToDelete !== null}
        title="Eliminar lección"
        description={
          lessonToDelete
            ? `La lección «${lessonToDelete.title}» se eliminará definitivamente. Esta acción no se puede deshacer.`
            : ""
        }
        confirmLabel="Eliminar lección"
        isConfirming={
          lessonToDelete !== null && pendingId === lessonToDelete.id
        }
        onCancel={() => setLessonToDelete(null)}
        onConfirm={() => {
          if (lessonToDelete) {
            void remove(lessonToDelete);
          }
        }}
      />
    </AuthenticatedLayout>
  );
}
