import { computeDailyScore } from "@/lib/automation/daily-score";
import { getUpcomingDeadlines, getTodaySchedule } from "@/lib/automation/generate-day";
import { endOfDay, startOfDay, startOfMonth, startOfWeek } from "@/lib/date-utils";
import { prisma } from "@/lib/prisma";
import { getCoursesToday, getFlashcardsDueCount } from "@/lib/study/today";

export async function getDashboardData(userId: string) {
  const now = new Date();
  const weekStart = startOfWeek(now);
  const monthStart = startOfMonth(now);
  const todayStart = startOfDay(now);
  const tomorrow = endOfDay(now);

  const [
    tasksDueToday,
    tasksWeekCompleted,
    tasksWeekTotal,
    habits,
    habitLogsToday,
    expensesMonth,
    incomeMonth,
    studyCourses,
    recentNotes,
    snapshot,
    schedule,
    deadlines,
    coursesToday,
    flashcardsDue,
  ] = await Promise.all([
    prisma.task.findMany({
      where: {
        userId,
        completed: false,
        OR: [
          { dueDate: { gte: todayStart, lt: tomorrow } },
          { dueDate: null, category: "ACADEMICS" },
        ],
      },
      orderBy: { dueDate: "asc" },
      take: 6,
    }),
    prisma.task.count({
      where: {
        userId,
        completed: true,
        updatedAt: { gte: weekStart },
      },
    }),
    prisma.task.count({
      where: {
        userId,
        createdAt: { gte: weekStart },
      },
    }),
    prisma.habit.findMany({
      where: { userId },
      include: {
        logs: {
          where: { date: { gte: todayStart, lt: tomorrow }, completed: true },
        },
      },
    }),
    prisma.habitLog.count({
      where: {
        habit: { userId },
        date: { gte: todayStart, lt: tomorrow },
        completed: true,
      },
    }),
    prisma.expense.aggregate({
      where: { userId, date: { gte: monthStart } },
      _sum: { amount: true },
    }),
    prisma.income.aggregate({
      where: { userId, date: { gte: monthStart } },
      _sum: { amount: true },
    }),
    prisma.studyCourse.findMany({
      where: { userId },
      include: {
        _count: { select: { notes: true, materials: true } },
      },
      orderBy: { updatedAt: "desc" },
      take: 4,
    }),
    prisma.studyNote.findMany({
      where: { course: { userId } },
      include: { course: { select: { name: true, color: true } } },
      orderBy: { updatedAt: "desc" },
      take: 3,
    }),
    prisma.daySnapshot.findUnique({
      where: { userId_date: { userId, date: todayStart } },
    }),
    getTodaySchedule(userId),
    getUpcomingDeadlines(userId),
    getCoursesToday(userId, now),
    getFlashcardsDueCount(userId),
  ]);

  const habitsTotal = habits.length;
  const habitsDoneToday = habitLogsToday;
  const expenses = expensesMonth._sum.amount ?? 0;
  const income = incomeMonth._sum.amount ?? 0;

  let focusItems: { id: string; title: string; category: string }[];

  if (snapshot?.focusJson) {
    try {
      focusItems = JSON.parse(snapshot.focusJson) as typeof focusItems;
    } catch {
      focusItems = [];
    }
  } else if (tasksDueToday.length > 0) {
    focusItems = tasksDueToday.map((t) => ({
      id: t.id,
      title: t.title,
      category: t.category,
    }));
  } else {
    focusItems = [
      {
        id: "setup",
        title: "Run daily setup on Planner to auto-build your day",
        category: "PERSONAL",
      },
    ];
  }

  let dailyScore = { average: 0, scores: computeDailyScore({
    tasksDueToday: tasksDueToday.length,
    tasksDoneToday: 0,
    habitsTotal,
    habitsDoneToday,
    studyNotesToday: 0,
    contentActive: 0,
    contentAdvancedToday: 0,
    clientDeliverablesDue: 0,
    clientDeliverablesDone: 0,
    eventsToday: schedule.length,
  }).breakdown, hasSnapshot: false };

  if (snapshot) {
    try {
      dailyScore = {
        average: snapshot.score,
        scores: JSON.parse(snapshot.breakdown),
        hasSnapshot: true,
      };
    } catch {
      dailyScore.hasSnapshot = true;
      dailyScore.average = snapshot.score;
    }
  }

  return {
    focusItems,
    progress: {
      tasks: {
        value: tasksWeekCompleted,
        total: Math.max(tasksWeekTotal, 1),
      },
      habits: {
        value: habitsDoneToday,
        total: Math.max(habitsTotal, 1),
      },
      study: {
        value: studyCourses.reduce((n, c) => n + c._count.notes, 0),
        total: Math.max(studyCourses.length * 3, 1),
      },
      finance: {
        value: Math.round(income - expenses),
        total: Math.max(Math.round(income) || 1, 1),
        label: "Net this month (GHS)",
      },
    },
    finance: { expenses, income, net: income - expenses },
    studyCourses,
    recentNotes,
    habits: habits.map((h) => ({
      id: h.id,
      name: h.name,
      color: h.color,
      doneToday: h.logs.length > 0,
    })),
    schedule: schedule.map((e) => ({
      id: e.id,
      title: e.title,
      startAt: e.startAt,
      endAt: e.endAt,
      category: e.category,
    })),
    deadlines,
    dailyScore,
    coursesToday,
    flashcardsDue,
  };
}

export type DashboardData = Awaited<ReturnType<typeof getDashboardData>>;
