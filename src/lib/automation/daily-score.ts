import type { EventCategory, TaskCategory } from "@prisma/client";

export type ScoreBreakdown = {
  label: string;
  value: number;
  color: string;
};

type ScoreInput = {
  tasksDueToday: number;
  tasksDoneToday: number;
  habitsTotal: number;
  habitsDoneToday: number;
  studyNotesToday: number;
  contentActive: number;
  contentAdvancedToday: number;
  clientDeliverablesDue: number;
  clientDeliverablesDone: number;
  eventsToday: number;
};

export function computeDailyScore(input: ScoreInput): {
  average: number;
  breakdown: ScoreBreakdown[];
} {
  const pct = (done: number, total: number) =>
    total <= 0 ? (done > 0 ? 100 : 50) : Math.round((done / total) * 100);

  const spiritual = pct(input.habitsDoneToday, Math.max(input.habitsTotal, 1));
  const academics = pct(
    input.tasksDoneToday + input.studyNotesToday,
    Math.max(input.tasksDueToday + 2, 1)
  );
  const coding = pct(
    input.tasksDoneToday,
    Math.max(input.tasksDueToday || 1, 1)
  );
  const business = pct(
    input.clientDeliverablesDone,
    Math.max(input.clientDeliverablesDue, 1)
  );
  const health = pct(input.eventsToday > 0 ? 1 : 0, 1);

  const breakdown: ScoreBreakdown[] = [
    { label: "Spiritual", value: spiritual, color: "text-success" },
    { label: "Academics", value: academics, color: "text-accent" },
    { label: "Coding", value: coding, color: "text-accent" },
    { label: "Business", value: business, color: "text-warning" },
    { label: "Health", value: health, color: "text-success" },
  ];

  const average = Math.round(
    breakdown.reduce((s, b) => s + b.value, 0) / breakdown.length
  );

  return { average, breakdown };
}

export function taskCategoryToEventCategory(
  category: TaskCategory
): EventCategory {
  const map: Record<TaskCategory, EventCategory> = {
    ACADEMICS: "ACADEMICS",
    CODING: "CODING",
    CONTENT: "CONTENT",
    CLIENTS: "CLIENTS",
    PERSONAL: "PERSONAL",
  };
  return map[category];
}
