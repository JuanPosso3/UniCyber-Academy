import { useState } from "react";
import {
  ArrowDown,
  ArrowUp,
  CheckCircle2,
  ClipboardList,
  Target,
} from "lucide-react";
import { Alert } from "../../ui/Alert";
import { Badge } from "../../ui/Badge";
import { Button } from "../../ui/Button";
import { Card } from "../../ui/Card";
import { ProgressBar } from "../ProgressBar";
import { InlineText } from "../InlineText";
import {
  checkActivityAnswerRequest,
  executeTerminalCommandRequest,
  finalizeLaboratoryRequest,
  previewActivityAnswerRequest,
  previewTerminalCommandRequest,
} from "../../../services/lessons";
import { getRequiredLeafActivities } from "../../../lib/lab";
import { ApiError } from "../../../lib/api";
import type {
  ActivityCheckResponse,
  ChainedActivity,
  DecisionStepsActivity,
  EmailAnalysisActivity,
  IdentifySuspiciousActivity,
  LabActivity,
  LabContent,
  LabOption,
  LessonCompletionResponse,
  MultipleSelectActivity,
  OrderProcedureActivity,
  SingleChoiceActivity,
  TerminalActivity,
  TerminalResponse,
} from "../../../types/lesson";
import {
  ActivityFrame,
  type ActivityFeedback,
} from "./ActivityFrame";
import { TerminalActivityView } from "./TerminalActivityView";
import { EmailAnalysisActivityView } from "./EmailAnalysisActivityView";

export interface LaboratoryRendererProps {
  content: LabContent;
  mode: "student" | "preview";
  courseId: number;
  moduleId?: number;
  lessonId: number;
  completed: boolean;
  onCompleted?: (response: LessonCompletionResponse) => void;
}

interface CheckOptions {
  silent?: boolean;
}

function OptionButton({
  option,
  selected,
  onClick,
  disabled,
  role = "checkbox",
}: {
  option: LabOption;
  selected: boolean;
  onClick: () => void;
  disabled: boolean;
  role?: "checkbox" | "radio";
}) {
  return (
    <button
      type="button"
      role={role}
      aria-checked={selected}
      disabled={disabled}
      onClick={onClick}
      className={`flex w-full items-start gap-3 rounded-xl border p-3 text-left transition-colors disabled:cursor-not-allowed disabled:opacity-70 ${
        selected
          ? "border-accent/50 bg-accent/10"
          : "border-border bg-white/[0.03] hover:border-border-strong hover:bg-white/5"
      }`}
    >
      <span
        className={`mt-0.5 flex h-4 w-4 flex-shrink-0 items-center justify-center border ${
          role === "radio" ? "rounded-full" : "rounded"
        } ${selected ? "border-accent bg-accent" : "border-muted-foreground"}`}
        aria-hidden="true"
      >
        {selected && <span className="h-1.5 w-1.5 rounded-full bg-background" />}
      </span>
      <span className="min-w-0 text-sm text-muted-foreground">
        <InlineText text={option.text} />
      </span>
    </button>
  );
}

function SingleChoiceView({
  activity,
  solved,
  feedback,
  onCheck,
}: {
  activity: SingleChoiceActivity;
  solved: boolean;
  feedback: ActivityFeedback;
  onCheck: (answer: unknown, options?: CheckOptions) => Promise<ActivityCheckResponse>;
}) {
  const [selected, setSelected] = useState<string | null>(null);

  return (
    <ActivityFrame
      activity={activity}
      solved={solved}
      feedback={feedback}
      isChecking={false}
      canCheck={selected !== null}
      answer={{ optionId: selected }}
      onCheck={(answer) => {
        void onCheck(answer);
      }}
    >
      <div className="space-y-2">
        {activity.options.map((option) => (
          <OptionButton
            key={option.id}
            option={option}
            selected={selected === option.id}
            disabled={solved}
            role="radio"
            onClick={() => setSelected(option.id)}
          />
        ))}
      </div>
    </ActivityFrame>
  );
}

