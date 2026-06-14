import { startOfDay } from "@/lib/date-utils";
import { prisma } from "@/lib/prisma";

export type UserContextSummary = {
  nowIso: string;
  tasks: {
    dueToday: Array<{ id: string; title: string; category: string }>;
    overdueCount: number;
    completedToday: number;
  };
  schedule: {
    blocksToday: Array<{ id: string; title: string; startAt: string; category: string }>;
  };
  habits: {
    total: number;
    completedToday: number;
  };
  finance: {
    monthIncome: number;
    monthExpenses: number;
    net: number;
  };
  study: {
    courses: Array<{ id: string; name: string }>;
    notesUpdatedToday: number;
  };
  clients: {
    deliverablesDueSoon: Array<{ id: string; title: string; clientName: string }>;
  };
};

export async function getUserContextSummary(userId: string): Promise<UserContextSummary> {
  const now = new Date();
  const todayStart = startOfDay(now);
  const tomorrowStart = new Date(todayStart);
  tomorrowStart.setDate(tomorrowStart.getDate() + 1);
  const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
  const sevenDays = new Date(now);
  sevenDays.setDate(sevenDays.getDate() + 7);

  const [
    dueToday,
    overdueCount,
    completedToday,
    blocksToday,
    habitsTotal,
    habitsCompletedToday,
    incomeMonth,
    expensesMonth,
    courses,
    notesUpdatedToday,
    deliverablesDueSoon,
  ] = await Promise.all([
    prisma.task.findMany({
      where: {
        userId,
        completed: false,
        dueDate: { gte: todayStart, lt: tomorrowStart },
      },
      select: { id: true, title: true, category: true },
      orderBy: { dueDate: "asc" },
      take: 6,
    }),
    prisma.task.count({
      where: {
        userId,
        completed: false,
        dueDate: { lt: todayStart },
      },
    }),
    prisma.task.count({
      where: {
        userId,
        completed: true,
        updatedAt: { gte: todayStart, lt: tomorrowStart },
      },
    }),
    prisma.calendarEvent.findMany({
      where: {
        userId,
        startAt: { gte: todayStart, lt: tomorrowStart },
      },
      select: { id: true, title: true, startAt: true, category: true },
      orderBy: { startAt: "asc" },
      take: 10,
    }),
    prisma.habit.count({ where: { userId } }),
    prisma.habitLog.count({
      where: {
        habit: { userId },
        date: { gte: todayStart, lt: tomorrowStart },
        completed: true,
      },
    }),
    prisma.income.aggregate({
      where: { userId, date: { gte: monthStart } },
      _sum: { amount: true },
    }),
    prisma.expense.aggregate({
      where: { userId, date: { gte: monthStart } },
      _sum: { amount: true },
    }),
    prisma.studyCourse.findMany({
      where: { userId },
      select: { id: true, name: true },
      orderBy: { updatedAt: "desc" },
      take: 5,
    }),
    prisma.studyNote.count({
      where: {
        course: { userId },
        updatedAt: { gte: todayStart, lt: tomorrowStart },
      },
    }),
    prisma.clientDeliverable.findMany({
      where: {
        client: { userId },
        status: { not: "DONE" },
        dueDate: { gte: todayStart, lte: sevenDays },
      },
      include: { client: { select: { name: true } } },
      orderBy: { dueDate: "asc" },
      take: 4,
    }),
  ]);

  const monthIncome = incomeMonth._sum.amount ?? 0;
  const monthExpenses = expensesMonth._sum.amount ?? 0;

  return {
    nowIso: now.toISOString(),
    tasks: {
      dueToday,
      overdueCount,
      completedToday,
    },
    schedule: {
      blocksToday: blocksToday.map((event) => ({
        id: event.id,
        title: event.title,
        startAt: event.startAt.toISOString(),
        category: event.category,
      })),
    },
    habits: {
      total: habitsTotal,
      completedToday: habitsCompletedToday,
    },
    finance: {
      monthIncome,
      monthExpenses,
      net: monthIncome - monthExpenses,
    },
    study: {
      courses,
      notesUpdatedToday,
    },
    clients: {
      deliverablesDueSoon: deliverablesDueSoon.map((item) => ({
        id: item.id,
        title: item.title,
        clientName: item.client.name,
      })),
    },
  };
}
