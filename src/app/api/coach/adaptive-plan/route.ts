import { NextResponse } from "next/server";
import { headers } from "next/headers";

import { auth } from "@/lib/auth";
import { startOfDay } from "@/lib/date-utils";
import { prisma } from "@/lib/prisma";

export async function GET() {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const userId = session.user.id;
  const now = new Date();
  const weekAgo = new Date(now);
  weekAgo.setDate(weekAgo.getDate() - 7);
  const today = startOfDay(now);

  const [snapshots, completedWeek, completedToday, overdueCount, eventsToday] = await Promise.all([
    prisma.daySnapshot.findMany({
      where: { userId, date: { gte: weekAgo } },
      orderBy: { date: "asc" },
      select: { score: true },
    }),
    prisma.task.count({
      where: { userId, completed: true, updatedAt: { gte: weekAgo } },
    }),
    prisma.task.count({
      where: { userId, completed: true, updatedAt: { gte: today } },
    }),
    prisma.task.count({
      where: { userId, completed: false, dueDate: { lt: today } },
    }),
    prisma.calendarEvent.count({
      where: { userId, startAt: { gte: today } },
    }),
  ]);

  const avgScore =
    snapshots.length > 0
      ? Math.round(snapshots.reduce((sum, item) => sum + item.score, 0) / snapshots.length)
      : 0;
  const trend =
    snapshots.length >= 2
      ? snapshots[snapshots.length - 1].score - snapshots[0].score
      : 0;

  const advice = [
    trend < 0
      ? "Score trend is down this week. Reduce context-switching and run daily setup each morning."
      : "Score trend is stable or improving. Keep your current execution rhythm.",
    overdueCount > 0
      ? `You have ${overdueCount} overdue task(s). Run rescue and cap today's priorities to three.`
      : "No overdue tasks detected. Keep your next-day planning habit.",
    eventsToday === 0
      ? "No schedule blocks today. Add at least one deep-work block now."
      : `You have ${eventsToday} schedule block(s) today. Protect your focus windows.`,
    completedToday === 0
      ? "No completed task yet today. Start with a 20-minute quick win."
      : `Momentum active: ${completedToday} task(s) completed today.`,
  ];

  const recommendations = advice.map((line) => `- ${line}`).join("\n");

  return NextResponse.json({
    metrics: {
      averageScore: avgScore,
      trendDelta: trend,
      tasksCompletedThisWeek: completedWeek,
      tasksCompletedToday: completedToday,
      overdueCount,
      eventsToday,
    },
    recommendations,
  });
}