function IdentifySuspiciousView({
  activity,
  solved,
  feedback,
  onCheck,
}: {
  activity: IdentifySuspiciousActivity;
  solved: boolean;
  feedback: ActivityFeedback;
  onCheck: (answer: unknown, options?: CheckOptions) => Promise<ActivityCheckResponse>;
}) {
  const [selected, setSelected] = useState<string[]>([]);

  const toggle = (id: string) => {
    setSelected((current) =>
      current.includes(id)
        ? current.filter((item) => item !== id)
        : [...current, id],
    );
  };

  return (
    <ActivityFrame
      activity={activity}
      solved={solved}
      feedback={feedback}
      isChecking={false}
      canCheck={selected.length > 0}
      answer={{ elementIds: selected }}
      onCheck={(answer) => {
        void onCheck(answer);
      }}
    >
      <div className="grid gap-2 sm:grid-cols-2">
        {activity.elements.map((element) => (
          <OptionButton
            key={element.id}
            option={element}
            selected={selected.includes(element.id)}
            disabled={solved}
            onClick={() => toggle(element.id)}
          />
        ))}
      </div>
    </ActivityFrame>
  );
}

function MultipleSelectView({
  activity,
  solved,
  feedback,
  onCheck,
}: {
  activity: MultipleSelectActivity;
  solved: boolean;
  feedback: ActivityFeedback;
  onCheck: (answer: unknown, options?: CheckOptions) => Promise<ActivityCheckResponse>;
}) {
  const [selected, setSelected] = useState<string[]>([]);

  const toggle = (id: string) => {
    setSelected((current) =>
      current.includes(id)
        ? current.filter((item) => item !== id)
        : [...current, id],
    );
  };

  return (
    <ActivityFrame
      activity={activity}
      solved={solved}
      feedback={feedback}
      isChecking={false}
      canCheck={selected.length > 0}
      answer={{ optionIds: selected }}
      onCheck={(answer) => {
        void onCheck(answer);
      }}
    >
      <div className="space-y-2">
        {activity.options.map((option) => (
          <OptionButton
            key={option.id}
            option={option}
            selected={selected.includes(option.id)}
            disabled={solved}
            onClick={() => toggle(option.id)}
          />
        ))}
      </div>
    </ActivityFrame>
  );
}

function DecisionStepsView({
  activity,
  solved,
  feedback,
  onCheck,
}: {
  activity: DecisionStepsActivity;
  solved: boolean;
  feedback: ActivityFeedback;
  onCheck: (answer: unknown, options?: CheckOptions) => Promise<ActivityCheckResponse>;
}) {
  const [answers, setAnswers] = useState<Record<string, string>>({});
  const complete = activity.steps.every((step) => answers[step.id]);

  return (
    <ActivityFrame
      activity={activity}
      solved={solved}
      feedback={feedback}
      isChecking={false}
      canCheck={complete}
      answer={{
        answers: activity.steps.map((step) => ({
          stepId: step.id,
          optionId: answers[step.id] ?? "",
        })),
      }}
      onCheck={(answer) => {
        void onCheck(answer);
      }}
    >
      <div className="space-y-4">
        {activity.steps.map((step, index) => (
          <div key={step.id} className="rounded-xl border border-border bg-white/[0.02] p-3">
            <p className="mb-2 text-sm font-semibold text-white">
              Paso {index + 1}. <InlineText text={step.prompt} />
            </p>
            <div className="space-y-2">
              {step.options.map((option) => (
                <OptionButton
                  key={option.id}
                  option={option}
                  selected={answers[step.id] === option.id}
                  disabled={solved}
                  role="radio"
                  onClick={() =>
                    setAnswers((current) => ({
                      ...current,
                      [step.id]: option.id,
                    }))
                  }
                />
              ))}
            </div>
          </div>
        ))}
      </div>
    </ActivityFrame>
  );
}

