"use server";

import { requireUserId } from "@/lib/actions/auth";
import { prisma } from "@/lib/prisma";

function subDays(date: Date, days: number): Date {
  const d = new Date(date);
  d.setDate(d.getDate() - days);
  return d;
}

function fmtDate(date: Date): string {
  return date.toLocaleDateString("en", { month: "short", day: "numeric" });
}

export async function getStudyAnalytics() {
  const userId = await requireUserId();
  const since30 = subDays(new Date(), 30);
  const since7 = subDays(new Date(), 7);

  const [
    sessions,
    courses,
    flashcardsTotal,
    flashcardsDue,
    tasks30,
    habits,
    habitLogs30,
    expenses30,
    incomes30,
    grades,
    aiUsage7,
    deadlines30,
  ] = await Promise.all([
    prisma.studySession.findMany({
      where: { userId, startedAt: { gte: since30 } },
      include: { course: { select: { id: true, name: true, code: true, color: true } } },
      orderBy: { startedAt: "asc" },
    }),
    prisma.studyCourse.findMany({
      where: { userId },
      select: {
        id: true, name: true, code: true, color: true,
        _count: { select: { flashcards: true, notes: true, materials: true } },
      },
    }),
    prisma.flashcard.count({ where: { userId } }),
    prisma.flashcard.count({
      where: { userId, OR: [{ nextReviewAt: null }, { nextReviewAt: { lte: new Date() } }] },
    }),
    prisma.task.findMany({
      where: { userId, createdAt: { gte: since30 } },
      select: { completed: true, createdAt: true },
    }),
    prisma.habit.findMany({ where: { userId }, select: { id: true, name: true, color: true } }),
    prisma.habitLog.findMany({
      where: { habitId: { in: (await prisma.habit.findMany({ where: { userId }, select: { id: true } })).map(h => h.id) }, date: { gte: since30 }, completed: true },
      select: { habitId: true, date: true },
    }),
    prisma.expense.findMany({ where: { userId, date: { gte: since30 } }, select: { amount: true, category: true, date: true } }),
    prisma.income.findMany({ where: { userId, date: { gte: since30 } }, select: { amount: true, date: true } }),
    prisma.courseGrade.findMany({ where: { userId }, orderBy: { year: "desc" }, take: 20 }),
    prisma.aIUsageLog.findMany({ where: { userId, date: { gte: since7 } }, orderBy: { date: "asc" } }),
    prisma.deadline.findMany({
      where: { userId, dueDate: { gte: since30 } },
      select: { completed: true, dueDate: true, type: true },
    }),
  ]);

  // ── Study ────────────────────────────────────────────────────────────────────
  const dailyStudyMap: Record<string, number> = {};
  for (let i = 29; i >= 0; i--) dailyStudyMap[fmtDate(subDays(new Date(), i))] = 0;
  for (const s of sessions) {
    const key = fmtDate(s.startedAt);
    if (key in dailyStudyMap) dailyStudyMap[key] += s.durationSecs;
  }

  const courseStats: Record<string, { reviewed: number; correct: number; durationSecs: number; sessions: number }> = {};
  for (const s of sessions) {
    const id = s.courseId ?? "__none__";
    if (!courseStats[id]) courseStats[id] = { reviewed: 0, correct: 0, durationSecs: 0, sessions: 0 };
    courseStats[id].reviewed += s.cardsReviewed;
    courseStats[id].correct += s.cardsCorrect;
    courseStats[id].durationSecs += s.durationSecs;
    courseStats[id].sessions += 1;
  }

  const courseBreakdown = courses.map((c) => {
    const stats = courseStats[c.id] ?? { reviewed: 0, correct: 0, durationSecs: 0, sessions: 0 };
    return {
      id: c.id, name: c.name, code: c.code, color: c.color,
      flashcardCount: c._count.flashcards, noteCount: c._count.notes, materialCount: c._count.materials,
      reviewed: stats.reviewed, correct: stats.correct,
      accuracy: stats.reviewed > 0 ? Math.round((stats.correct / stats.reviewed) * 100) : null,
      durationSecs: stats.durationSecs, sessions: stats.sessions,
    };
  }).filter((c) => c.sessions > 0 || c.flashcardCount > 0 || c.noteCount > 0);

  const totalTime = sessions.reduce((s, r) => s + r.durationSecs, 0);
  const totalReviewed = sessions.reduce((s, r) => s + r.cardsReviewed, 0);
  const totalCorrect = sessions.reduce((s, r) => s + r.cardsCorrect, 0);
  const overallAccuracy = totalReviewed > 0 ? Math.round((totalCorrect / totalReviewed) * 100) : null;

  // ── Tasks ────────────────────────────────────────────────────────────────────
  const tasksCompleted = tasks30.filter(t => t.completed).length;
  const tasksCreated = tasks30.length;
  const taskCompletionRate = tasksCreated > 0 ? Math.round((tasksCompleted / tasksCreated) * 100) : null;

  // Daily task completion last 14 days
  const dailyTaskMap: Record<string, { done: number; total: number }> = {};
  for (let i = 13; i >= 0; i--) {
    dailyTaskMap[fmtDate(subDays(new Date(), i))] = { done: 0, total: 0 };
  }
  for (const t of tasks30) {
    const key = fmtDate(t.createdAt);
    if (key in dailyTaskMap) {
      dailyTaskMap[key].total++;
      if (t.completed) dailyTaskMap[key].done++;
    }
  }

  // ── Habits ───────────────────────────────────────────────────────────────────
  const logSet = new Set(habitLogs30.map(l => `${l.habitId}:${l.date.toISOString().slice(0, 10)}`));
  const last7days = Array.from({ length: 7 }, (_, i) => {
    const d = subDays(new Date(), 6 - i);
    return d.toISOString().slice(0, 10);
  });
  const habitSummary = habits.map(h => ({
    id: h.id, name: h.name, color: h.color,
    last7: last7days.map(day => logSet.has(`${h.id}:${day}`)),
    streak: (() => {
      let streak = 0;
      for (let i = 0; i < 30; i++) {
        const day = subDays(new Date(), i).toISOString().slice(0, 10);
        if (logSet.has(`${h.id}:${day}`)) streak++;
        else break;
      }
      return streak;
    })(),
    completionRate30: (() => {
      let done = 0;
      for (let i = 0; i < 30; i++) {
        const day = subDays(new Date(), i).toISOString().slice(0, 10);
        if (logSet.has(`${h.id}:${day}`)) done++;
      }
      return Math.round((done / 30) * 100);
    })(),
  }));

  // ── Finance ──────────────────────────────────────────────────────────────────
  const totalExpenses30 = expenses30.reduce((s, e) => s + e.amount, 0);
  const totalIncome30 = incomes30.reduce((s, e) => s + e.amount, 0);
  const expensesByCategory = expenses30.reduce<Record<string, number>>((acc, e) => {
    acc[e.category] = (acc[e.category] ?? 0) + e.amount;
    return acc;
  }, {});

  // ── Deadlines ────────────────────────────────────────────────────────────────
  const deadlinesDone = deadlines30.filter(d => d.completed).length;
  const deadlinesTotal = deadlines30.length;

  // ── AI Usage ─────────────────────────────────────────────────────────────────
  const aiDays = Array.from({ length: 7 }, (_, i) => {
    const d = subDays(new Date(), 6 - i);
    const key = d.toISOString().split("T")[0];
    const log = aiUsage7.find(l => new Date(l.date).toISOString().split("T")[0] === key);
    return { date: d.toLocaleDateString("en", { weekday: "short" }), count: log?.count ?? 0 };
  });
  const totalAiMessages7 = aiDays.reduce((s, d) => s + d.count, 0);

  return {
    // Study
    totalSessions: sessions.length,
    totalTimeSecs: totalTime,
    totalReviewed,
    overallAccuracy,
    flashcardsTotal,
    flashcardsDue,
    daily: Object.entries(dailyStudyMap).map(([date, secs]) => ({ date, secs })),
    courses: courseBreakdown,
    // Tasks
    tasksCreated,
    tasksCompleted,
    taskCompletionRate,
    dailyTasks: Object.entries(dailyTaskMap).map(([date, v]) => ({ date, ...v })),
    // Habits
    habits: habitSummary,
    // Finance
    totalExpenses30: Math.round(totalExpenses30 * 100) / 100,
    totalIncome30: Math.round(totalIncome30 * 100) / 100,
    netSavings30: Math.round((totalIncome30 - totalExpenses30) * 100) / 100,
    expensesByCategory: Object.entries(expensesByCategory).sort((a, b) => b[1] - a[1]).slice(0, 5),
    // Grades
    latestGrades: grades.slice(0, 6),
    // Deadlines
    deadlinesDone,
    deadlinesTotal,
    // AI
    aiDays,
    totalAiMessages7,
  };
}
