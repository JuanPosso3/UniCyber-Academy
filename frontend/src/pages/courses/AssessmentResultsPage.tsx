import { useEffect, useState } from "react";
import { ArrowLeft, RefreshCw } from "lucide-react";
import { AuthenticatedLayout } from "../../components/layout/AuthenticatedLayout";
import { Badge } from "../../components/ui/Badge";
import { Button } from "../../components/ui/Button";
import { Card } from "../../components/ui/Card";
import { StatePanel } from "../../components/ui/StatePanel";
import { ApiError } from "../../lib/api";
import { getAssessmentResultsRequest } from "../../services/assessments";
import type { NavigateFn } from "../../types/navigation";

export interface AssessmentResultsPageProps {
  courseId: number;
  navigate: NavigateFn;
}

export function AssessmentResultsPage({
  courseId,
  navigate,
}: AssessmentResultsPageProps) {
  const [results, setResults] = useState<{
    attempt: {
      score: number;
      correctAnswers: number;
      incorrectAnswers: number;
      passed: boolean;
      completedAt: string;
    };
    questions: Array<{
      questionId: number;
      order: number;
      statement: string;
      type: string;
      answeredCorrectly: boolean;
      selectedOptionText: string | null;
      explanation: string | null;
      hint: string | null;
    }>;
  } | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let active = true;

    setLoading(true);

    void getAssessmentResultsRequest(courseId)
      .then((response) => {
        if (!active) {
          return;
        }

        setResults(response);
        setLoading(false);
      })
      .catch((requestError: unknown) => {
        if (!active) {
          return;
        }

        setError(
          requestError instanceof ApiError
            ? requestError.message
            : "No se pudo cargar los resultados.",
        );
        setLoading(false);
      });

    return () => {
      active = false;
    };
  }, [courseId]);

  if (loading) {
    return (
      <AuthenticatedLayout
        title="Resultados del examen"
        currentPath="/courses"
        navigate={navigate}
      >
        <StatePanel variant="loading" title="Cargando resultados" />
      </AuthenticatedLayout>
    );
  }

  if (error) {
    return (
      <AuthenticatedLayout
        title="Resultados del examen"
        currentPath="/courses"
        navigate={navigate}
      >
        <StatePanel variant="error" title="Error" description={error} />
      </AuthenticatedLayout>
    );
  }

  if (!results) {
    return (
      <AuthenticatedLayout
        title="Resultados del examen"
        currentPath="/courses"
        navigate={navigate}
      >
        <StatePanel
          variant="error"
          title="Resultados no encontrados"
          description="Aún no has presentado el examen final de este curso."
        />
      </AuthenticatedLayout>
    );
  }

  const { attempt, questions } = results;
  const passed = attempt.passed;

  return (
    <AuthenticatedLayout
      title="Resultados del examen"
      currentPath="/courses"
      navigate={navigate}
    >
      <div className="mx-auto max-w-3xl space-y-5">
        <Button
          type="button"
          variant="ghost"
          onClick={() => navigate(`/courses/${courseId}`)}
        >
          <ArrowLeft size={15} /> Volver al curso
        </Button>

        <Card className="p-6">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h1 className="text-2xl font-bold text-white">Resultados del examen</h1>
              <p className="mt-1 text-sm text-muted-foreground">
                Último intento presentado
              </p>
            </div>
            <Badge color={passed ? "green" : "red"}>
              {passed ? "Aprobado" : "No aprobado"}
            </Badge>
          </div>

          <div className="grid gap-4 sm:grid-cols-3">
            <Card className="p-4">
              <p className="text-xs text-muted-foreground">Calificación</p>
              <p className="text-2xl font-bold text-white">
                {attempt.score}%
              </p>
            </Card>
            <Card className="p-4">
              <p className="text-xs text-muted-foreground">Correctas</p>
              <p className="text-2xl font-bold text-white">
                {attempt.correctAnswers} de 8
              </p>
            </Card>
            <Card className="p-4">
              <p className="text-xs text-muted-foreground">Incorrectas</p>
              <p className="text-2xl font-bold text-white">
                {attempt.incorrectAnswers} de 8
              </p>
            </Card>
          </div>

          <div className="mt-4 rounded-xl border p-4">
            <p className="text-sm text-white">
              {passed
                ? "¡Felicitaciones! Has demostrado que comprendes los conceptos fundamentales de este curso."
                : "Aún necesitas reforzar algunos conocimientos. Revisa las explicaciones de tus respuestas y vuelve a realizar el examen cuando estés preparado."}
            </p>
          </div>
        </Card>

        <Card className="p-6">
          <h2 className="text-sm font-semibold text-white mb-4">
            Revisión de respuestas
          </h2>
          <div className="space-y-3">
            {questions.map((question) => (
              <Card
                key={question.questionId}
                className="p-4 border border-border/60"
              >
                <div className="flex items-center gap-2 mb-2">
                  <span className="flex h-5 w-5 flex-shrink-0 items-center justify-center rounded-full bg-primary text-[10px] font-bold text-white">
                    {question.order}
                  </span>
                  <Badge
                    color={
                      question.type === "MULTIPLE_CHOICE" ? "blue" : "purple"
                    }
                  >
                    {question.type === "MULTIPLE_CHOICE"
                      ? "Selección múltiple"
                      : "Verdadero / Falso"}
                  </Badge>
                  <span
                    className={`ml-auto text-xs font-bold rounded px-2 py-0.5 ${
                      question.answeredCorrectly
                        ? "bg-green/20 text-green border-green/40"
                        : "bg-red/20 text-red border-red/40"
                    }`}
                  >
                    {question.answeredCorrectly ? "Correcta" : "Incorrecta"}
                  </span>
                </div>
                <p className="text-sm text-foreground mb-3">
                  {question.statement}
                </p>
                <div className="mb-3">
                  <p className="text-xs text-muted-foreground">Tu respuesta</p>
                  <p className="text-sm text-white">
                    {question.selectedOptionText ?? "No respondida"}
                  </p>
                </div>
                <div className="space-y-2">
                  {question.answeredCorrectly && question.explanation ? (
                    <div className="rounded-lg border border-green/40 bg-green/10 p-3">
                      <p className="text-xs font-semibold text-green mb-1">
                        ¿Por qué es correcta?
                      </p>
                      <p className="text-sm text-green/90">
                        {question.explanation}
                      </p>
                    </div>
                  ) : (
                    <>
                      {question.hint && (
                        <div className="rounded-lg border border-blue/40 bg-blue/10 p-3">
                          <p className="text-xs font-semibold text-blue mb-1">
                            Orientación para repasar
                          </p>
                          <p className="text-sm text-blue/90">
                            {question.hint}
                          </p>
                        </div>
                      )}
                      {!question.hint && (
                        <div className="rounded-lg border border-blue/40 bg-blue/10 p-3">
                          <p className="text-xs font-semibold text-blue mb-1">
                            Orientación para repasar
                          </p>
                          <p className="text-sm text-blue/90">
                            Revisa la lección relacionada con este concepto y
                            vuelve a intentarlo.
                          </p>
                        </div>
                      )}
                    </>
                  )}
                </div>
              </Card>
            ))}
          </div>
        </Card>

        <div className="mt-2 flex justify-end">
          <Button
            type="button"
            variant="primary"
            onClick={() => navigate(`/courses/${courseId}/assessment`)}
          >
            <RefreshCw size={14} /> Volver a presentar el examen
          </Button>
        </div>
      </div>
    </AuthenticatedLayout>
  );
}
