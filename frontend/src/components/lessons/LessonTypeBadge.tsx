import { FlaskConical, BookOpen } from "lucide-react";
import { Badge } from "../ui/Badge";
import type { LessonType } from "../../types/lesson";

export function LessonTypeBadge({ type }: { type: LessonType }) {
  if (type === "LABORATORY") {
    return (
      <Badge color="purple">
        <FlaskConical size={11} className="mr-1" aria-hidden="true" />
        Laboratorio
      </Badge>
    );
  }

  return (
    <Badge color="blue">
      <BookOpen size={11} className="mr-1" aria-hidden="true" />
      Teoría
    </Badge>
  );
}
