import { useEffect, useState } from "react";
import { ArrowLeft, Edit2, Eye } from "lucide-react";
import { AuthenticatedLayout } from "../../components/layout/AuthenticatedLayout";
import { AdminNav } from "../../components/layout/AdminNav";
import { ContentStatusBadge } from "../../components/courses/ContentStatusBadge";
import { LessonTypeBadge } from "../../components/lessons/LessonTypeBadge";
import { TheoryRenderer } from "../../components/lessons/TheoryRenderer";
import { LaboratoryRenderer } from "../../components/lessons/lab/LaboratoryRenderer";
import { Alert } from "../../components/ui/Alert";
import { Button } from "../../components/ui/Button";
import { Card } from "../../components/ui/Card";
import { StatePanel } from "../../components/ui/StatePanel";
import { ApiError } from "../../lib/api";
import { isLabContent, isTheoryContent } from "../../lib/lab";
import {
  getAdminLessonRequest,
  validateStoredLessonContentRequest,
} from "../../services/lessons";
import type {
  AdminLessonDetailResponse,
  LessonContentIssue,
} from "../../types/lesson";
import type { NavigateFn } from "../../types/navigation";

export interface LessonPreviewPageProps {
  courseId: number;
  moduleId: number;
  lessonId: number;
  navigate: NavigateFn;
}

export function LessonPreviewPage({
  courseId,
  moduleId,
  lessonId,
  navigate,
}: LessonPreviewPageProps) {
  const [data, setData] = useState<AdminLessonDetailResponse | null>(null);
  const [issues, setIssues] = useState<LessonContentIssue[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [reloadKey, setReloadKey] = useState(0);

  useEffect(() => {
    let active = true;

    setError(null);
    setIssues([]);

    void Promise.all([
      getAdminLessonRequest(courseId, moduleId, lessonId),
      validateStoredLessonContentRequest(courseId, moduleId, lessonId),
    ])
      .then(([loaded, validation]) => {
        if (!active) {
          return;
        }

        setData(loaded);
        setIssues(validation.issues);
      })
      .catch((requestError: unknown) => {
        if (!active) {
          return;
        }

        setData(null);
        setError(
          requestError instanceof ApiError
            ? requestError.message
            : "No se pudo cargar la vista previa.",
        );
      });

    return () => {
      active = false;
    };
  }, [courseId, moduleId, lessonId, reloadKey]);

  return (
    <AuthenticatedLayout
      title="Vista previa de la lección"
      currentPath="/admin/courses"
      navigate={navigate}
    >
      <div className="mx-auto max-w-5xl space-y-5">
        <Button
          type="button"
          variant="ghost"
          onClick={() =>
            navigate(`/admin/courses/${courseId}/modules/${moduleId}/lessons`)
          }
        >
          <ArrowLeft size={15} /> Volver a las lecciones
        </Button>

        <AdminNav currentPath="/admin/courses" navigate={navigate} />

        {error && (
          <StatePanel
            variant="error"
            title="No se pudo cargar la vista previa"
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
            title="Preparando la vista previa"
            description="Estamos validando el contenido de la lección."
          />
        )}

        {data && (
          <>
            <Card className="p-5">
              <div className="flex flex-col justify-between gap-3 sm:flex-row sm:items-start">
                <div>
                  <p className="mb-1 text-xs font-medium text-accent">
                    {data.course.title} · {data.module.title}
                  </p>
                  <div className="flex flex-wrap items-center gap-2">
                    <h1 className="text-2xl font-bold text-white">
                      {data.lesson.title}
                    </h1>
                    <LessonTypeBadge type={data.lesson.type} />
                    <ContentStatusBadge status={data.lesson.status} />
                  </div>
                  <p className="mt-2 flex items-center gap-1.5 text-xs text-muted-foreground">
                    <Eye size={13} aria-hidden="true" />
                    Vista previa administrativa. No se registra progreso.
                  </p>
                </div>
                <Button
                  type="button"
                  variant="secondary"
                  onClick={() =>
                    navigate(
                      `/admin/courses/${courseId}/modules/${moduleId}/lessons/${lessonId}/edit`,
                    )
                  }
                >
                  <Edit2 size={15} /> Editar contenido
                </Button>
              </div>
            </Card>

            {issues.length > 0 && (
              <Alert variant="error">
                <div>
                  <p className="mb-1 font-semibold">
                    El contenido guardado tiene errores.
                  </p>
                  <ul className="list-disc space-y-1 pl-4 text-xs">
                    {issues.map((issue, index) => (
                      <li key={`${issue.path}-${issue.code}-${index}`}>
                        <code>{issue.path}</code> {issue.message}
                      </li>
                    ))}
                  </ul>
                </div>
              </Alert>
            )}

            {data.lesson.type === "THEORY" ? (
              isTheoryContent(data.lesson.content) ? (
                <Card className="p-5">
                  <TheoryRenderer content={data.lesson.content} />
                </Card>
              ) : (
                <Alert variant="error">
                  El contenido no corresponde a una lección teórica válida.
                </Alert>
              )
            ) : isLabContent(data.lesson.content) ? (
              <LaboratoryRenderer
                content={data.lesson.content}
                mode="preview"
                courseId={courseId}
                moduleId={moduleId}
                lessonId={lessonId}
                completed={false}
              />
            ) : (
              <Alert variant="error">
                El contenido no corresponde a un laboratorio válido.
              </Alert>
            )}
          </>
        )}
      </div>
    </AuthenticatedLayout>
  );
}
