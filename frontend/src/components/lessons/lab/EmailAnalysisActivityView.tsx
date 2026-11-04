import { useState, type ReactNode } from "react";
import { Check, Mail, MousePointerClick } from "lucide-react";
import { InlineText } from "../InlineText";
import type {
  EmailAnalysisActivity,
  EmailAnalysisElement,
} from "../../../types/lesson";
import {
  ActivityFrame,
  type ActivityFeedback,
} from "./ActivityFrame";

export interface EmailAnalysisActivityViewProps {
  activity: EmailAnalysisActivity;
  solved: boolean;
  feedback: ActivityFeedback;
  onCheck: (answer: unknown) => void;
}

const SELECTABLE_BASE =
  "relative block w-full rounded-lg border p-2.5 text-left transition-colors disabled:cursor-not-allowed disabled:opacity-90";

function selectableClasses(selected: boolean): string {
  return selected
    ? `${SELECTABLE_BASE} border-accent/60 bg-accent/10`
    : `${SELECTABLE_BASE} border-transparent hover:border-border hover:bg-white/[0.04]`;
}

function SelectableRegion({
  element,
  selected,
  disabled,
  onPress,
  children,
}: {
  element: EmailAnalysisElement;
  selected: boolean;
  disabled: boolean;
  onPress: () => void;
  children: ReactNode;
}) {
  return (
    <button
      type="button"
      aria-pressed={selected}
      disabled={disabled}
      onClick={onPress}
      className={selectableClasses(selected)}
      title={element.text}
    >
      {children}
      {selected && (
        <Check
          size={13}
          className="absolute right-1.5 top-1.5 text-accent"
          aria-hidden="true"
        />
      )}
    </button>
  );
}

function HeaderRow({
  label,
  value,
  strong = false,
}: {
  label: string;
  value: string;
  strong?: boolean;
}) {
  return (
    <span className="flex min-w-0 flex-col sm:flex-row sm:items-start sm:gap-2">
      <span className="w-20 flex-shrink-0 pt-0.5 text-[11px] font-bold uppercase tracking-wide text-muted-foreground">
        {label}
      </span>
      <span
        className={`min-w-0 break-words text-sm leading-6 ${
          strong ? "font-semibold text-white" : "text-muted-foreground"
        }`}
      >
        <InlineText text={value} />
      </span>
    </span>
  );
}

/**
 * Simulación de análisis de correo: el estudiante marca directamente,
 * sobre el correo representado, las partes que considera sospechosas.
 * La validación ocurre en el backend y la solución nunca llega al cliente.
 */
