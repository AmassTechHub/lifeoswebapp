import type { EventCategory } from "@prisma/client";

import { computeDailyScore, taskCategoryToEventCategory } from "@/lib/automation/daily-score";
import { findFreeHourSlot } from "@/lib/automation/slot-finder";
import { addMinutes, atTime, endOfDay, startOfDay } from "@/lib/date-utils";
import { prisma } from "@/lib/prisma";

type Block = {
  title: string;
  startAt: Date;
  endAt: Date;
  category: EventCategory;
  source: "SYSTEM" | "TIMETABLE";
};

export async function generateDayPlan(userId: string, baseDate = new Date()) {
  const dayStart = startOfDay(baseDate);
  const dayEnd = endOfDay(baseDate);

  const [
    tasksDue,
    tasksDoneToday,
    habits,
    habitLogsToday,
    studyNotesToday,
    contentPipeline,
    deliverablesDue,
    deliverablesDone,
    existingManual,
    timetableToday,
  ] = await Promise.all([
    prisma.task.findMany({
      where: {
        userId,
        completed: false,
        dueDate: { gte: dayStart, lt: dayEnd },
      },
      orderBy: { dueDate: "asc" },
      take: 8,
    }),
    prisma.task.count({
      where: {
        userId,
        completed: true,
        updatedAt: { gte: dayStart, lt: dayEnd },
      },
    }),
    prisma.habit.findMany({ where: { userId } }),
    prisma.habitLog.count({
      where: {
        habit: { userId },
        date: { gte: dayStart, lt: dayEnd },
        completed: true,
      },
    }),
    prisma.studyNote.count({
      where: {
        course: { userId },
        updatedAt: { gte: dayStart, lt: dayEnd },
      },
    }),
    prisma.contentItem.findMany({
      where: {
        userId,
        stage: { in: ["SCRIPT", "RECORDING", "EDITING"] },
      },
      take: 3,
    }),
    prisma.clientDeliverable.findMany({
      where: {
        client: { userId },
        status: { not: "DONE" },
        dueDate: { gte: dayStart, lt: addMinutes(dayEnd, 24 * 60) },
      },
      include: { client: { select: { name: true } } },
      take: 5,
    }),
    prisma.clientDeliverable.count({
      where: {
        client: { userId },
        status: "DONE",
        updatedAt: { gte: dayStart, lt: dayEnd },
      },
    }),
    prisma.calendarEvent.count({
      where: {
        userId,
        startAt: { gte: dayStart, lt: dayEnd },
        source: "MANUAL",
      },
    }),
    prisma.calendarEvent.findMany({
      where: {
        userId,
        source: "TIMETABLE",
        startAt: { gte: dayStart, lt: dayEnd },
      },
      orderBy: { startAt: "asc" },
      select: { startAt: true, endAt: true },
    }),
  ]);

  // If a snapshot AND SYSTEM events already exist (concurrent request already ran), skip
  const [existingSnap, existingSystem] = await Promise.all([
    prisma.daySnapshot.findUnique({ where: { userId_date: { userId, date: dayStart } } }),
    prisma.calendarEvent.count({ where: { userId, source: "SYSTEM", startAt: { gte: dayStart, lt: dayEnd } } }),
  ]);
  if (existingSnap && existingSystem > 0) {
    const events = await prisma.calendarEvent.findMany({
      where: { userId, startAt: { gte: dayStart, lt: dayEnd } },
      orderBy: { startAt: "asc" },
    });
    return {
      events,
      focusItems: JSON.parse(existingSnap.focusJson ?? "[]"),
      score: existingSnap.score,
      breakdown: JSON.parse(existingSnap.breakdown ?? "{}"),
    };
  }

  await prisma.calendarEvent.deleteMany({
    where: {
      userId,
      source: "SYSTEM",
      startAt: { gte: dayStart, lt: dayEnd },
    },
  });

  const blocks: Block[] = [
    {
      title: "Morning devotion & plan the day",
      startAt: atTime(baseDate, 6, 0),
      endAt: atTime(baseDate, 6, 45),
      category: "PERSONAL",
      source: "SYSTEM",
    },
  ];

  const occupied = [
    ...timetableToday,
    ...blocks.map((b) => ({ startAt: b.startAt, endAt: b.endAt })),
  ];

  let slotHour = 8;
  for (const task of tasksDue.slice(0, 4)) {
    const slot = findFreeHourSlot(baseDate, slotHour, 60, occupied, 17);
    if (!slot) break;
    blocks.push({
      title: task.title,
      startAt: slot.startAt,
      endAt: slot.endAt,
      category: taskCategoryToEventCategory(task.category),
      source: "SYSTEM",
    });
    occupied.push(slot);
    slotHour = slot.startAt.getHours() + 1;
  }

  for (const d of deliverablesDue.slice(0, 2)) {
    const slot = findFreeHourSlot(baseDate, Math.min(slotHour, 16), 90, occupied, 17);
    if (!slot) break;
    blocks.push({
      title: `${d.client.name}: ${d.title}`,
      startAt: slot.startAt,
      endAt: slot.endAt,
      category: "CLIENTS",
      source: "SYSTEM",
    });
    occupied.push(slot);
    slotHour = slot.startAt.getHours() + 2;
  }

  if (contentPipeline[0]) {
    const slot = findFreeHourSlot(baseDate, 18, 120, occupied, 20);
    if (slot) {
      blocks.push({
        title: `Content: ${contentPipeline[0].title}`,
        startAt: slot.startAt,
        endAt: slot.endAt,
        category: "CONTENT",
        source: "SYSTEM",
      });
      occupied.push(slot);
    }
  }

  const studyCourse = await prisma.studyCourse.findFirst({
    where: { userId },
    orderBy: { updatedAt: "desc" },
  });
  if (studyCourse) {
    const slot = findFreeHourSlot(baseDate, 15, 60, occupied, 17);
    if (slot) {
      blocks.push({
        title: `Study: ${studyCourse.name}`,
        startAt: slot.startAt,
        endAt: slot.endAt,
        category: "ACADEMICS",
        source: "SYSTEM",
      });
      occupied.push(slot);
    }
  }

  blocks.push({
    title: "Daily review & tomorrow prep",
    startAt: atTime(baseDate, 21, 0),
    endAt: atTime(baseDate, 21, 30),
    category: "PERSONAL",
    source: "SYSTEM",
  });

  if (blocks.length > 0) {
    await prisma.calendarEvent.createMany({
      data: blocks.map((b) => ({
        userId,
        title: b.title,
        startAt: b.startAt,
        endAt: b.endAt,
        category: b.category,
        source: b.source,
      })),
    });
  }

  const focusItems =
    tasksDue.length > 0
      ? tasksDue.slice(0, 5).map((t) => ({
          id: t.id,
          title: t.title,
          category: t.category,
        }))
      : deliverablesDue.length > 0
        ? deliverablesDue.slice(0, 3).map((d) => ({
            id: d.id,
            title: `${d.client.name}: ${d.title}`,
            category: "CLIENTS" as const,
          }))
        : contentPipeline.length > 0
          ? [
              {
                id: contentPipeline[0].id,
                title: `Move content: ${contentPipeline[0].title}`,
                category: "CONTENT" as const,
              },
            ]
          : [
              {
                id: "setup",
                title: "Add tasks, habits, or calendar events, then run daily setup again",
                category: "PERSONAL" as const,
              },
            ];

  const { average, breakdown } = computeDailyScore({
    tasksDueToday: tasksDue.length,
    tasksDoneToday: tasksDoneToday,
    habitsTotal: habits.length,
    habitsDoneToday: habitLogsToday,
    studyNotesToday,
    contentActive: contentPipeline.length,
    contentAdvancedToday: 0,
    clientDeliverablesDue: deliverablesDue.length,
    clientDeliverablesDone: deliverablesDone,
    eventsToday: existingManual + blocks.length,
  });

  await prisma.daySnapshot.upsert({
    where: {
      userId_date: { userId, date: dayStart },
    },
    create: {
      userId,
      date: dayStart,
      score: average,
      breakdown: JSON.stringify(breakdown),
      focusJson: JSON.stringify(focusItems),
    },
    update: {
      score: average,
      breakdown: JSON.stringify(breakdown),
      focusJson: JSON.stringify(focusItems),
    },
  });

  const events = await prisma.calendarEvent.findMany({
    where: { userId, startAt: { gte: dayStart, lt: dayEnd } },
    orderBy: { startAt: "asc" },
  });

  return { events, focusItems, score: average, breakdown };
}

