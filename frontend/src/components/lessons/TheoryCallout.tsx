import {
  AlertTriangle,
  CheckCircle2,
  Info,
  Lightbulb,
  XCircle,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";
import { InlineText } from "./InlineText";
import type { CalloutVariant } from "../../types/lesson";

const CALLOUT_CONFIG: Record<
  CalloutVariant,
  { label: string; classes: string; Icon: LucideIcon }
> = {
  IMPORTANT: {
    label: "Importante",
    classes: "border-primary/25 bg-primary/10 text-primary",
    Icon: Info,
  },
  WARNING: {
    label: "Advertencia",
    classes: "border-warning/25 bg-warning/10 text-warning",
    Icon: AlertTriangle,
  },
  TIP: {
    label: "Consejo",
    classes: "border-accent/25 bg-accent/10 text-accent",
    Icon: Lightbulb,
  },
  COMMON_MISTAKE: {
    label: "Error frecuente",
    classes: "border-destructive/25 bg-destructive/10 text-destructive",
    Icon: XCircle,
  },
  INFO: {
    label: "Información",
    classes: "border-border-strong bg-white/5 text-muted-foreground",
    Icon: CheckCircle2,
  },
};

export function TheoryCallout({
  variant,
  content,
}: {
  variant: CalloutVariant;
  content: string;
}) {
  const config = CALLOUT_CONFIG[variant] ?? CALLOUT_CONFIG.INFO;
  const Icon = config.Icon;

  return (
    <div className={`rounded-2xl border p-4 ${config.classes}`}>
      <div className="mb-1 flex items-center gap-2 text-xs font-bold uppercase tracking-wide">
        <Icon size={15} aria-hidden="true" />
        {config.label}
      </div>
      <p className="text-sm leading-7 text-foreground">
        <InlineText text={content} />
      </p>
    </div>
  );
}