export function EmailAnalysisActivityView({
  activity,
  solved,
  feedback,
  onCheck,
}: EmailAnalysisActivityViewProps) {
  const email = activity.email;
  const elementById = new Map(
    activity.elements.map((element) => [element.id, element]),
  );
  const [selected, setSelected] = useState<string[]>([]);

  const toggle = (elementId: string | undefined) => {
    if (!elementId || solved) {
      return;
    }

    setSelected((current) =>
      current.includes(elementId)
        ? current.filter((item) => item !== elementId)
        : [...current, elementId],
    );
  };

  const renderRegion = (
    elementId: string | undefined,
    label: string,
    children: ReactNode,
  ) => {
    const element = elementId ? elementById.get(elementId) : undefined;

    if (!element) {
      return <div key={label}>{children}</div>;
    }

    return (
      <SelectableRegion
        key={`${label}-${element.id}`}
        element={element}
        selected={selected.includes(element.id)}
        disabled={solved}
        onPress={() => toggle(element.id)}
      >
        {children}
      </SelectableRegion>
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
        onCheck(answer);
      }}
    >
      <div className="overflow-hidden rounded-2xl border border-border bg-white/[0.02]">
        <div className="flex flex-wrap items-center gap-2 border-b border-border bg-white/5 px-4 py-2">
          <span className="flex items-center gap-2 text-[11px] font-bold uppercase tracking-widest text-muted-foreground">
            <Mail size={14} aria-hidden="true" />
            Bandeja de entrada
          </span>
          <span className="ml-auto flex items-center gap-1.5 text-[11px] text-muted-foreground">
            <MousePointerClick size={12} aria-hidden="true" />
            Correo simulado
          </span>
        </div>

        <div className="p-4 sm:p-5">
          {!solved && (
            <p className="mb-3 flex items-start gap-1.5 text-xs leading-5 text-muted-foreground">
              <MousePointerClick
                size={13}
                className="mt-0.5 flex-shrink-0"
                aria-hidden="true"
              />
              Toca o haz clic sobre cualquier parte del correo para marcarla
              como sospechosa; vuelve a tocarla para desmarcarla.
            </p>
          )}

          <div className="space-y-1.5">
            {renderRegion(
              email.fromElementId,
              "remitente",
              <HeaderRow
                label="De"
                value={`${email.fromName} <${email.fromAddress}>`}
              />,
            )}
            {renderRegion(
              email.toElementId,
              "destinatario",
              <HeaderRow label="Para" value={email.toAddress} />,
            )}
            {renderRegion(
              email.subjectElementId,
              "asunto",
              <HeaderRow label="Asunto" value={email.subject} strong />,
            )}
            {renderRegion(
              email.datetimeElementId,
              "fecha",
              <HeaderRow label="Fecha" value={email.datetime} />,
            )}
          </div>

          <div className="mt-4 space-y-1.5">
            {email.greeting !== undefined &&
            email.greeting.length > 0
              ? renderRegion(
                  email.greetingElementId,
                  "saludo",
                  <p className="text-sm italic leading-6 text-muted-foreground">
                    <InlineText text={email.greeting} />
                  </p>,
                )
              : null}
            {email.body.map((paragraph, index) =>
              renderRegion(
                paragraph.elementId,
                `parrafo-${index}`,
                <p className="text-sm leading-6 text-muted-foreground">
                  <InlineText text={paragraph.text} />
                </p>,
              ),
            )}
          </div>

          {email.linkLabel && email.linkUrl && (
            <div className="mt-4">
              {renderRegion(
                email.linkElementId,
                "enlace",
                <div className="flex flex-col items-start gap-1.5">
                  <span className="inline-flex items-center rounded-md border border-accent/40 bg-accent/10 px-3 py-1.5 text-xs font-bold uppercase tracking-wide text-accent">
                    {email.linkLabel}
                  </span>
                  <span className="break-all font-mono text-xs text-muted-foreground">
                    {email.linkUrl}
                  </span>
                </div>,
              )}
            </div>
          )}

          {(email.closingLines !== undefined ||
            email.signatureLines !== undefined) && (
            <div className="mt-4 space-y-1.5">
              {email.closingLines !== undefined &&
              email.closingLines.length > 0
                ? renderRegion(
                    email.closingElementId,
                    "cierre",
                    <p className="text-sm leading-6 text-muted-foreground">
                      <InlineText text={email.closingLines.join(" ")} />
                    </p>,
                  )
                : null}
              {email.signatureLines !== undefined &&
              email.signatureLines.length > 0 ? (
                email.signatureElementId ? (
                  renderRegion(
                    email.signatureElementId,
                    "firma",
                    <div className="border-l-2 border-border pl-3">
                      {email.signatureLines.map((line, index) => (
                        <p
                          key={index}
                          className={
                            index === 0
                              ? "text-sm font-semibold leading-6 text-white"
                              : "text-sm leading-6 text-muted-foreground"
                          }
                        >
                          <InlineText text={line} />
                        </p>
                      ))}
                      {email.confidentialityNote && (
                        <p className="mt-1 text-xs italic leading-5 text-muted-foreground">
                          <InlineText text={email.confidentialityNote} />
                        </p>
                      )}
                    </div>,
                  )
                ) : (
                  <div className="border-l-2 border-border pl-3">
                    {email.signatureLines.map((line, index) => (
                      <p
                        key={index}
                        className={
                          index === 0
                            ? "text-sm font-semibold leading-6 text-white"
                            : "text-sm leading-6 text-muted-foreground"
                        }
                      >
                        <InlineText text={line} />
                      </p>
                    ))}
                    {email.confidentialityNote && (
                      <p className="mt-1 text-xs italic leading-5 text-muted-foreground">
                        <InlineText text={email.confidentialityNote} />
                      </p>
                    )}
                  </div>
                )
              ) : email.confidentialityNote ? (
                <p className="text-xs italic leading-5 text-muted-foreground">
                  <InlineText text={email.confidentialityNote} />
                </p>
              ) : null}
            </div>
          )}
        </div>
      </div>

      {email.disclaimer && (
        <p className="mt-3 rounded-xl border border-border bg-white/[0.03] p-3 text-xs italic leading-5 text-muted-foreground">
          <InlineText text={email.disclaimer} />
        </p>
      )}

      <p className="mt-3 text-xs text-muted-foreground">
        Elementos seleccionados:{" "}
        <span className="font-bold text-white">{selected.length}</span>
      </p>
    </ActivityFrame>
  );
}
