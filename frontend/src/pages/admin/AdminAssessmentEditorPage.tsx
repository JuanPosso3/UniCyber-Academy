import { useEffect, useState } from "react";
import { ArrowLeft, Save } from "lucide-react";
import { AuthenticatedLayout } from "../../components/layout/AuthenticatedLayout";
import { Alert } from "../../components/ui/Alert";
import { Badge } from "../../components/ui/Badge";
import { Button } from "../../components/ui/Button";
import { Card } from "../../components/ui/Card";
import { Input } from "../../components/ui/Input";
import { StatePanel } from "../../components/ui/StatePanel";
import { Textarea } from "../../components/ui/Textarea";
import { ApiError } from "../../lib/api";
import {
  getAdminCourseAssessmentRequest,
  replaceCourseAssessmentQuestionsRequest,
  updateCourseAssessmentRequest,
} from "../../services/assessments";
import type { AdminQuestion } from "../../types/assessment";
import type { NavigateFn } from "../../types/navigation";

export interface AdminAssessmentEditorPageProps {
  courseId: number;
  navigate: NavigateFn;
}

type QuestionDraft = {
  statement: string;
  type: "MULTIPLE_CHOICE" | "TRUE_FALSE";
  explanation: string;
  hint: string;
  options: Array<{ text: string; isCorrect: boolean }>;
};

const EMPTY_QUESTION: QuestionDraft = {
  statement: "",
  type: "MULTIPLE_CHOICE",
  explanation: "",
  hint: "",
  options: [
    { text: "", isCorrect: false },
    { text: "", isCorrect: false },
    { text: "", isCorrect: false },
    { text: "", isCorrect: false },
  ],
};

function toDrafts(questions: AdminQuestion[]): QuestionDraft[] {
  return questions.map((question) => ({
    statement: question.statement,
    type: question.type,
    explanation: question.explanation ?? "",
    hint: question.hint ?? "",
    options: question.options.map((option) => ({
      text: option.text,
      isCorrect: option.isCorrect,
    })),
  }));
}

function ensureEight(drafts: QuestionDraft[]): QuestionDraft[] {
  const next = [...drafts];

  while (next.length < 8) {
    next.push({ ...EMPTY_QUESTION });
  }

  return next.slice(0, 8);
}

function normalizeOptions(
  type: "MULTIPLE_CHOICE" | "TRUE_FALSE",
  options: Array<{ text: string; isCorrect: boolean }>,
): Array<{ text: string; isCorrect: boolean }> {
  if (type === "TRUE_FALSE") {
    return [
      { text: "Verdadero", isCorrect: options[0]?.isCorrect ?? false },
      { text: "Falso", isCorrect: options[1]?.isCorrect ?? false },
    ];
  }

  const normalized = options.slice(0, 4);

  while (normalized.length < 4) {
    normalized.push({ text: "", isCorrect: false });
  }

  return normalized;
}

