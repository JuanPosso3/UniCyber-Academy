import { useEffect, useState } from "react";
import {
  Archive,
  ArrowDown,
  ArrowLeft,
  ArrowUp,
  Edit2,
  FileText,
  Plus,
  Send,
} from "lucide-react";
import { AuthenticatedLayout } from "../../components/layout/AuthenticatedLayout";
import { AdminNav } from "../../components/layout/AdminNav";
import { ContentStatusBadge } from "../../components/courses/ContentStatusBadge";
import { Alert } from "../../components/ui/Alert";
import { Button } from "../../components/ui/Button";
import { Card } from "../../components/ui/Card";
import { ConfirmDialog } from "../../components/ui/ConfirmDialog";
import { StatePanel } from "../../components/ui/StatePanel";
import { ApiError } from "../../lib/api";
import { consumeFlash } from "../../lib/flash";
import {
  changeModuleStatusRequest,
  listAdminModulesRequest,
  moveModuleRequest,
} from "../../services/courses";
import type {
  ContentStatus,
  CourseModule,
  CourseModuleList,
} from "../../types/course";
import type { NavigateFn } from "../../types/navigation";

export interface CourseModulesPageProps {
  courseId: number;
  navigate: NavigateFn;
}

export function CourseModulesPage({
  courseId,
  navigate,
}: CourseModulesPageProps) {
  const [data, setData] = useState<CourseModuleList | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<{
    variant: "success" | "error";
    message: string;
  } | null>(null);
  const [reloadKey, setReloadKey] = useState(0);
  const [pendingId, setPendingId] = useState<number | null>(null);
  const [moduleToArchive, setModuleToArchive] =
    useState<CourseModule | null>(null);

  useEffect(() => {
    setNotice(consumeFlash());
  }, []);

  useEffect(() => {
    let active = true;

    setError(null);

    void listAdminModulesRequest(courseId)
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
            : "No se pudieron cargar los módulos del curso.",
        );
      });

    return () => {
      active = false;
    };
  }, [courseId, reloadKey]);

  const changeStatus = async (
    module: CourseModule,
    status: ContentStatus,
  ) => {
    setPendingId(module.id);
    setNotice(null);

    try {
      const { module: updated } = await changeModuleStatusRequest(
        courseId,
        module.id,
        status,
      );

      setData((current) =>
        current
          ? {
              ...current,
              modules: current.modules.map((item) =>
                item.id === updated.id ? updated : item,
              ),
            }
          : current,
      );
      setNotice({
        variant: "success",
        message:
          status === "ACTIVE"
            ? "El módulo se publicó correctamente."
            : "El módulo se archivó correctamente.",
      });
      setModuleToArchive(null);
    } catch (requestError) {
      setNotice({
        variant: "error",
        message:
          requestError instanceof ApiError
            ? requestError.message
            : "No se pudo cambiar el estado del módulo.",
      });
    } finally {
      setPendingId(null);
    }
  };

  const move = async (
    module: CourseModule,
    direction: "up" | "down",
  ) => {
    setPendingId(module.id);
    setNotice(null);

    try {
      const { modules } = await moveModuleRequest(
        courseId,
        module.id,
        direction,
      );

      setData((current) => (current ? { ...current, modules } : current));
      setNotice({
        variant: "success",
        message: "El orden de los módulos se actualizó.",
      });
    } catch (requestError) {
      setNotice({
        variant: "error",
        message:
          requestError instanceof ApiError
            ? requestError.message
            : "No se pudo reordenar el módulo.",
      });
    } finally {
      setPendingId(null);
    }
  };

  const courseIsArchived = data?.course.status === "ARCHIVED";

  return (
    <AuthenticatedLayout
      title="Módulos del curso"
      currentPath="/admin/courses"
      navigate={navigate}
    >
      <div className="space-y-5">
        <Button
          type="button"
          variant="ghost"
          onClick={() => navigate("/admin/courses")}
        >
          <ArrowLeft size={15} /> Volver a la gestión de cursos
        </Button>

        <AdminNav currentPath="/admin/courses" navigate={navigate} />

        {data && (
          <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-start">
            <div>
              <div className="mb-1 flex flex-wrap items-center gap-2">
                <h1 className="text-2xl font-bold text-white">
                  {data.course.title}
                </h1>
                <ContentStatusBadge status={data.course.status} />
              </div>
              <p className="text-sm text-muted-foreground">
                Organiza los módulos. Los módulos publicados solo serán
                visibles cuando el curso también esté publicado.
              </p>
            </div>

            <div className="flex flex-wrap gap-2">
              <Button
                type="button"
                variant="secondary"
                onClick={() =>
                  navigate(`/admin/courses/${courseId}/edit`)
                }
              >
                <Edit2 size={15} /> Editar curso
              </Button>
              <Button
                type="button"
                variant="primary"
                disabled={courseIsArchived}
                onClick={() =>
                  navigate(`/admin/courses/${courseId}/modules/new`)
                }
              >
                <Plus size={16} /> Agregar módulo
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
            Este curso está archivado. Los módulos se conservan, pero no se
            pueden modificar mientras el curso permanezca en ese estado.
          </Alert>
        )}

        {error && (
          <StatePanel
            variant="error"
            title="No se pudieron cargar los módulos"
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
            title="Cargando módulos"
            description="Estamos consultando la estructura del curso."
          />
        )}

        {!error && data && data.modules.length === 0 && (
          <StatePanel
            variant="empty"
            title="Este curso todavía no tiene módulos"
            description={
              courseIsArchived
                ? "El curso está archivado y no admite nuevos módulos."
                : "Agrega el primer módulo para empezar a construir el contenido."
            }
            action={
              !courseIsArchived ? (
                <Button
                  type="button"
                  variant="primary"
                  onClick={() =>
                    navigate(`/admin/courses/${courseId}/modules/new`)
                  }
                >
                  <Plus size={16} /> Agregar módulo
                </Button>
              ) : undefined
            }
          />
        )}

        {!error && data && data.modules.length > 0 && (
          <ol className="space-y-3">
            {data.modules.map((module, index) => {
              const isPending = pendingId === module.id;
              const isFirst = index === 0;
              const isLast = index === data.modules.length - 1;

              return (
                <li key={module.id}>
                  <Card className="p-4">
                    <div className="flex flex-col gap-4 sm:flex-row sm:items-center">
                      <div className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-xl bg-accent/15 text-sm font-bold text-accent">
                        {module.order}
                      </div>

                      <div className="min-w-0 flex-1">
                        <div className="flex flex-wrap items-center gap-2">
                          <h2 className="text-sm font-semibold text-white">
                            {module.title}
                          </h2>
                          <ContentStatusBadge status={module.status} />
                        </div>
                        <p className="mt-1 text-sm text-muted-foreground">
                          {module.description ?? "Sin descripción."}
                        </p>
                      </div>

                      <div className="flex flex-wrap items-center gap-1.5 sm:justify-end">
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          disabled={
                            courseIsArchived ||
                            isPending ||
                            isFirst
                          }
                          onClick={() => {
                            void move(module, "up");
                          }}
                          aria-label={`Mover «${module.title}» hacia arriba`}
                        >
                          <ArrowUp size={14} />
                        </Button>
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          disabled={
                            courseIsArchived || isPending || isLast
                          }
                          onClick={() => {
                            void move(module, "down");
                          }}
                          aria-label={`Mover «${module.title}» hacia abajo`}
                        >
                          <ArrowDown size={14} />
                        </Button>

                        <Button
                          type="button"
                          variant="secondary"
                          size="sm"
                          disabled={courseIsArchived}
                          onClick={() =>
                            navigate(
                              `/admin/courses/${courseId}/modules/${module.id}/edit`,
                            )
                          }
                        >
                          <Edit2 size={14} /> Editar
                        </Button>

                        {module.status === "DRAFT" && (
                          <Button
                            type="button"
                            variant="primary"
                            size="sm"
                            disabled={courseIsArchived || isPending}
                            onClick={() => {
                              void changeStatus(module, "ACTIVE");
                            }}
                          >
                            <Send size={14} /> Publicar
                          </Button>
                        )}

                        {module.status !== "ARCHIVED" && (
                          <Button
                            type="button"
                            variant="danger"
                            size="sm"
                            disabled={courseIsArchived || isPending}
                            onClick={() => setModuleToArchive(module)}
                          >
                            <Archive size={14} /> Archivar
                          </Button>
                        )}
                      </div>
                    </div>
                  </Card>
                </li>
              );
            })}
          </ol>
        )}

        {data && data.modules.length > 0 && (
          <p className="flex items-center gap-2 text-xs text-muted-foreground">
            <FileText size={13} aria-hidden="true" />
            El orden se refleja en el detalle del curso para los
            estudiantes.
          </p>
        )}
      </div>

      <ConfirmDialog
        open={moduleToArchive !== null}
        title="Archivar módulo"
        description={
          moduleToArchive
            ? `El módulo «${moduleToArchive.title}» dejará de estar visible para los estudiantes. Su contenido y su historial se conservarán.`
            : ""
        }
        confirmLabel="Archivar módulo"
        isConfirming={
          moduleToArchive !== null && pendingId === moduleToArchive.id
        }
        onCancel={() => setModuleToArchive(null)}
        onConfirm={() => {
          if (moduleToArchive) {
            void changeStatus(moduleToArchive, "ARCHIVED");
          }
        }}
      />
    </AuthenticatedLayout>
  );
}
