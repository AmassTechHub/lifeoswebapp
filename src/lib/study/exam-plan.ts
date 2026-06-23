import { atTime, startOfDay } from "@/lib/date-utils";
import { prisma } from "@/lib/prisma";

const SESSION_MINUTES = 60;
const BUFFER_MINUTES = 15;
const DAY_START = 7 * 60; // 7:00 AM
const DAY_END = 22 * 60; // 10:00 PM
const MAX_PLAN_DAYS = 21;
const EXAM_TYPES = ["EXAM", "QUIZ"];

function toMins(hhmm: string): number {
  const [h, m] = hhmm.split(":").map(Number);
  return h * 60 + m;
}

// CourseSchedule.dayOfWeek: 0=Mon … 6=Sun. Date.getDay(): 0=Sun … 6=Sat.
function jsDayToCourseDay(jsDay: number): number {
  return (jsDay + 6) % 7;
}

function daysBetween(from: Date, to: Date): number {
  return Math.round(
    (startOfDay(to).getTime() - startOfDay(from).getTime()) / 86_400_000
  );
}

/** Upcoming, not-yet-completed exams/quizzes within `withinDays`. */
export async function getUpcomingExams(userId: string, withinDays = 30) {
  const now = startOfDay(new Date());
  const until = new Date(now);
  until.setDate(until.getDate() + withinDays);

  return prisma.deadline.findMany({
    where: {
      userId,
      completed: false,
      type: { in: EXAM_TYPES },
      dueDate: { gte: now, lte: until },
    },
    include: { course: { select: { id: true, name: true, color: true } } },
    orderBy: { dueDate: "asc" },
  });
}

/**
 * Exam mode: builds a study plan that concentrates on the courses with the
 * nearest exams and ramps intensity as exam day approaches. Unlike the regular
 * round-robin plan, sessions are weighted by exam proximity (sooner exam → more
 * sessions) and the daily session cap grows in the final days before an exam.
 *
 * Only courses that have an upcoming EXAM/QUIZ deadline linked to them are
 * scheduled. Created events use the "Exam:" title prefix so they never collide
 * with the regular "Study:"/"Task:" auto-blocks.
 */