export function AdminAssessmentEditorPage({
  courseId,
  navigate,
}: AdminAssessmentEditorPageProps) {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<{
    variant: "success" | "error";
    message: string;
  } | null>(null);
  const [saving, setSaving] = useState(false);
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [drafts, setDrafts] = useState<QuestionDraft[]>([
    { ...EMPTY_QUESTION },
  ]);

  useEffect(() => {
    let active = true;

    setLoading(true);

    void getAdminCourseAssessmentRequest(courseId)
      .then((response) => {
        if (!active) {
          return;
        }

        const assessment = response.assessment;

        if (assessment) {
          setTitle(assessment.title);
          setDescription(assessment.description ?? "");
          setDrafts(ensureEight(toDrafts(assessment.questions)));
        } else {
          setTitle("Evaluación final del curso");
          setDescription("");
          setDrafts([{ ...EMPTY_QUESTION }]);
        }

        setLoading(false);
      })
      .catch((requestError: unknown) => {
        if (!active) {
          return;
        }

        setError(
          requestError instanceof ApiError
            ? requestError.message
            : "No se pudo cargar la evaluación.",
        );
        setLoading(false);
      });

    return () => {
      active = false;
    };
  }, [courseId]);

  const setStatement = (index: number, value: string): void => {
    setDrafts((current) => {
      const next = current.map((draft, draftIndex) => {
        if (draftIndex !== index) {
          return draft;
        }

        return { ...draft, statement: value };
      });

      return ensureEight(next);
    });
  };

  const setType = (
    index: number,
    type: "MULTIPLE_CHOICE" | "TRUE_FALSE",
  ): void => {
    setDrafts((current) => {
      const next = current.map((draft, draftIndex) => {
        if (draftIndex !== index) {
          return draft;
        }

        return {
          ...draft,
          type,
          options: normalizeOptions(type, draft.options),
        };
      });

      return ensureEight(next);
    });
  };

  const setExplanation = (index: number, value: string): void => {
    setDrafts((current) => {
      const next = current.map((draft, draftIndex) => {
        if (draftIndex !== index) {
          return draft;
        }

        return { ...draft, explanation: value };
      });

      return ensureEight(next);
    });
  };

  const setHint = (index: number, value: string): void => {
    setDrafts((current) => {
      const next = current.map((draft, draftIndex) => {
        if (draftIndex !== index) {
          return draft;
        }

        return { ...draft, hint: value };
      });

      return ensureEight(next);
    });
  };

  const setOptionText = (
    questionIndex: number,
    optionIndex: number,
    value: string,
  ): void => {
    setDrafts((current) => {
      const next = current.map((draft, draftIndex) => {
        if (draftIndex !== questionIndex) {
          return draft;
        }

        return {
          ...draft,
          options: draft.options.map((option, optIndex) =>
            optIndex === optionIndex ? { ...option, text: value } : option,
          ),
        };
      });

      return ensureEight(next);
    });
  };

  const setCorrectOption = (questionIndex: number, optionIndex: number): void => {
    setDrafts((current) => {
      const next = current.map((draft, draftIndex) => {
        if (draftIndex !== questionIndex) {
          return draft;
        }

        return {
          ...draft,
          options: draft.options.map((option, optIndex) => ({
            ...option,
            isCorrect: optIndex === optionIndex,
          })),
        };
      });

      return ensureEight(next);
    });
  };

  const validationErrors = (): Record<string, string> => {
    const errors: Record<string, string> = {};

    if (!title.trim()) {
      errors.title = "El título de la evaluación es obligatorio.";
    }

    if (drafts.length !== 8) {
      errors._form =
        "La evaluación debe tener exactamente 8 preguntas.";

      return errors;
    }

    drafts.forEach((draft, index) => {
      const prefix = `pregunta.${index + 1}`;

      if (!draft.statement.trim()) {
        errors[`${prefix}.statement`] = "El enunciado es obligatorio.";
      }

      if (!draft.explanation.trim()) {
        errors[`${prefix}.explanation`] = "La explicación es obligatoria.";
      }

      const correctCount = draft.options.filter(
        (option) => option.isCorrect,
      ).length;

      if (correctCount !== 1) {
        errors[`${prefix}.options`] =
          "Cada pregunta debe tener exactamente una opción correcta.";
      }

      draft.options.forEach((option, optionIndex) => {
        if (!option.text.trim()) {
          errors[`${prefix}.opciones.${optionIndex + 1}`] =
            "El texto de la opción es obligatorio.";
        }
      });
    });

    return errors;
  };

  const save = async (): Promise<void> => {
    const errors = validationErrors();

    if (Object.keys(errors).length > 0) {
      setNotice({
        variant: "error",
        message: errors._form ?? "Revisa los datos del formulario.",
      });

      return;
    }

    setSaving(true);
    setNotice(null);

    try {
      const payload = {
        title: title.trim(),
        description: description.trim() || null,
        questions: drafts.map((draft) => ({
          statement: draft.statement.trim(),
          type: draft.type,
          explanation: draft.explanation.trim(),
          hint: draft.hint.trim() || null,
          options: normalizeOptions(draft.type, draft.options).map(
            (option) => ({
              text: option.text.trim(),
              isCorrect: option.isCorrect,
            }),
          ),
        })),
      };

      await replaceCourseAssessmentQuestionsRequest(courseId, payload.questions);
      await updateCourseAssessmentRequest(courseId, {
        title: payload.title,
        description: payload.description,
      });

      setNotice({
        variant: "success",
        message: "Los cambios se guardaron correctamente.",
      });
    } catch (requestError) {
      setNotice({
        variant: "error",
        message:
          requestError instanceof ApiError
            ? requestError.message
            : "No se pudo guardar la evaluación.",
      });
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <AuthenticatedLayout
        title="Editar evaluación final"
        currentPath="/admin/courses"
        navigate={navigate}
      >
        <StatePanel variant="loading" title="Cargando editor" />
      </AuthenticatedLayout>
    );
  }

  if (error) {
    return (
      <AuthenticatedLayout
        title="Editar evaluación final"
        currentPath="/admin/courses"
        navigate={navigate}
      >
        <StatePanel variant="error" title="Error" description={error} />
      </AuthenticatedLayout>
    );
  }

  return (
    <AuthenticatedLayout
      title="Editar evaluación final"
      currentPath="/admin/courses"
      navigate={navigate}
    >
      <div className="mx-auto max-w-4xl space-y-5">
        <Button
          type="button"
          variant="ghost"
          onClick={() => navigate(`/admin/courses/${courseId}/assessment`)}
        >
          <ArrowLeft size={15} /> Volver a la evaluación
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

        <Card className="p-6">
          <div className="space-y-4">
            <h1 className="text-2xl font-bold text-white">Editar evaluación final</h1>
            <p className="text-sm text-muted-foreground">
              Configura las 8 preguntas del examen final del curso.
            </p>

            <div className="grid gap-3">
              <div className="flex flex-col gap-1">
                <label className="text-sm font-medium text-foreground">Título</label>
                <Input
                  value={title}
                  onChange={(event) => setTitle(event.target.value)}
                  placeholder="Evaluación final del curso"
                />
              </div>
              <div className="flex flex-col gap-1">
                <label className="text-sm font-medium text-foreground">Descripción</label>
                <Textarea
                  value={description}
                  onChange={(event) => setDescription(event.target.value)}
                  placeholder="Descripción opcional de la evaluación."
                />
              </div>
            </div>

            <div className="mt-6 border-t border-border pt-4">
              <h2 className="text-sm font-semibold text-white mb-4">
                Preguntas ({drafts.length} de 8)
              </h2>

              {drafts.map((draft, index) => (
                <Card
                  key={index}
                  className="p-4 mb-3 border border-border/60"
                >
                  <div className="flex items-center gap-2 mb-3">
                    <span className="flex h-6 w-6 flex-shrink-0 items-center justify-center rounded-full bg-primary text-[10px] font-bold text-white">
                      {index + 1}
                    </span>
                    <Badge
                      color={
                        draft.type === "MULTIPLE_CHOICE" ? "blue" : "purple"
                      }
                    >
                      {draft.type === "MULTIPLE_CHOICE"
                        ? "Selección múltiple"
                        : "Verdadero / Falso"}
                    </Badge>
                    <Button
                      type="button"
                      variant="secondary"
                      size="sm"
                      onClick={() => setType(index, draft.type === "MULTIPLE_CHOICE" ? "TRUE_FALSE" : "MULTIPLE_CHOICE")}
                    >
                      Cambiar tipo
                    </Button>
                  </div>

                  <div className="grid gap-3 md:grid-cols-2">
                    <div className="flex flex-col gap-1">
                      <label className="text-xs font-medium text-muted-foreground">Enunciado</label>
                      <Input
                        value={draft.statement}
                        onChange={(event) => setStatement(index, event.target.value)}
                        placeholder="Escribe el enunciado de la pregunta..."
                      />
                    </div>
                    <div className="flex flex-col gap-1">
                      <label className="text-xs font-medium text-muted-foreground">Explicación</label>
                      <Input
                        value={draft.explanation}
                        onChange={(event) => setExplanation(index, event.target.value)}
                        placeholder="Justifica la respuesta correcta..."
                      />
                    </div>
                    <div className="flex flex-col gap-1">
                      <label className="text-xs font-medium text-muted-foreground">Orientación (errores)</label>
                      <Input
                        value={draft.hint}
                        onChange={(event) => setHint(index, event.target.value)}
                        placeholder="Pista para respuestas incorrectas..."
                      />
                    </div>
                  </div>

                  <div className="mt-4 flex flex-col gap-2">
                    <label className="text-xs font-medium text-muted-foreground">Opciones de respuesta</label>
                    {draft.options.map((option, optionIndex) => (
                      <div
                        key={optionIndex}
                        className="flex items-center gap-2"
                      >
                        <input
                          type="radio"
                          checked={option.isCorrect}
                          onChange={() => setCorrectOption(index, optionIndex)}
                          className="rounded border-white/20 bg-white/5 text-primary"
                          aria-label={`Marcar opción ${optionIndex + 1} como correcta`}
                        />
                        <Input
                          value={option.text}
                          onChange={(event) =>
                            setOptionText(index, optionIndex, event.target.value)
                          }
                          placeholder={`Opción ${optionIndex + 1}`}
                          className="flex-1"
                        />
                      </div>
                    ))}
                  </div>
                </Card>
              ))}
            </div>

            <div className="mt-6 flex items-center justify-between">
              <Button type="button" variant="secondary" onClick={() => navigate(`/admin/courses/${courseId}/assessment`)}>
                Cancelar
              </Button>
              <Button type="button" variant="primary" disabled={saving} onClick={save}>
                <Save size={14} /> Guardar cambios
              </Button>
            </div>
          </div>
        </Card>
      </div>
    </AuthenticatedLayout>
  );
}

