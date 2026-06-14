import type { LifeCycleType } from "@prisma/client";

import { getUserContextSummary } from "@/lib/ai/user-context";
import { markAutoBriefToday } from "@/lib/ai/coach-state";
import { buildActionQueue } from "@/lib/ai/action-queue";
import { generateDayPlan } from "@/lib/automation/generate-day";
import { startOfDay, startOfWeek } from "@/lib/date-utils";
import { linkCoursesToEntities } from "@/lib/knowledge/link-courses";
import { prisma } from "@/lib/prisma";

export type CycleResult = {
  type: LifeCycleType;
  summary: string;
  payload: Record<string, unknown>;
};

async function saveCycle(userId: string, type: LifeCycleType, date: Date, summary: string, payload: Record<string, unknown>) {
  const day = type === "WEEKLY" ? startOfWeek(date) : startOfDay(date);
  await prisma.lifeCycleLog.upsert({
    where: { userId_type_date: { userId, type, date: day } },
    create: { userId, type, date: day, summary, payload: JSON.stringify(payload) },
    update: { summary, payload: JSON.stringify(payload) },
  });
}

export async function runMorningCycle(userId: string): Promise<CycleResult> {
  const today = new Date();
  const plan = await generateDayPlan(userId, today);
  await markAutoBriefToday(userId);
  await linkCoursesToEntities(userId);

  const context = await getUserContextSummary(userId);
  const queue = buildActionQueue(context);
  const summary = `Morning: ${plan.focusItems.length} priorities, score ${plan.score}, ${context.schedule.blocksToday.length} blocks today.`;
  const payload = {
    focusCount: plan.focusItems.length,
    score: plan.score,
    nextAction: queue[0]?.title ?? null,
  };
  await saveCycle(userId, "MORNING", today, summary, payload);
  return { type: "MORNING", summary, payload };
}

export async function runEveningCycle(userId: string): Promise<CycleResult> {
  const today = startOfDay(new Date());
  const tomorrow = new Date(today);
  tomorrow.setDate(tomorrow.getDate() + 1);

  const [snapshot, incompleteTasks, habitsTotal, habitsDone] = await Promise.all([
    prisma.daySnapshot.findUnique({
      where: { userId_date: { userId, date: today } },
    }),
    prisma.task.findMany({
      where: { userId, completed: false, dueDate: { gte: today, lt: tomorrow } },
      take: 8,
    }),
    prisma.habit.count({ where: { userId } }),
    prisma.habitLog.count({
      where: {
        habit: { userId },
        date: { gte: today },
        completed: true,
      },
    }),
  ]);

  const carryForward = incompleteTasks.slice(0, 3);
  for (const task of carryForward) {
    await prisma.task.update({
      where: { id: task.id },
      data: { dueDate: tomorrow },
    });
  }

  const summary = `Evening review: score ${snapshot?.score ?? 0}, habits ${habitsDone}/${habitsTotal}, carried ${carryForward.length} task(s) to tomorrow.`;
  const payload = {
    score: snapshot?.score ?? 0,
    habitsDone,
    habitsTotal,
    carried: carryForward.map((t) => t.title),
  };
  await saveCycle(userId, "EVENING", new Date(), summary, payload);
  return { type: "EVENING", summary, payload };
}

export async function runWeeklyCycle(userId: string): Promise<CycleResult> {
  const now = new Date();
  const weekStart = startOfWeek(now);

  const [tasksDone, tasksOpen, notesUpdated, expenses] = await Promise.all([
    prisma.task.count({
      where: { userId, completed: true, updatedAt: { gte: weekStart } },
    }),
    prisma.task.count({ where: { userId, completed: false } }),
    prisma.studyNote.count({
      where: { course: { userId }, updatedAt: { gte: weekStart } },
    }),
    prisma.expense.aggregate({
      where: { userId, date: { gte: weekStart } },
      _sum: { amount: true },
    }),
  ]);

  const summary = `Weekly: ${tasksDone} tasks done, ${tasksOpen} open, ${notesUpdated} notes updated, spent ₵${Math.round(expenses._sum.amount ?? 0)}.`;
  const payload = { tasksDone, tasksOpen, notesUpdated, spent: expenses._sum.amount ?? 0 };
  await saveCycle(userId, "WEEKLY", now, summary, payload);

  // Refresh next 7 days of personal plans
  for (let i = 0; i < 7; i += 1) {
    const d = new Date(weekStart);
    d.setDate(d.getDate() + i);
    await generateDayPlan(userId, d);
  }

  return { type: "WEEKLY", summary, payload };
}

export async function getLatestCycles(userId: string) {
  const logs = await prisma.lifeCycleLog.findMany({
    where: { userId },
    orderBy: { createdAt: "desc" },
    take: 6,
  });
  return logs;
}
