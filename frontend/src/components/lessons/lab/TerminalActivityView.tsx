import { useState, type FormEvent } from "react";
import { ChevronDown, ChevronUp, TerminalSquare } from "lucide-react";
import { Alert } from "../../ui/Alert";
import { Button } from "../../ui/Button";
import { ApiError } from "../../../lib/api";
import type {
  ActivityCheckResponse,
  TerminalActivity,
  TerminalResponse,
} from "../../../types/lesson";
import {
  ActivityFrame,
  type ActivityFeedback,
} from "./ActivityFrame";

export interface TerminalActivityViewProps {
  activity: TerminalActivity;
  solved: boolean;
  feedback: ActivityFeedback;
  onCheck: (answer: unknown, silent?: boolean) => Promise<ActivityCheckResponse>;
  onRunCommand: (command: string) => Promise<TerminalResponse>;
}

interface TerminalLine {
  command: string;
  output: string;
}

export function TerminalActivityView({
  activity,
  solved,
  feedback,
  onCheck,
  onRunCommand,
}: TerminalActivityViewProps) {
  const [input, setInput] = useState("");
  const [lines, setLines] = useState<TerminalLine[]>([]);
  const [executed, setExecuted] = useState<string[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [isRunning, setIsRunning] = useState(false);
  const [showCommands, setShowCommands] = useState(false);

  const submit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    const command = input.trim();

    if (!command || solved || isRunning) {
      return;
    }

    setIsRunning(true);
    setError(null);

    try {
      const response = await onRunCommand(command);
      const nextExecuted = executed.includes(response.command)
        ? executed
        : [...executed, response.command];

      setExecuted(nextExecuted);
      setLines((current) => [
        ...current,
        { command: response.command, output: response.output },
      ]);
      setInput("");
      await onCheck({ commands: nextExecuted }, true);
    } catch (requestError) {
      setError(
        requestError instanceof ApiError
          ? requestError.message
          : "No se pudo ejecutar el comando simulado.",
      );
    } finally {
      setIsRunning(false);
    }
  };

  return (
    <ActivityFrame
      activity={activity}
      solved={solved}
      feedback={feedback}
      isChecking={false}
      canCheck={false}
      answer={{ commands: executed }}
      showCheckButton={false}
      onCheck={() => undefined}
    >
      <div className="overflow-hidden rounded-2xl border border-border bg-[#070D19]">
        <div className="flex items-center justify-between border-b border-border bg-white/5 px-4 py-2">
          <span className="flex items-center gap-2 text-[11px] font-bold uppercase tracking-widest text-muted-foreground">
            <TerminalSquare size={14} aria-hidden="true" />
            Terminal simulada
          </span>
          <span className="flex items-center gap-1.5 text-[10px] text-success">
            <span className="h-1.5 w-1.5 rounded-full bg-success" />
            Entorno aislado
          </span>
        </div>

        <div className="max-h-80 min-h-40 overflow-y-auto p-4 font-mono text-xs leading-6 text-slate-200">
          {activity.welcome && (
            <p className="mb-2 whitespace-pre-wrap text-slate-400">
              {activity.welcome}
            </p>
          )}

          {lines.map((line, index) => (
            <div key={`${line.command}-${index}`} className="mb-2">
              <p className="text-accent">
                <span className="text-muted-foreground">$ </span>
                {line.command}
              </p>
              <pre className="whitespace-pre-wrap text-slate-300">
                {line.output}
              </pre>
            </div>
          ))}

          {error && <p className="text-destructive">{error}</p>}

          <form className="flex items-center gap-2" onSubmit={submit}>
            <span className="text-accent">$</span>
            <input
              value={input}
              onChange={(event) => setInput(event.target.value)}
              disabled={solved || isRunning}
              aria-label="Comando para la terminal simulada"
              placeholder={
                solved ? "Actividad completada" : "Escribe un comando..."
              }
              autoComplete="off"
              spellCheck={false}
              className="min-w-0 flex-1 border-0 bg-transparent p-0 font-mono text-xs text-slate-100 placeholder:text-muted-foreground/60 focus:outline-none"
            />
            <Button
              type="submit"
              variant="cyan"
              size="sm"
              disabled={solved || isRunning || input.trim().length === 0}
            >
              {isRunning ? "..." : "Ejecutar"}
            </Button>
          </form>
        </div>
      </div>

      <div className="mt-3">
        <Button
          type="button"
          variant="ghost"
          size="sm"
          onClick={() => setShowCommands((value) => !value)}
          aria-expanded={showCommands}
        >
          {showCommands ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
          {showCommands ? "Ocultar comandos disponibles" : "Consultar comandos disponibles"}
        </Button>

        {showCommands && (
          <div className="mt-2 grid gap-2 sm:grid-cols-2">
            {activity.commands.map((command) => (
              <button
                key={command.command}
                type="button"
                disabled={solved}
                onClick={() => setInput(command.command)}
                className="rounded-xl border border-border bg-white/5 p-3 text-left transition-colors hover:border-accent/40 hover:bg-accent/5 disabled:opacity-50"
              >
                <code className="block text-xs font-bold text-accent">
                  {command.command}
                </code>
                {command.description && (
                  <span className="mt-1 block text-[11px] text-muted-foreground">
                    {command.description}
                  </span>
                )}
              </button>
            ))}
          </div>
        )}
      </div>

      {activity.prompt && !solved && (
        <p className="mt-3 text-xs text-muted-foreground">{activity.prompt}</p>
      )}

      {solved && (
        <Alert variant="success" className="mt-3">
          Objetivo de la terminal completado.
        </Alert>
      )}
    </ActivityFrame>
  );
}
