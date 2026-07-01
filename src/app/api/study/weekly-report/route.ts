import { NextResponse } from "next/server";
import { headers } from "next/headers";

import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { callClaude, getServerApiKey } from "@/lib/ai/claude";
import { checkAndIncrementUsage } from "@/lib/ai/usage";

export async function POST() {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const apiKey = getServerApiKey();
  if (!apiKey) return NextResponse.json({ error: "AI not configured" }, { status: 503 });

  const usage = await checkAndIncrementUsage(session.user.id);
  if (!usage.allowed) return NextResponse.json({ error: "Daily AI limit reached" }, { status: 429 });

  const userId = session.user.id;
  const now = new Date();
  const since7 = new Date(now.getTime() - 7 * 86_400_000);
  const since14 = new Date(now.getTime() - 14 * 86_400_000);

  const [sessions7, sessions14, flashcards, courses, deadlines, user] = await Promise.all([
    prisma.studySession.findMany({
      where: { userId, startedAt: { gte: since7 } },
      include: { course: { select: { name: true, color: true } } },
    }),
    prisma.studySession.findMany({
      where: { userId, startedAt: { gte: since14, lt: since7 } },
    }),
    prisma.flashcard.findMany({
      where: { userId },
      select: { difficulty: true, reviewCount: true, courseId: true },
    }),
    prisma.studyCourse.findMany({
      where: { userId },
      select: { id: true, name: true, _count: { select: { notes: true, materials: true } } },
    }),
    prisma.deadline.findMany({
      where: { userId, dueDate: { gte: now }, completed: false, type: { in: ["EXAM", "QUIZ"] } },
      orderBy: { dueDate: "asc" },
      take: 5,
      include: { course: { select: { name: true } } },
    }),
    prisma.user.findUnique({ where: { id: userId }, select: { name: true, isPro: true } }),
  ]);

  const totalMins7 = Math.round(sessions7.reduce((s, r) => s + r.durationSecs, 0) / 60);
  const totalMins14 = Math.round(sessions14.reduce((s, r) => s + r.durationSecs, 0) / 60);
  const totalReviewed = sessions7.reduce((s, r) => s + r.cardsReviewed, 0);
  const totalCorrect = sessions7.reduce((s, r) => s + r.cardsCorrect, 0);
  const accuracy = totalReviewed > 0 ? Math.round((totalCorrect / totalReviewed) * 100) : null;

  const courseActivity = courses.map(c => {
    const s = sessions7.filter(s => s.courseId === c.id);
    const cards = flashcards.filter(f => f.courseId === c.id);
    return {
      name: c.name,
      sessions: s.length,
      mins: Math.round(s.reduce((a, b) => a + b.durationSecs, 0) / 60),
      hardCards: cards.filter(f => f.difficulty === 3).length,
      totalCards: cards.length,
    };
  }).filter(c => c.sessions > 0);

  const upcomingExams = deadlines.map(d => ({
    title: d.title,
    course: d.course?.name,
    daysLeft: Math.round((new Date(d.dueDate).getTime() - now.getTime()) / 86_400_000),
  }));

  const prompt = `Generate a weekly study report for ${user?.name ?? "the student"}.

WEEK STATS:
- Study time: ${totalMins7} minutes (previous week: ${totalMins14} mins, ${totalMins7 > totalMins14 ? "↑" : "↓"} ${Math.abs(totalMins7 - totalMins14)} mins)
- Sessions: ${sessions7.length}
- Flashcards reviewed: ${totalReviewed} · Accuracy: ${accuracy !== null ? `${accuracy}%` : "no data"}
- Courses studied: ${courseActivity.map(c => `${c.name} (${c.sessions} sessions, ${c.mins} min)`).join(", ") || "none"}
- Hard flashcards: ${flashcards.filter(f => f.difficulty === 3).length} cards still rated Hard
- Upcoming exams: ${upcomingExams.map(e => `${e.title} in ${e.daysLeft} days`).join(", ") || "none"}

Write a SHORT, motivating weekly report. Format:
1. One opening line: honest assessment of the week (good/bad/neutral)
2. "What went well" — 2 bullet points max
3. "Needs attention" — 1-2 specific gaps with actionable fix
4. "This week's priority" — ONE specific thing to focus on
5. One closing motivational line

Be direct, specific, and honest. Reference actual numbers. Keep total under 200 words.`;

  try {
    const report = await callClaude({
      apiKey,
      system: "You are a no-nonsense academic coach who gives weekly study performance reports. Be honest, specific, and brief.",
      messages: [{ role: "user", content: prompt }],
      maxTokens: 500,
      isPro: user?.isPro ?? false,
    });

    return NextResponse.json({ ok: true, report, stats: { totalMins7, sessions: sessions7.length, accuracy } });
  } catch {
    return NextResponse.json({ error: "Report generation failed" }, { status: 500 });
  }
}
