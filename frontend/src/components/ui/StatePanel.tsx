import type { ReactNode } from "react";
import { AlertTriangle, Inbox } from "lucide-react";
import { cn } from "../../lib/utils";

export type StatePanelVariant = "loading" | "empty" | "error";

export interface StatePanelProps {
  variant: StatePanelVariant;
  title: string;
  description?: string;
  action?: ReactNode;
  className?: string;
}

export function StatePanel({
  variant,
  title,
  description,
  action,
  className = "",
}: StatePanelProps) {
  return (
    <div
      role={variant === "error" ? "alert" : "status"}
      className={cn(
        "flex flex-col items-center justify-center rounded-2xl border border-border bg-card px-6 py-10 text-center",
        className,
      )}
    >
      {variant === "loading" ? (
        <span
          className="mb-3 h-6 w-6 animate-spin rounded-full border-2 border-primary border-t-transparent"
          aria-hidden="true"
        />
      ) : variant === "error" ? (
        <AlertTriangle
          size={24}
          className="mb-3 text-destructive"
          aria-hidden="true"
        />
      ) : (
        <Inbox
          size={24}
          className="mb-3 text-muted-foreground"
          aria-hidden="true"
        />
      )}
      <p className="text-sm font-semibold text-white">{title}</p>
      {description && (
        <p className="mt-1 max-w-lg text-xs text-muted-foreground">
          {description}
        </p>
      )}
      {action && <div className="mt-4">{action}</div>}
    </div>
  );
}
