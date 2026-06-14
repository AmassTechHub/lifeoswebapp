import { NextResponse } from "next/server";
import { headers } from "next/headers";

import { auth } from "@/lib/auth";
import { startOfDay, startOfWeek } from "@/lib/date-utils";
import { prisma } from "@/lib/prisma";

export async function GET() {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const userId = session.user.id;
  const now = new Date();
  const weekStart = startOfWeek(now);
  const today = startOfDay(now);

  const [tasksDone, tasksCreated, habitsCompleted, notesUpdated, snapshots] = await Promise.all([
    prisma.task.count({
      where: { userId, completed: true, updatedAt: { gte: weekStart } },
    }),
    prisma.task.count({
      where: { userId, createdAt: { gte: weekStart } },
    }),
    prisma.habitLog.count({
      where: {
        habit: { userId },
        date: { gte: weekStart, lt: today },
        completed: true,
      },
    }),
    prisma.studyNote.count({
      where: {
        course: { userId },
        updatedAt: { gte: weekStart },
      },
    }),
    prisma.daySnapshot.findMany({
      where: { userId, date: { gte: weekStart } },
      orderBy: { date: "asc" },
      select: { score: true },
    }),
  ]);

  const avgScore =
    snapshots.length > 0
      ? Math.round(snapshots.reduce((sum, item) => sum + item.score, 0) / snapshots.length)
      : 0;

  const review = [
    `- Wins: completed ${tasksDone} task(s) and ${habitsCompleted} habit check-in(s) this week.`,
    `- Throughput: created ${tasksCreated} task(s), updated ${notesUpdated} study note(s).`,
    `- Consistency score: average daily score is ${avgScore}.`,
    `- Next focus: keep your top 3 priorities visible and run daily setup each morning.`,
  ].join("\n");

  return NextResponse.json({
    period: "this_week",
    metrics: {
      tasksDone,
      tasksCreated,
      habitsCompleted,
      notesUpdated,
      averageScore: avgScore,
    },
    review,
  });
}