function OrderProcedureView({
  activity,
  solved,
  feedback,
  onCheck,
}: {
  activity: OrderProcedureActivity;
  solved: boolean;
  feedback: ActivityFeedback;
  onCheck: (answer: unknown, options?: CheckOptions) => Promise<ActivityCheckResponse>;
}) {
  const [order, setOrder] = useState<string[]>(
    activity.items.map((item) => item.id),
  );

  const move = (index: number, direction: -1 | 1) => {
    const target = index + direction;

    if (target < 0 || target >= order.length) {
      return;
    }

    setOrder((current) => {
      const next = [...current];
      [next[index], next[target]] = [next[target]!, next[index]!];
      return next;
    });
  };

  const itemsById = new Map(activity.items.map((item) => [item.id, item]));

  return (
    <ActivityFrame
      activity={activity}
      solved={solved}
      feedback={feedback}
      isChecking={false}
      canCheck={!solved}
      answer={{ order }}
      onCheck={(answer) => {
        void onCheck(answer);
      }}
    >
      <ol className="space-y-2">
        {order.map((id, index) => {
          const item = itemsById.get(id);

          if (!item) {
            return null;
          }

          return (
            <li
              key={id}
              className="flex items-center gap-3 rounded-xl border border-border bg-white/[0.03] p-3"
            >
              <span className="flex h-7 w-7 flex-shrink-0 items-center justify-center rounded-lg bg-accent/15 text-xs font-bold text-accent">
                {index + 1}
              </span>
              <span className="min-w-0 flex-1 text-sm text-muted-foreground">
                <InlineText text={item.text} />
              </span>
              <span className="flex gap-1">
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  disabled={solved || index === 0}
                  onClick={() => move(index, -1)}
                  aria-label={`Mover «${item.text}» hacia arriba`}
                >
                  <ArrowUp size={14} />
                </Button>
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  disabled={solved || index === order.length - 1}
                  onClick={() => move(index, 1)}
                  aria-label={`Mover «${item.text}» hacia abajo`}
                >
                  <ArrowDown size={14} />
                </Button>
              </span>
            </li>
          );
        })}
      </ol>
    </ActivityFrame>
  );
}

function ChainedGroup({
  activity,
  inheritedRequired,
  children,
}: {
  activity: ChainedActivity;
  inheritedRequired: boolean;
  children: React.ReactNode;
}) {
  const required = inheritedRequired && activity.required !== false;

  return (
    <Card className="p-5">
      <div className="mb-4 flex flex-wrap items-center gap-2">
        <h3 className="text-base font-semibold text-white">{activity.title}</h3>
        <Badge color={required ? "cyan" : "gray"}>
          {required ? "Obligatoria" : "Opcional"}
        </Badge>
      </div>
      <p className="text-sm leading-6 text-muted-foreground">
        <InlineText text={activity.instructions} />
      </p>
      <div className="mt-4 space-y-4">{children}</div>
    </Card>
  );
}

