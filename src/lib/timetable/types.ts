export const WEEKDAYS = [
  "MONDAY",
  "TUESDAY",
  "WEDNESDAY",
  "THURSDAY",
  "FRIDAY",
  "SATURDAY",
  "SUNDAY",
] as const;

export type Weekday = (typeof WEEKDAYS)[number];

export type TimetableBlock = {
  title: string;
  day: Weekday;
  hour: number;
  minute: number;
  durationMinutes: number;
  courseCode?: string;
  venue?: string;
  lecturer?: string;
  group?: number | null;
};

export function createEmptyBlock(): TimetableBlock {
  return {
    title: "",
    day: "MONDAY",
    hour: 8,
    minute: 0,
    durationMinutes: 60,
  };
}

export const COURSE_COLORS = [
  "#3b82f6", "#8b5cf6", "#ec4899", "#f59e0b",
  "#22c55e", "#ef4444", "#06b6d4", "#f97316", "#a855f7",
  "#10b981", "#e11d48", "#6366f1",
] as const;

export function assignColor(index: number): string {
  return COURSE_COLORS[index % COURSE_COLORS.length];
}
