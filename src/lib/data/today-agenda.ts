import { startOfDay } from "@/lib/date-utils";
import { prisma } from "@/lib/prisma";
import { getCoursesToday } from "@/lib/study/today";

export type AgendaKind = "task" | "class" | "deadline" | "client";

export type AgendaItem = {
  id: string;
  kind: AgendaKind;
  title: string;
  sub?: string; // course code, client name, category, venue, etc.
  time?: string; // "HH:MM" for timed items (classes)
  href: string; // where tapping the row takes you
};

export type TodayAgenda = {
  overdue: AgendaItem[]; // the "don't forget" pile — anything past due
  today: AgendaItem[]; // what's due / happening today
  counts: { overdue: number; today: number };
};

/**
 * Pulls everything time-sensitive across the user's roles (tasks, classes,
 * deadlines, client deliverables) into one prioritised agenda. This is the
 * brain behind the focused home screen: "what do I do today, and what did I
 * forget?" — so nothing slips through across content/school/design/client work.
 */
export async function getTodayAgenda(userId: string): Promise<TodayAgenda> {
  const now = new Date();
  const todayStart = startOfDay(now);
  const tomorrow = new Date(todayStart);
  tomorrow.setDate(tomorrow.getDate() + 1);

  const [
    overdueTasks,
    todayTasks,
    classesToday,
    deadlines,
    deliverables,
  ] = await Promise.all([
    prisma.task.findMany({
      where: { userId, completed: false, dueDate: { lt: todayStart } },
      orderBy: { dueDate: "asc" },
      take: 8,
    }),
    prisma.task.findMany({
      where: { userId, completed: false, dueDate: { gte: todayStart, lt: tomorrow } },
      orderBy: { dueDate: "asc" },
      take: 10,
    }),
    getCoursesToday(userId, now),
    prisma.deadline.findMany({
      where: { userId, completed: false, dueDate: { lt: tomorrow } },
      include: { course: { select: { name: true } } },
      orderBy: { dueDate: "asc" },
      take: 12,
    }),
    prisma.clientDeliverable.findMany({
      where: { client: { userId }, status: { not: "DONE" }, dueDate: { lt: tomorrow } },
      include: { client: { select: { name: true } } },
      orderBy: { dueDate: "asc" },
      take: 12,
    }),
  ]);

  const overdue: AgendaItem[] = [];
  const today: AgendaItem[] = [];

  // Tasks
  for (const t of overdueTasks) {
    overdue.push({ id: `task-${t.id}`, kind: "task", title: t.title, sub: prettyCategory(t.category), href: "/tasks" });
  }
  for (const t of todayTasks) {
    today.push({ id: `task-${t.id}`, kind: "task", title: t.title, sub: prettyCategory(t.category), href: "/tasks" });
  }

  // Classes today (always "today", carry their start time)
  for (const c of classesToday) {
    today.push({
      id: `class-${c.id}-${c.startTime}`,
      kind: "class",
      title: c.name,
      sub: [c.code, c.venue].filter(Boolean).join(" · ") || undefined,
      time: c.startTime,
      href: "/learning",
    });
  }

  // Deadlines (exams, assignments, projects…)
  for (const d of deadlines) {
    const item: AgendaItem = {
      id: `deadline-${d.id}`,
      kind: "deadline",
      title: d.title,
      sub: [prettyCategory(d.type), d.course?.name].filter(Boolean).join(" · ") || undefined,
      href: "/deadlines",
    };
    (d.dueDate < todayStart ? overdue : today).push(item);
  }

  // Client deliverables
  for (const dv of deliverables) {
    const item: AgendaItem = {
      id: `client-${dv.id}`,
      kind: "client",
      title: dv.title,
      sub: dv.client.name,
      href: "/clients",
    };
    ((dv.dueDate && dv.dueDate < todayStart) ? overdue : today).push(item);
  }

  // Timed items (classes) float to the top of "today", ordered by start time.
  today.sort((a, b) => {
    if (a.time && b.time) return a.time.localeCompare(b.time);
    if (a.time) return -1;
    if (b.time) return 1;
    return kindRank(a.kind) - kindRank(b.kind);
  });

  return { overdue, today, counts: { overdue: overdue.length, today: today.length } };
}

function kindRank(kind: AgendaKind): number {
  return { class: 0, deadline: 1, client: 2, task: 3 }[kind];
}

function prettyCategory(value: string): string {
  return value.charAt(0) + value.slice(1).toLowerCase();
}
