import { useEffect, useState } from "react";
import { ArrowRight, Edit2, Eye, Plus, Send } from "lucide-react";
import { AuthenticatedLayout } from "../../components/layout/AuthenticatedLayout";
import { Alert } from "../../components/ui/Alert";
import { Badge } from "../../components/ui/Badge";
import { Button } from "../../components/ui/Button";
import { Card } from "../../components/ui/Card";
import { StatePanel } from "../../components/ui/StatePanel";
import { ApiError } from "../../lib/api";
import {
  changeCourseAssessmentStatusRequest,
  getAdminCourseAssessmentRequest,
} from "../../services/assessments";
import type { ContentStatus } from "../../types/course";
import type { AdminQuestion } from "../../types/assessment";
import type { NavigateFn } from "../../types/navigation";

export interface AdminAssessmentPageProps {
  courseId: number;
  navigate: NavigateFn;
}

function statusLabel(status: string): string {
  switch (status) {
    case "DRAFT":
      return "Borrador";
    case "ACTIVE":
      return "Publicado";
    case "ARCHIVED":
      return "Archivado";
    default:
      return status;
  }
}

function assessmentBadgeColor(
  status: ContentStatus,
): "green" | "yellow" | "gray" | "blue" {
  switch (status) {
    case "DRAFT":
      return "yellow";
    case "ACTIVE":
      return "green";
    case "ARCHIVED":
      return "gray";
    default:
      return "blue";
  }
}

type AssessmentRow = {
  id: number;
  title: string;
  description: string | null;
  status: ContentStatus;
  questionCount: number;
  complete: boolean;
  attemptCount: number;
  questions: AdminQuestion[];
};