function ActivityView({
  activity,
  inheritedRequired,
  solved,
  feedback,
  solvedMap,
  feedbackMap,
  onCheck,
  onRunCommand,
}: {
  activity: LabActivity;
  inheritedRequired: boolean;
  solved: boolean;
  feedback: ActivityFeedback;
  solvedMap?: Record<string, boolean>;
  feedbackMap?: Record<string, ActivityFeedback>;
  onCheck: (activityId: string, answer: unknown, options?: CheckOptions) => Promise<ActivityCheckResponse>;
  onRunCommand: (activityId: string, command: string) => Promise<TerminalResponse>;
}) {
  const required = inheritedRequired && activity.required !== false;
  const displayActivity = { ...activity, required } as LabActivity;
  const check = (answer: unknown, options?: CheckOptions) =>
    onCheck(activity.id, answer, options);

  switch (activity.type) {
    case "SINGLE_CHOICE":
      return (
        <SingleChoiceView
          activity={displayActivity as SingleChoiceActivity}
          solved={solved}
          feedback={feedback}
          onCheck={check}
        />
      );
    case "IDENTIFY_SUSPICIOUS":
      return (
        <IdentifySuspiciousView
          activity={displayActivity as IdentifySuspiciousActivity}
          solved={solved}
          feedback={feedback}
          onCheck={check}
        />
      );
    case "MULTIPLE_SELECT":
      return (
        <MultipleSelectView
          activity={displayActivity as MultipleSelectActivity}
          solved={solved}
          feedback={feedback}
          onCheck={check}
        />
      );
    case "DECISION_STEPS":
      return (
        <DecisionStepsView
          activity={displayActivity as DecisionStepsActivity}
          solved={solved}
          feedback={feedback}
          onCheck={check}
        />
      );
    case "ORDER_PROCEDURE":
      return (
        <OrderProcedureView
          activity={displayActivity as OrderProcedureActivity}
          solved={solved}
          feedback={feedback}
          onCheck={check}
        />
      );
    case "TERMINAL":
      return (
        <TerminalActivityView
          activity={displayActivity as TerminalActivity}
          solved={solved}
          feedback={feedback}
          onCheck={(answer, silent) => check(answer, { silent })}
          onRunCommand={(command) => onRunCommand(activity.id, command)}
        />
      );
    case "EMAIL_ANALYSIS":
      return (
        <EmailAnalysisActivityView
          activity={displayActivity as EmailAnalysisActivity}
          solved={solved}
          feedback={feedback}
          onCheck={(answer) => {
            void check(answer);
          }}
        />
      );
    case "CHAINED":
      return (
        <ChainedGroup activity={displayActivity as ChainedActivity} inheritedRequired={required}>
          {activity.activities.map((child) => (
            <ActivityView
              key={child.id}
              activity={child}
              inheritedRequired={required}
              solved={Boolean(solvedMap?.[child.id])}
              feedback={feedbackMap?.[child.id] ?? "idle"}
              solvedMap={solvedMap}
              feedbackMap={feedbackMap}
              onCheck={onCheck}
              onRunCommand={onRunCommand}
            />
          ))}
        </ChainedGroup>
      );
    default:
      return null;
  }
}

