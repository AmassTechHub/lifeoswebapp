import { atTime, startOfDay } from "@/lib/date-utils";
import { prisma } from "@/lib/prisma";

const SESSION_MINUTES = 60;
const BUFFER_MINUTES = 15;
const MAX_PER_DAY = 3;
const PLAN_DAYS = 7;
const DAY_START = 7 * 60;   // 7:00 AM
const DAY_END   = 22 * 60;  // 10:00 PM

function toMins(hhmm: string): number {
  const [h, m] = hhmm.split(":").map(Number);
  return h * 60 + m;
}

// CourseSchedule.dayOfWeek: 0=Mon … 6=Sun (matches apply.ts)
// Date.getDay():             0=Sun, 1=Mon … 6=Sat
function jsDayToCourseDay(jsDay: number): number {
  return (jsDay + 6) % 7;
}

export async function generateStudyPlan(userId: string) {
  const today = new Date();
  const planStart = startOfDay(today);
  const planEnd = new Date(planStart);
  planEnd.setDate(planEnd.getDate() + PLAN_DAYS);

  const [courses, existingEvents] = await Promise.all([
    prisma.studyCourse.findMany({
      where: { userId },
      include: { scheduleSlots: true },
    }),
    prisma.calendarEvent.findMany({
      where: { userId, startAt: { gte: planStart, lt: planEnd } },
    }),
  ]);

  if (courses.length === 0) return { sessionsCreated: 0 };

  // Remove old auto-generated study plan events
  await prisma.calendarEvent.deleteMany({
    where: {
      userId,
      source: "SYSTEM",
      category: "ACADEMICS",
      startAt: { gte: planStart, lt: planEnd },
      title: { startsWith: "Study:" },
    },
  });

  const toCreate: {
    userId: string;
    title: string;
    description: string;
    startAt: Date;
    endAt: Date;
    category: "ACADEMICS";
    source: "SYSTEM";
    studyCourseId: string;
  }[] = [];

  // Track how many sessions each course already has in this plan
  const courseSessions = new Map(courses.map((c) => [c.id, 0]));
  // Courses rotate round-robin across the week
  let courseRotation = 0;

  for (let offset = 0; offset < PLAN_DAYS; offset++) {
    const date = new Date(planStart);
    date.setDate(date.getDate() + offset);
    const courseDay = jsDayToCourseDay(date.getDay());

    // Build busy intervals for this day (minutes from midnight)
    const busy: [number, number][] = [];

    for (const course of courses) {
      for (const slot of course.scheduleSlots) {
        if (slot.dayOfWeek === courseDay) {
          busy.push([toMins(slot.startTime), toMins(slot.endTime)]);
        }
      }
    }

    const dayBoundary = startOfDay(date);
    const nextDayBoundary = new Date(dayBoundary);
    nextDayBoundary.setDate(nextDayBoundary.getDate() + 1);

    for (const ev of existingEvents) {
      if (ev.startAt >= dayBoundary && ev.startAt < nextDayBoundary) {
        const s = ev.startAt.getHours() * 60 + ev.startAt.getMinutes();
        const e = ev.endAt.getHours() * 60 + ev.endAt.getMinutes();
        busy.push([s, e]);
      }
    }

    // Sort and merge busy intervals
    busy.sort((a, b) => a[0] - b[0]);
    const merged: [number, number][] = [];
    for (const [s, e] of busy) {
      if (merged.length && s <= merged[merged.length - 1][1] + BUFFER_MINUTES) {
        merged[merged.length - 1][1] = Math.max(merged[merged.length - 1][1], e);
      } else {
        merged.push([s, e]);
      }
    }

    // Find free slots within the study window
    const freeSlots: [number, number][] = [];
    let cursor = DAY_START;
    for (const [busyStart, busyEnd] of merged) {
      if (busyStart - cursor >= SESSION_MINUTES) {
        freeSlots.push([cursor, busyStart]);
      }
      cursor = Math.max(cursor, busyEnd + BUFFER_MINUTES);
    }
    if (DAY_END - cursor >= SESSION_MINUTES) {
      freeSlots.push([cursor, DAY_END]);
    }

    // Sunday: max 1 session
    const maxToday = date.getDay() === 0 ? 1 : MAX_PER_DAY;

    let sessionsToday = 0;
    for (const [slotStart, slotEnd] of freeSlots) {
      if (sessionsToday >= maxToday) break;

      let slotCursor = slotStart;
      while (slotEnd - slotCursor >= SESSION_MINUTES && sessionsToday < maxToday) {
        // Pick the course with fewest sessions so far, rotated
        const sorted = [...courses].sort((a, b) => {
          const diff = (courseSessions.get(a.id) ?? 0) - (courseSessions.get(b.id) ?? 0);
          if (diff !== 0) return diff;
          // Tiebreak: prefer course with class on next courseDay
          const nextDay = (courseDay + 1) % 7;
          const aHasClass = a.scheduleSlots.some((s) => s.dayOfWeek === nextDay) ? -1 : 0;
          const bHasClass = b.scheduleSlots.some((s) => s.dayOfWeek === nextDay) ? -1 : 0;
          return aHasClass - bHasClass;
        });

        const course = sorted[courseRotation % sorted.length];
        courseRotation++;

        const startAt = atTime(date, Math.floor(slotCursor / 60), slotCursor % 60);
        const endAt = new Date(startAt.getTime() + SESSION_MINUTES * 60_000);

        toCreate.push({
          userId,
          title: `Study: ${course.name}`,
          description: `${SESSION_MINUTES}-min study session`,
          startAt,
          endAt,
          category: "ACADEMICS",
          source: "SYSTEM",
          studyCourseId: course.id,
        });

        courseSessions.set(course.id, (courseSessions.get(course.id) ?? 0) + 1);
        slotCursor += SESSION_MINUTES + BUFFER_MINUTES;
        sessionsToday++;
      }
    }
  }

  if (toCreate.length > 0) {
    await prisma.calendarEvent.createMany({ data: toCreate });
  }

  return { sessionsCreated: toCreate.length };
}