export async function generateExamPlan(userId: string) {
  const now = new Date();
  const planStart = startOfDay(now);

  const exams = await prisma.deadline.findMany({
    where: {
      userId,
      completed: false,
      type: { in: EXAM_TYPES },
      dueDate: { gte: planStart },
      courseId: { not: null },
    },
    orderBy: { dueDate: "asc" },
  });

  if (exams.length === 0) {
    return { sessionsCreated: 0, examsCovered: 0, reason: "no-exams" as const };
  }

  // Nearest exam date per course.
  const courseExamDate = new Map<string, Date>();
  for (const e of exams) {
    if (e.courseId && !courseExamDate.has(e.courseId)) {
      courseExamDate.set(e.courseId, e.dueDate);
    }
  }

  const courses = await prisma.studyCourse.findMany({
    where: { userId, id: { in: [...courseExamDate.keys()] } },
    include: { scheduleSlots: true },
  });

  if (courses.length === 0) {
    return { sessionsCreated: 0, examsCovered: 0, reason: "no-course-exams" as const };
  }

  // Plan horizon: today through the last exam, capped.
  const lastExam = exams[exams.length - 1].dueDate;
  const planDays = Math.min(Math.max(daysBetween(planStart, lastExam) + 1, 3), MAX_PLAN_DAYS);
  const planEnd = new Date(planStart);
  planEnd.setDate(planEnd.getDate() + planDays);

  const existingEvents = await prisma.calendarEvent.findMany({
    where: { userId, startAt: { gte: planStart, lt: planEnd } },
  });

  // Clear previous exam-plan blocks in the window.
  await prisma.calendarEvent.deleteMany({
    where: {
      userId,
      source: "SYSTEM",
      category: "ACADEMICS",
      startAt: { gte: planStart, lt: planEnd },
      title: { startsWith: "Exam:" },
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

  // Weight by exam proximity: closer exam => higher weight. Sessions allocated
  // try to keep each course's session count proportional to its weight.
  const sessions = new Map(courses.map((c) => [c.id, 0]));

  for (let offset = 0; offset < planDays; offset++) {
    const date = new Date(planStart);
    date.setDate(date.getDate() + offset);
    const courseDay = jsDayToCourseDay(date.getDay());

    // Courses whose exam is still ahead of (or on) this day.
    const eligible = courses.filter((c) => {
      const exam = courseExamDate.get(c.id)!;
      return daysBetween(date, exam) >= 0;
    });
    if (eligible.length === 0) continue;

    // Ramp the daily cap by how close the nearest exam is.
    const nearest = Math.min(
      ...eligible.map((c) => daysBetween(date, courseExamDate.get(c.id)!))
    );
    let maxToday = nearest <= 2 ? 5 : nearest <= 5 ? 4 : 3;
    if (date.getDay() === 0) maxToday = Math.max(1, maxToday - 2); // lighter Sundays

    // Build busy intervals (classes + existing events + blocks already planned).
    const busy: [number, number][] = [];
    for (const course of courses) {
      for (const slot of course.scheduleSlots) {
        if (slot.dayOfWeek === courseDay) busy.push([toMins(slot.startTime), toMins(slot.endTime)]);
      }
    }
    const dayBoundary = startOfDay(date);
    const nextDayBoundary = new Date(dayBoundary);
    nextDayBoundary.setDate(nextDayBoundary.getDate() + 1);
    for (const ev of [...existingEvents, ...toCreate]) {
      if (ev.startAt >= dayBoundary && ev.startAt < nextDayBoundary) {
        busy.push([
          ev.startAt.getHours() * 60 + ev.startAt.getMinutes(),
          ev.endAt.getHours() * 60 + ev.endAt.getMinutes(),
        ]);
      }
    }

    busy.sort((a, b) => a[0] - b[0]);
    const merged: [number, number][] = [];
    for (const [s, e] of busy) {
      if (merged.length && s <= merged[merged.length - 1][1] + BUFFER_MINUTES) {
        merged[merged.length - 1][1] = Math.max(merged[merged.length - 1][1], e);
      } else {
        merged.push([s, e]);
      }
    }

    const freeSlots: [number, number][] = [];
    let cursor = DAY_START;
    if (offset === 0) {
      // Don't schedule into the past today.
      cursor = Math.max(cursor, now.getHours() * 60 + now.getMinutes() + 10);
    }
    for (const [bs, be] of merged) {
      if (bs - cursor >= SESSION_MINUTES) freeSlots.push([cursor, bs]);
      cursor = Math.max(cursor, be + BUFFER_MINUTES);
    }
    if (DAY_END - cursor >= SESSION_MINUTES) freeSlots.push([cursor, DAY_END]);

    let sessionsToday = 0;
    for (const [slotStart, slotEnd] of freeSlots) {
      if (sessionsToday >= maxToday) break;
      let slotCursor = slotStart;
      while (slotEnd - slotCursor >= SESSION_MINUTES && sessionsToday < maxToday) {
        // Pick the eligible course with the greatest "need": higher weight
        // (closer exam) and fewer sessions so far wins.
        const pick = [...eligible].sort((a, b) => {
          const da = Math.max(1, daysBetween(date, courseExamDate.get(a.id)!));
          const db = Math.max(1, daysBetween(date, courseExamDate.get(b.id)!));
          const needA = 1 / da - (sessions.get(a.id) ?? 0) * 0.15;
          const needB = 1 / db - (sessions.get(b.id) ?? 0) * 0.15;
          return needB - needA;
        })[0];

        const exam = courseExamDate.get(pick.id)!;
        const daysLeft = daysBetween(date, exam);
        const startAt = atTime(date, Math.floor(slotCursor / 60), slotCursor % 60);
        const endAt = new Date(startAt.getTime() + SESSION_MINUTES * 60_000);

        toCreate.push({
          userId,
          title: `Exam: ${pick.name}`,
          description: `Exam prep · ${daysLeft} day${daysLeft === 1 ? "" : "s"} to exam`,
          startAt,
          endAt,
          category: "ACADEMICS",
          source: "SYSTEM",
          studyCourseId: pick.id,
        });

        sessions.set(pick.id, (sessions.get(pick.id) ?? 0) + 1);
        slotCursor += SESSION_MINUTES + BUFFER_MINUTES;
        sessionsToday++;
      }
    }
  }

  if (toCreate.length > 0) {
    await prisma.calendarEvent.createMany({ data: toCreate });
  }

  return {
    sessionsCreated: toCreate.length,
    examsCovered: courseExamDate.size,
    reason: "ok" as const,
  };
}
