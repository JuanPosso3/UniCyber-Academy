import { useEffect, useMemo, useState } from "react";
import {
  ArrowLeft,
  ChevronLeft,
  ChevronRight,
} from "lucide-react";
import { AuthenticatedLayout } from "../../components/layout/AuthenticatedLayout";
import { Alert } from "../../components/ui/Alert";
import { Badge } from "../../components/ui/Badge";
import { Button } from "../../components/ui/Button";
import { Card } from "../../components/ui/Card";
import { StatePanel } from "../../components/ui/StatePanel";
import { useAchievementToast } from "../../context/AchievementToastContext";
import {
  getStudentAssessmentRequest,
  submitAssessmentRequest,
} from "../../services/assessments";
import type {
  AssessmentEligibility,
  StudentAssessmentResponse,
  SubmittedAnswer,
} from "../../types/assessment";
import type { NavigateFn } from "../../types/navigation";

export interface AssessmentPageProps {
  courseId: number;
  navigate: NavigateFn;
}

export function AssessmentPage({
  courseId,
  navigate,
}: AssessmentPageProps) {
  const [course, setCourse] = useState<{ id: number; title: string } | null>(
    null,
  );
  const [assessment, setAssessment] = useState<{
    id: number;
    title: string;
    description: string | null;
    questions: Array<{
      id: number;
      order: number;
      statement: string;
      type: string;
      options: Array<{ id: number; order: number; text: string }>;
    }>;
  } | null>(null);
  const [eligibility, setEligibility] = useState<AssessmentEligibility | null>(
    null,
  );
  const [attempt, setAttempt] = useState<{
    score: number;
    correctAnswers: number;
    incorrectAnswers: number;
    passed: boolean;
    completedAt: string;
  } | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [current, setCurrent] = useState(0);
  const [answers, setAnswers] = useState<Map<number, number>>(new Map());
  const [submitting, setSubmitting] = useState(false);
  const [confirmSubmit, setConfirmSubmit] = useState(false);
  const [notice, setNotice] = useState<{
    variant: "success" | "error";
    message: string;
  } | null>(null);
  const { addToast } = useAchievementToast();

  useEffect(() => {
    let active = true;

    setLoading(true);

    void getStudentAssessmentRequest(courseId)
      .then((response: StudentAssessmentResponse) => {
        if (!active) {
          return;
        }

        setCourse({ id: response.course.id, title: response.course.title });
        setAssessment(response.assessment ?? null);
        setEligibility(response.eligibility);
        setAttempt(response.attempt ?? null);
        setLoading(false);
      })
      .catch((requestError: unknown) => {
        if (!active) {
          return;
        }

        setError(
          requestError instanceof Error
            ? requestError.message
            : "No se pudo cargar el examen.",
        );
        setLoading(false);
      });

    return () => {
      active = false;
    };
  }, [courseId]);

  const questions = useMemo(
    () => assessment?.questions ?? [],
    [assessment],
  );

  const currentQuestion = questions[current];

  const isAnswered = useMemo(
    () =>
      questions.map(
        (question) => answers.has(question.id),
      ),
    [questions, answers],
  );

  const answeredCount = isAnswered.filter(Boolean).length;

  const handleOptionSelect = (answerOptionId: number): void => {
    if (!currentQuestion) {
      return;
    }

    setAnswers((previous) => {
      const next = new Map(previous);
      next.set(currentQuestion.id, answerOptionId);

      return next;
    });
  };

  const goTo = (index: number): void => {
    if (index >= 0 && index < questions.length) {
      setCurrent(index);
    }
  };

  const handlePrevious = (): void => {
    goTo(current - 1);
  };

  const handleNext = (): void => {
    goTo(current + 1);
  };

  const buildAnswers = (): SubmittedAnswer[] => {
    return questions.map((question) => {
      const answerOptionId = answers.get(question.id);

      if (answerOptionId === undefined) {
        throw new Error(`Falta responder la pregunta ${question.order}.`);
      }

      return { questionId: question.id, answerOptionId };
    });
  };

  const handleSubmit = async (): Promise<void> => {
    try {
      buildAnswers();
    } catch {
      setNotice({
        variant: "error",
        message: "Responde todas las preguntas antes de entregar el examen.",
      });

      return;
    }

    setConfirmSubmit(true);
  };

  const confirmAndSubmit = async (): Promise<void> => {
    setConfirmSubmit(false);
    setSubmitting(true);
    setNotice(null);

    try {
      const response = await submitAssessmentRequest(courseId, buildAnswers());
      const newlyUnlocked = response.newlyUnlocked ?? [];
      for (const achievement of newlyUnlocked) {
        addToast(achievement);
      }
      setNotice({
        variant: "success",
        message: "El examen se entregó correctamente.",
      });
      navigate(`/courses/${courseId}/assessment/results`);
    } catch (requestError: unknown) {
      setNotice({
        variant: "error",
        message:
          requestError instanceof Error
            ? requestError.message
            : "No se pudo entregar el examen. Inténtalo nuevamente.",
      });
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <AuthenticatedLayout
        title="Examen final"
        currentPath="/courses"
        navigate={navigate}
      >
        <StatePanel variant="loading" title="Cargando examen" />
      </AuthenticatedLayout>
    );
  }

  if (error) {
    return (
      <AuthenticatedLayout
        title="Examen final"
        currentPath="/courses"
        navigate={navigate}
      >
        <StatePanel variant="error" title="Error" description={error} />
      </AuthenticatedLayout>
    );
  }

  if (!eligibility || !eligibility.available) {
    return (
      <AuthenticatedLayout
        title="Examen final"
        currentPath="/courses"
        navigate={navigate}
      >
        <div className="mx-auto max-w-2xl space-y-5">
          <Button
            type="button"
            variant="ghost"
            onClick={() => navigate("/courses")}
          >
            <ArrowLeft size={15} /> Volver al catálogo
          </Button>

          <Card className="p-6">
            <h1 className="text-2xl font-bold text-white">Examen final</h1>
            <p className="mt-1 text-sm text-muted-foreground">
              {course?.title ?? "Este curso"}
            </p>

            <StatePanel
              variant="error"
              title="El examen no está disponible todavía"
              description={
                eligibility?.reason ??
                "No se puede presentar el examen final en este momento."
              }
            />

            {(eligibility?.remainingLessons.length ?? 0) > 0 && (
              <div className="mt-4">
                <h2 className="text-sm font-semibold text-white mb-2">
                  Lecciones pendientes por completar
                </h2>
                <ul className="space-y-2 text-sm text-muted-foreground">
                  {eligibility?.remainingLessons.map((lesson) => (
                    <li key={lesson.lessonId}>
                      • {lesson.lessonTitle}{" "}
                      <span className="text-[11px] opacity-70">
                        ({lesson.moduleTitle})
                      </span>
                    </li>
                  ))}
                </ul>
              </div>
            )}

            <p className="mt-4 text-sm text-muted-foreground">
              Completa las lecciones anteriores para habilitar el examen final.
            </p>
          </Card>
        </div>
      </AuthenticatedLayout>
    );
  }

  if (!assessment) {
    return (
      <AuthenticatedLayout
        title="Examen final"
        currentPath="/courses"
        navigate={navigate}
      >
        <StatePanel
          variant="error"
          title="Examen no disponible"
          description="Este curso no tiene una evaluación final publicada."
        />
      </AuthenticatedLayout>
    );
  }

  const passedBadge = attempt?.passed ? (
    <Badge color="green">Aprobado</Badge>
  ) : attempt ? (
    <Badge color="red">No aprobado</Badge>
  ) : null;

  return (
    <AuthenticatedLayout
      title="Examen final"
      currentPath="/courses"
      navigate={navigate}
    >
      <div className="mx-auto max-w-2xl space-y-5">
        <Button
          type="button"
          variant="ghost"
          onClick={() => navigate(`/courses/${courseId}`)}
        >
          <ArrowLeft size={15} /> Volver al curso
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
          <div className="flex items-center justify-between mb-4">
            <div>
              <h1 className="text-2xl font-bold text-white">
                Examen final
              </h1>
              <p className="mt-1 text-sm text-muted-foreground">
                {course?.title ?? ""}
              </p>
            </div>
            {passedBadge}
          </div>

          <div className="mb-4">
            <ProgressBarExam
              current={current + 1}
              total={questions.length}
              answered={answeredCount}
            />
          </div>

          <Card className="overflow-hidden">
            <div className="p-6">
              <p className="text-sm font-medium text-white">
                {currentQuestion.order}. {currentQuestion.statement}
              </p>
              <div className="mt-4 space-y-2">
                {currentQuestion.options.map((option) => {
                  const selected = answers.get(currentQuestion.id) === option.id;

                  return (
                    <label
                      key={option.id}
                      className={`flex items-center gap-3 p-3 rounded-xl border transition-colors cursor-pointer ${
                        selected
                          ? "bg-blue/50 border-blue/50"
                          : "bg-white/5 border-white/10 hover:bg-white/10"
                      }`}
                    >
                      <input
                        type="radio"
                        checked={selected}
                        onChange={() => handleOptionSelect(option.id)}
                        className="rounded border-white/20 bg-white/5 text-primary"
                        aria-label={`Seleccionar ${option.text}`}
                      />
                      <span className="text-sm text-foreground">{option.text}</span>
                    </label>
                  );
                })}
              </div>
            </div>
            <div className="border-t border-border/70 p-4 flex items-center justify-between">
              <div className="flex items-center gap-2 text-xs text-muted-foreground">
                Respondidas{" "}
                <span className="text-white font-medium">
                  {answeredCount} de {questions.length}
                </span>
              </div>
              <div className="flex items-center gap-2">
                <Button
                  type="button"
                  variant="secondary"
                  size="sm"
                  disabled={current === 0}
                  onClick={handlePrevious}
                >
                  <ChevronLeft size={14} /> Anterior
                </Button>
                <Button
                  type="button"
                  variant="secondary"
                  size="sm"
                  disabled={current === questions.length - 1}
                  onClick={handleNext}
                >
                  Siguiente <ChevronRight size={14} />
                </Button>
              </div>
            </div>
          </Card>

          <div className="mt-4 flex items-center justify-between">
            <Button
              type="button"
              variant="secondary"
              disabled={submitting}
              onClick={() => navigate(`/courses/${courseId}`)}
            >
              Salir del examen
            </Button>
            <Button
              type="button"
              variant="primary"
              disabled={submitting || answeredCount < questions.length}
              onClick={handleSubmit}
            >
              {submitting ? "Entregando..." : "Entregar examen"}
            </Button>
          </div>

          {confirmSubmit && (
            <Card className="mt-4 rounded-2xl border border-warning/50 bg-warning/10 p-5">
              <h3 className="text-sm font-semibold text-warning">¿Entregar el examen?</h3>
              <p className="mt-1 text-sm text-muted-foreground">
                Revisa que hayas respondido todas las preguntas. Una vez
                entregado, se registrará tu intento y podrás ver los resultados.
              </p>
              <div className="mt-4 flex justify-end gap-2">
                <Button
                  type="button"
                  variant="secondary"
                  onClick={() => setConfirmSubmit(false)}
                >
                  Seguir respondiendo
                </Button>
                <Button
                  type="button"
                  variant="danger"
                  disabled={submitting}
                  onClick={confirmAndSubmit}
                >
                  {submitting ? "Entregando..." : "Sí, entregar"}
                </Button>
              </div>
            </Card>
          )}
        </Card>
      </div>
    </AuthenticatedLayout>
  );
}

function ProgressBarExam({
  current,
  total,
  answered,
}: {
  current: number;
  total: number;
  answered: number;
}) {
  const value = total === 0 ? 0 : Math.round((current / total) * 100);

  return (
    <div className="space-y-1">
      <div className="flex items-center justify-between text-xs text-muted-foreground">
        <span>Pregunta {current} de {total}</span>
        <span>{answered} respondidas</span>
      </div>
      <div
        role="progressbar"
        aria-valuemin={0}
        aria-valuemax={100}
        aria-valuenow={value}
        className="h-2 overflow-hidden rounded-full bg-white/10"
      >
        <div
          className="h-full rounded-full bg-gradient-to-r from-primary to-accent"
          style={{ width: `${value}%` }}
        />
      </div>
    </div>
  );
}

