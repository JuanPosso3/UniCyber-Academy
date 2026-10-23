import { cn } from "../../lib/utils";

export type AvatarSize = "xs" | "sm" | "md" | "lg";

export interface AvatarProps {
  name: string;
  size?: AvatarSize;
  className?: string;
}

const sizeClasses: Record<AvatarSize, string> = {
  xs: "w-7 h-7 text-xs",
  sm: "w-8 h-8 text-xs",
  md: "w-9 h-9 text-sm",
  lg: "w-14 h-14 text-xl",
};

function getInitial(name: string): string {
  const trimmed = name.trim();
  return trimmed ? trimmed.charAt(0).toUpperCase() : "?";
}

export function Avatar({
  name,
  size = "md",
  className = "",
}: AvatarProps) {
  return (
    <div
      role="img"
      aria-label={name}
      className={cn(
        "rounded-full flex items-center justify-center font-bold text-white flex-shrink-0",
        sizeClasses[size],
        className,
      )}
      style={{ background: "var(--primary)" }}
    >
      {getInitial(name)}
    </div>
  );
}
