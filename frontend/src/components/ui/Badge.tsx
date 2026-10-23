import type { HTMLAttributes, ReactNode } from "react";
import { cn } from "../../lib/utils";

export type BadgeColor =
  | "blue"
  | "cyan"
  | "green"
  | "yellow"
  | "red"
  | "purple"
  | "gray";

export interface BadgeProps extends HTMLAttributes<HTMLSpanElement> {
  color?: BadgeColor;
  children: ReactNode;
}

const colorClasses: Record<BadgeColor, string> = {
  blue: "bg-primary/15 text-primary border-primary/20",
  cyan: "bg-accent/15 text-accent border-accent/20",
  green: "bg-success/15 text-success border-success/20",
  yellow: "bg-warning/15 text-warning border-warning/20",
  red: "bg-destructive/15 text-destructive border-destructive/20",
  purple: "bg-purple/15 text-purple border-purple/20",
  gray: "bg-white/5 text-muted-foreground border-border",
};

export function Badge({
  color = "blue",
  className = "",
  children,
  ...rest
}: BadgeProps) {
  return (
    <span
      className={cn(
        "inline-flex items-center px-2 py-0.5 rounded-lg text-xs font-medium border",
        colorClasses[color],
        className,
      )}
      {...rest}
    >
      {children}
    </span>
  );
}
