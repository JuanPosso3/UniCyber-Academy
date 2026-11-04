export interface ProgressBarProps {
  value: number;
  label?: string;
  showValue?: boolean;
}

export function ProgressBar({
  value,
  label = "Progreso del curso",
  showValue = true,
}: ProgressBarProps) {
  const safeValue = Math.max(0, Math.min(100, Math.round(value)));

  return (
    <div>
      <div className="mb-1.5 flex items-center justify-between gap-3">
        <span className="text-xs font-semibold text-muted-foreground">
          {label}
        </span>
        {showValue && (
          <span className="text-xs font-bold text-white">{safeValue}%</span>
        )}
      </div>
      <div
        role="progressbar"
        aria-valuemin={0}
        aria-valuemax={100}
        aria-valuenow={safeValue}
        aria-label={label}
        className="h-2 overflow-hidden rounded-full bg-white/10"
      >
        <div
          className="h-full rounded-full bg-gradient-to-r from-primary to-accent transition-all duration-500"
          style={{ width: `${safeValue}%` }}
        />
      </div>
    </div>
  );
}
