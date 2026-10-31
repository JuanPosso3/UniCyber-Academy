import type {
  LabActivity,
  LabContent,
  LessonContent,
  TheoryContent,
} from "../types/lesson";

export interface LeafActivity {
  activity: LabActivity;
  required: boolean;
}

export function isTheoryContent(
  content: LessonContent,
): content is TheoryContent {
  return "blocks" in content && Array.isArray(content.blocks);
}

export function isLabContent(content: LessonContent): content is LabContent {
  return "activities" in content && Array.isArray(content.activities);
}

export function collectLeafActivities(
  activities: readonly LabActivity[],
  inheritedRequired = true,
): LeafActivity[] {
  const result: LeafActivity[] = [];

  for (const activity of activities) {
    const required = inheritedRequired && activity.required !== false;

    if (activity.type === "CHAINED") {
      result.push(...collectLeafActivities(activity.activities, required));
    } else {
      result.push({ activity, required });
    }
  }

  return result;
}

export function getRequiredLeafActivities(content: LabContent): LeafActivity[] {
  const leaves = collectLeafActivities(content.activities);
  const explicit = content.completion?.requiredActivityIds;

  if (explicit && explicit.length > 0) {
    return leaves.filter((leaf) => explicit.includes(leaf.activity.id));
  }

  const required = leaves.filter((leaf) => leaf.required);
  return required.length > 0 ? required : leaves;
}
