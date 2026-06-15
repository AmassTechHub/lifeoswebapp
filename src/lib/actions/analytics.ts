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
  const since = subDays(new Date(), 30);

  const [sessions, courses] = await Promise.all([
    prisma.studySession.findMany({
      where: { userId, startedAt: { gte: since } },
      include: { course: { select: { id: true, name: true, code: true, color: true } } },
      orderBy: { startedAt: "asc" },
    }),
    prisma.studyCourse.findMany({
      where: { userId },
      select: {
        id: true, name: true, code: true, color: true,
        _count: { select: { flashcards: true, notes: true } },
      },
    }),
  ]);

  // Daily study time (last 30 days)
  const dailyMap: Record<string, number> = {};
  for (let i = 29; i >= 0; i--) {
    dailyMap[fmtDate(subDays(new Date(), i))] = 0;
  }
  for (const s of sessions) {
    const key = fmtDate(s.startedAt);
    if (key in dailyMap) dailyMap[key] += s.durationSecs;
  }

  // Per-course stats
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
      id: c.id,
      name: c.name,
      code: c.code,
      color: c.color,
      flashcardCount: c._count.flashcards,
      noteCount: c._count.notes,
      reviewed: stats.reviewed,
      correct: stats.correct,
      accuracy: stats.reviewed > 0 ? Math.round((stats.correct / stats.reviewed) * 100) : null,
      durationSecs: stats.durationSecs,
      sessions: stats.sessions,
    };
  }).filter((c) => c.sessions > 0 || c.flashcardCount > 0);

  const totalTime = sessions.reduce((s, r) => s + r.durationSecs, 0);
  const totalReviewed = sessions.reduce((s, r) => s + r.cardsReviewed, 0);
  const totalCorrect = sessions.reduce((s, r) => s + r.cardsCorrect, 0);
  const overallAccuracy = totalReviewed > 0 ? Math.round((totalCorrect / totalReviewed) * 100) : null;

  return {
    totalSessions: sessions.length,
    totalTimeSecs: totalTime,
    totalReviewed,
    overallAccuracy,
    daily: Object.entries(dailyMap).map(([date, secs]) => ({ date, secs })),
    courses: courseBreakdown,
  };
}
