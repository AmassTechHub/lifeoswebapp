import { NextResponse } from "next/server";
import { headers } from "next/headers";

import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function GET() {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const userId = session.user.id;
  const now = new Date();
  const todayStart = new Date(now); todayStart.setHours(0, 0, 0, 0);

  const [dueCount, studiedToday, sessions, nearestExam] = await Promise.all([
    prisma.flashcard.count({
      where: { userId, OR: [{ nextReviewAt: null }, { nextReviewAt: { lte: now } }] },
    }),
    prisma.studySession.count({ where: { userId, startedAt: { gte: todayStart } } }),
    prisma.studySession.findMany({
      where: { userId, durationSecs: { gt: 0 } },
      select: { startedAt: true },
      orderBy: { startedAt: "desc" },
    }),
    prisma.deadline.findFirst({
      where: { userId, completed: false, type: { in: ["EXAM", "QUIZ"] }, dueDate: { gte: now } },
      orderBy: { dueDate: "asc" },
      select: { title: true, dueDate: true },
    }),
  ]);

  // Calculate streak
  const daySet = new Set(sessions.map(s => s.startedAt.toISOString().slice(0, 10)));
  const days = [...daySet].sort().reverse();
  const today = now.toISOString().slice(0, 10);
  const yesterday = new Date(now.getTime() - 86_400_000).toISOString().slice(0, 10);
  let current = 0;
  let expected: string | null = (days[0] === today || days[0] === yesterday) ? days[0] : null;
  for (const day of days) {
    if (day === expected) {
      current++;
      expected = new Date(new Date(expected).getTime() - 86_400_000).toISOString().slice(0, 10);
    } else break;
  }

  const nearestExamDays = nearestExam
    ? Math.round((new Date(nearestExam.dueDate).getTime() - now.getTime()) / 86_400_000)
    : null;

  return NextResponse.json({
    current,
    studiedToday: studiedToday > 0,
    dueCards: dueCount,
    nearestExamDays,
    nearestExamTitle: nearestExam?.title ?? null,
  });
}
