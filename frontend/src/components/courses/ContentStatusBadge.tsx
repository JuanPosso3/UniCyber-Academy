import { Badge, type BadgeColor } from "../ui/Badge";
import type { ContentStatus } from "../../types/course";

const STATUS_CONFIG: Record<
  ContentStatus,
  { label: string; color: BadgeColor }
> = {
  DRAFT: { label: "Borrador", color: "yellow" },
  ACTIVE: { label: "Publicado", color: "green" },
  ARCHIVED: { label: "Archivado", color: "gray" },
};

export function ContentStatusBadge({
  status,
}: {
  status: ContentStatus;
}) {
  const config = STATUS_CONFIG[status];

  return <Badge color={config.color}>{config.label}</Badge>;
}
