import { addMinutes, atTime } from "@/lib/date-utils";

type TimeRange = { startAt: Date; endAt: Date };

function overlaps(start: Date, end: Date, ranges: TimeRange[]) {
  return ranges.some((r) => start < r.endAt && end > r.startAt);
}

/** Find first hour slot (on the hour) that does not overlap occupied ranges. */
export function findFreeHourSlot(
  baseDate: Date,
  fromHour: number,
  durationMinutes: number,
  occupied: TimeRange[],
  latestHour = 21
): { startAt: Date; endAt: Date } | null {
  for (let hour = fromHour; hour <= latestHour; hour += 1) {
    const startAt = atTime(baseDate, hour, 0);
    const endAt = addMinutes(startAt, durationMinutes);
    if (!overlaps(startAt, endAt, occupied)) {
      return { startAt, endAt };
    }
  }
  return null;
}