export async function getTodaySchedule(userId: string) {
  const now = new Date();
  const dayStart = startOfDay(now);
  const dayEnd = endOfDay(now);

  const events = await prisma.calendarEvent.findMany({
    where: { userId, startAt: { gte: dayStart, lt: dayEnd } },
    orderBy: { startAt: "asc" },
  });

  // Deduplicate by title+startAt in case of stale duplicates in DB
  const seen = new Set<string>();
  return events.filter((e) => {
    const key = `${e.title}|${e.startAt.toISOString()}`;
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

export async function getUpcomingDeadlines(userId: string) {
  const now = new Date();
  const horizon = addMinutes(now, 14 * 24 * 60);

  const [tasks, deliverables] = await Promise.all([
    prisma.task.findMany({
      where: {
        userId,
        completed: false,
        dueDate: { gte: startOfDay(now), lte: horizon },
      },
      orderBy: { dueDate: "asc" },
      take: 8,
    }),
    prisma.clientDeliverable.findMany({
      where: {
        client: { userId },
        status: { not: "DONE" },
        dueDate: { gte: startOfDay(now), lte: horizon },
      },
      include: { client: { select: { name: true } } },
      orderBy: { dueDate: "asc" },
      take: 6,
    }),
  ]);

  type Deadline = {
    id: string;
    title: string;
    category: string;
    due: string;
    variant: "danger" | "warning" | "default";
    href: string;
  };

  const items: Deadline[] = [];

  for (const t of tasks) {
    if (!t.dueDate) continue;
    const dueDay = startOfDay(t.dueDate);
    const today = startOfDay(now);
    const diff = Math.round((dueDay.getTime() - today.getTime()) / 86_400_000);
    items.push({
      id: t.id,
      title: t.title,
      category: t.category,
      due: formatDue(t.dueDate, now),
      variant: diff <= 0 ? "danger" : diff === 1 ? "warning" : "default",
      href: "/tasks",
    });
  }

  for (const d of deliverables) {
    if (!d.dueDate) continue;
    const dueDay = startOfDay(d.dueDate);
    const today = startOfDay(now);
    const diff = Math.round((dueDay.getTime() - today.getTime()) / 86_400_000);
    items.push({
      id: d.id,
      title: `${d.client.name}: ${d.title}`,
      category: "Clients",
      due: formatDue(d.dueDate, now),
      variant: diff <= 0 ? "danger" : diff === 1 ? "warning" : "default",
      href: "/clients",
    });
  }

  return items.sort((a, b) => a.due.localeCompare(b.due)).slice(0, 8);
}

function formatDue(due: Date, now: Date) {
  const today = startOfDay(now);
  const dueDay = startOfDay(due);
  const diff = Math.round((dueDay.getTime() - today.getTime()) / 86_400_000);
  if (diff === 0) return "Today";
  if (diff === 1) return "Tomorrow";
  return due.toLocaleDateString("en-US", { month: "short", day: "numeric" });
}