export function AdminAssessmentPage({
  courseId,
  navigate,
}: AdminAssessmentPageProps) {
  const [assessment, setAssessment] = useState<AssessmentRow | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [notice, setNotice] = useState<{
    variant: "success" | "error";
    message: string;
  } | null>(null);
  const [saving, setSaving] = useState(false);
  const [previewOpen, setPreviewOpen] = useState(false);

  useEffect(() => {
    let active = true;

    setLoading(true);

    void getAdminCourseAssessmentRequest(courseId)
      .then((response) => {
        if (active) {
          setAssessment(response.assessment ?? null);
          setLoading(false);
        }
      })
      .catch((requestError: unknown) => {
        if (!active) {
          return;
        }

        setError(
          requestError instanceof ApiError
            ? requestError.message
            : "No se pudo cargar la evaluación del curso.",
        );
        setLoading(false);
      });

    return () => {
      active = false;
    };
  }, [courseId]);

  const changeStatus = async (status: "ACTIVE" | "ARCHIVED"): Promise<void> => {
    if (!assessment) {
      return;
    }

    setSaving(true);
    setNotice(null);

    try {
      const updated = await changeCourseAssessmentStatusRequest(
        courseId,
        status,
      );
      setAssessment(updated.assessment ?? null);
      setNotice({
        variant: "success",
        message:
          status === "ACTIVE"
            ? "La evaluación final se publicó correctamente."
            : "La evaluación final se archivó correctamente.",
      });
    } catch (requestError) {
      setNotice({
        variant: "error",
        message:
          requestError instanceof ApiError
            ? requestError.message
            : "No se pudo cambiar el estado de la evaluación.",
      });
    } finally {
      setSaving(false);
    }
  };

  const questions: AdminQuestion[] = assessment?.questions ?? [];

  return (
    <AuthenticatedLayout
      title="Evaluación final del curso"
      currentPath="/admin/courses"
      navigate={navigate}
    >
      <div className="mx-auto max-w-5xl space-y-5">
        <Button
          type="button"
          variant="ghost"
          onClick={() => navigate("/admin/courses")}
        >
          <ArrowRight size={15} /> Volver a la administración de cursos
        </Button>

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

        {loading && (
          <StatePanel
            variant="loading"
            title="Cargando evaluación"
            description="Estamos consultando la evaluación final del curso."
          />
        )}

        {!loading && error && (
          <StatePanel
            variant="error"
            title="No se pudo cargar la evaluación"
            description={error}
            action={
              <Button
                type="button"
                variant="secondary"
                onClick={() => {
                  window.location.reload();
                }}
              >
                Reintentar
              </Button>
            }
          />
        )}

        {!loading && !error && (
          <Card className="p-6">
            <div className="flex flex-col gap-4 sm:flex-row sm:items-end">
              <div>
                <h1 className="text-2xl font-bold text-white">
                  Evaluación final del curso
                </h1>
                <p className="mt-1 text-sm text-muted-foreground">
                  Gestiona el examen de cierre del curso.
                </p>
              </div>

              {!assessment && (
                <Button
                  type="button"
                  variant="primary"
                  disabled={saving}
                  onClick={() =>
                    navigate(`/admin/courses/${courseId}/assessment/edit`)
                  }
                >
                  <Plus size={15} /> Crear evaluación final
                </Button>
              )}

              {assessment && (
                <div className="flex flex-wrap gap-2">
                  <Button
                    type="button"
                    variant="secondary"
                    size="sm"
                    onClick={() =>
                      navigate(
                        `/admin/courses/${courseId}/assessment/edit`,
                      )
                    }
                  >
                    <Edit2 size={14} /> Editar preguntas
                  </Button>

                  {assessment.status === "DRAFT" && (
                    <Button
                      type="button"
                      variant="primary"
                      size="sm"
                      disabled={saving || !assessment.complete}
                      onClick={() => void changeStatus("ACTIVE")}
                    >
                      <Send size={14} /> Publicar
                    </Button>
                  )}

                  {assessment.status === "ACTIVE" && (
                    <Button
                      type="button"
                      variant="danger"
                      size="sm"
                      disabled={saving}
                      onClick={() => void changeStatus("ARCHIVED")}
                    >
                      Archivar
                    </Button>
                  )}

                  <Button
                    type="button"
                    variant="secondary"
                    size="sm"
                    onClick={() => setPreviewOpen(true)}
                  >
                    <Eye size={14} /> Vista previa
                  </Button>
                </div>
              )}
            </div>

            {!assessment && (
              <div className="mt-6 rounded-xl border border-border bg-white/5 p-6">
                <h3 className="text-sm font-semibold text-white">
                  Este curso aún no tiene evaluación final
                </h3>
                <p className="mt-1 text-sm text-muted-foreground">
                  Crea la evaluación final para que los estudiantes puedan
                  presentar el examen de cierre una vez completen todas las
                  lecciones del curso.
                </p>
                <div className="mt-4">
                  <Button
                    type="button"
                    variant="primary"
                    disabled={saving}
                    onClick={() =>
                      navigate(`/admin/courses/${courseId}/assessment/edit`)
                    }
                  >
                    <Plus size={15} /> Crear evaluación final
                  </Button>
                </div>
              </div>
            )}

            {assessment && (
              <>
                <div className="mt-6 grid gap-3 sm:grid-cols-3">
                  <Card className="p-4">
                    <p className="text-xs text-muted-foreground">Estado</p>
                    <p className="text-sm font-semibold text-white">
                      {statusLabel(assessment.status)}
                    </p>
                  </Card>
                  <Card className="p-4">
                    <p className="text-xs text-muted-foreground">Preguntas</p>
                    <p className="text-sm font-semibold text-white">
                      {assessment.questionCount} de 8
                    </p>
                  </Card>
                  <Card className="p-4">
                    <p className="text-xs text-muted-foreground">Intentos</p>
                    <p className="text-sm font-semibold text-white">
                      {assessment.attemptCount}
                    </p>
                  </Card>
                </div>

                <div className="mt-6">
                  <h2 className="text-sm font-semibold text-white mb-3">
                    Preguntas de la evaluación
                  </h2>
                  {questions.length === 0 ? (
                    <p className="text-sm text-muted-foreground">
                      La evaluación aún no tiene preguntas. Edítala para
                      agregar las 8 preguntas requeridas.
                    </p>
                  ) : (
                    <ul className="divide-y divide-border/70 rounded-xl border border-border/50 bg-white/5 p-4">
                      {questions.map((question) => (
                        <li key={question.id} className="p-3">
                          <div className="flex flex-wrap items-center gap-2 mb-2">
                            <span
                              className={`
                                text-xs font-bold rounded border px-2 py-0.5
                                ${question.type === "MULTIPLE_CHOICE"
                                  ? "bg-blue/15 text-blue border-blue/20"
                                  : "bg-purple/15 text-purple border-purple/20"}
                              `}
                            >
                              {question.type === "MULTIPLE_CHOICE"
                                ? "Selección múltiple"
                                : "Verdadero / Falso"}
                            </span>
                            <Badge color={assessmentBadgeColor(question.status)}>
                              {statusLabel(question.status)}
                            </Badge>
                          </div>
                          <p className="text-sm text-foreground">
                            {question.order}. {question.statement}
                          </p>
                          <p className="mt-1 text-xs text-muted-foreground">
                            {question.explanation ?? "Sin explicación."}
                          </p>
                          <div className="mt-2 flex flex-wrap gap-2 text-xs">
                            {question.options.map((option) => (
                              <span
                                key={option.id}
                                className={`inline-flex items-center gap-1 rounded border px-2 py-0.5 ${
                                  option.isCorrect
                                    ? "bg-green/20 text-green border-green/40"
                                    : "bg-white/10 text-muted-foreground border-white/10"
                                }`}
                              >
                                {option.isCorrect ? (
                                  <span
                                    className="text-[10px] font-bold"
                                    aria-hidden="true"
                                  >
                                    ✓
                                  </span>
                                ) : null}
                                {option.text}
                              </span>
                            ))}
                          </div>
                        </li>
                      ))}
                    </ul>
                  )}
                </div>
              </>
            )}
          </Card>
        )}

        {previewOpen && assessment && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 px-4">
            <Card className="w-full max-w-2xl max-h-[90vh] overflow-y-auto rounded-2xl border border-border bg-card p-6 shadow-2xl">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-lg font-bold text-white">
                  Vista previa de la evaluación
                </h2>
                <Button
                  type="button"
                  variant="ghost"
                  onClick={() => setPreviewOpen(false)}
                >
                  Cerrar
                </Button>
              </div>
              <p className="text-sm text-muted-foreground mb-6">
                Esta vista muestra las preguntas tal como las vería un
                estudiante, sin revelar las respuestas correctas.
              </p>
              <ol className="space-y-4">
                {questions.map((question, index) => (
                  <li key={question.id} className="space-y-2">
                    <p className="text-sm font-medium text-white">
                      {index + 1}. {question.statement}
                    </p>
                    <div className="space-y-1.5">
                      {question.options.map((option) => (
                        <label
                          key={option.id}
                          className="flex items-center gap-2 text-sm text-foreground cursor-default select-none"
                        >
                          <input
                            type="radio"
                            disabled
                            readOnly
                            className="rounded border-white/20 bg-white/5"
                            aria-hidden="true"
                          />
                          {option.text}
                        </label>
                      ))}
                    </div>
                  </li>
                ))}
              </ol>
            </Card>
          </div>
        )}
      </div>
    </AuthenticatedLayout>
  );
}