export function LaboratoryRenderer({
  content,
  mode,
  courseId,
  moduleId,
  lessonId,
  completed,
  onCompleted,
}: LaboratoryRendererProps) {
  const [answers, setAnswers] = useState<Record<string, unknown>>({});
  const [solved, setSolved] = useState<Record<string, boolean>>({});
  const [feedback, setFeedback] = useState<Record<string, ActivityFeedback>>({});
  const [checkError, setCheckError] = useState<string | null>(null);
  const [finalizeError, setFinalizeError] = useState<string | null>(null);
  const [isFinalizing, setIsFinalizing] = useState(false);
  const [justCompleted, setJustCompleted] = useState(false);
  const requiredLeaves = getRequiredLeafActivities(content);
  const solvedRequired = requiredLeaves.filter((leaf) =>
    Boolean(solved[leaf.activity.id]),
  ).length;
  const allRequiredSolved = solvedRequired === requiredLeaves.length;
  const isCompleted = completed || justCompleted;

  const checkAnswer = async (
    activityId: string,
    answer: unknown,
    options: CheckOptions = {},
  ): Promise<ActivityCheckResponse> => {
    setCheckError(null);

    try {
      const response =
        mode === "student"
          ? await checkActivityAnswerRequest(courseId, lessonId, activityId, answer)
          : await previewActivityAnswerRequest(
              courseId,
              moduleId ?? 0,
              lessonId,
              activityId,
              answer,
            );

      if (response.correct) {
        setAnswers((current) => ({ ...current, [activityId]: answer }));
        setSolved((current) => ({ ...current, [activityId]: true }));
        setFeedback((current) => ({ ...current, [activityId]: "correct" }));
      } else if (!options.silent) {
        setSolved((current) => ({ ...current, [activityId]: false }));
        setFeedback((current) => ({ ...current, [activityId]: "incorrect" }));
      }

      return response;
    } catch (requestError) {
      const message =
        requestError instanceof ApiError
          ? requestError.message
          : "No se pudo comprobar la actividad.";

      if (!options.silent) {
        setCheckError(message);
        setFeedback((current) => ({ ...current, [activityId]: "incorrect" }));
      }

      return { correct: false, message };
    }
  };

  const runCommand = async (
    activityId: string,
    command: string,
  ): Promise<TerminalResponse> => {
    if (mode === "student") {
      return executeTerminalCommandRequest(courseId, lessonId, activityId, command);
    }

    return previewTerminalCommandRequest(
      courseId,
      moduleId ?? 0,
      lessonId,
      activityId,
      command,
    );
  };

  const finalize = async () => {
    if (mode === "preview" || isCompleted) {
      return;
    }

    setIsFinalizing(true);
    setFinalizeError(null);

    try {
      const response = await finalizeLaboratoryRequest(
        courseId,
        lessonId,
        answers,
      );
      setJustCompleted(true);
      onCompleted?.(response);
    } catch (requestError) {
      setFinalizeError(
        requestError instanceof ApiError
          ? requestError.message
          : "No se pudo finalizar el laboratorio.",
      );
    } finally {
      setIsFinalizing(false);
    }
  };

  return (
    <div className="space-y-5">
      <Card className="p-5">
        <div className="mb-4 flex items-start gap-3">
          <div className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-xl bg-accent/15 text-accent">
            <ClipboardList size={20} aria-hidden="true" />
          </div>
          <div>
            <h2 className="text-base font-semibold text-white">Introducción</h2>
            <p className="mt-1 text-sm leading-7 text-muted-foreground">
              <InlineText text={content.introduction} />
            </p>
          </div>
        </div>
        <div className="rounded-xl border border-border bg-white/[0.03] p-4">
          <p className="mb-1 flex items-center gap-2 text-xs font-bold uppercase tracking-wide text-accent">
            <Target size={14} aria-hidden="true" />
            Objetivo
          </p>
          <p className="text-sm leading-7 text-muted-foreground">
            <InlineText text={content.objective} />
          </p>
        </div>
        <div className="mt-4 rounded-xl border border-border bg-white/[0.03] p-4">
          <p className="mb-1 text-xs font-bold uppercase tracking-wide text-muted-foreground">
            Contexto
          </p>
          <p className="text-sm leading-7 text-muted-foreground">
            <InlineText text={content.scenario} />
          </p>
        </div>
      </Card>

      {isCompleted && (
        <Alert variant="success">
          <CheckCircle2 size={15} aria-hidden="true" />
          Laboratorio completado. Puedes repasar las actividades, pero el
          progreso ya quedó registrado.
        </Alert>
      )}

      {checkError && <Alert variant="error">{checkError}</Alert>}

      <div className="space-y-4">
        {content.activities.map((activity) => (
          <ActivityView
            key={activity.id}
            activity={activity}
            inheritedRequired
            solved={Boolean(solved[activity.id])}
            feedback={feedback[activity.id] ?? "idle"}
            solvedMap={solved}
            feedbackMap={feedback}
            onCheck={checkAnswer}
            onRunCommand={runCommand}
          />
        ))}
      </div>

      <Card className="p-5">
        <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
          <h2 className="text-base font-semibold text-white">
            Condiciones de finalización
          </h2>
          <Badge color={allRequiredSolved ? "green" : "yellow"}>
            {solvedRequired}/{requiredLeaves.length} obligatorias
          </Badge>
        </div>
        <ProgressBar
          value={
            requiredLeaves.length === 0
              ? 100
              : (solvedRequired / requiredLeaves.length) * 100
          }
          label="Actividades obligatorias resueltas"
        />
        <p className="mt-3 text-xs text-muted-foreground">
          Debes resolver correctamente todas las actividades obligatorias.
          Las pistas no afectan la finalización y no se guarda el avance
          parcial.
        </p>

        {finalizeError && (
          <Alert variant="error" className="mt-3">
            {finalizeError}
          </Alert>
        )}

        {mode === "preview" ? (
          <Alert variant="info" className="mt-4">
            Vista previa: las interacciones se validan, pero no se registra
            progreso para el administrador.
          </Alert>
        ) : (
          <Button
            type="button"
            variant="cyan"
            className="mt-4"
            disabled={!allRequiredSolved || isFinalizing || isCompleted}
            onClick={() => {
              void finalize();
            }}
          >
            {isFinalizing
              ? "Finalizando..."
              : isCompleted
                ? "Laboratorio completado"
                : "Finalizar laboratorio"}
          </Button>
        )}
      </Card>
    </div>
  );
}
