import { NextResponse } from "next/server";
import { headers } from "next/headers";
import { auth } from "@/lib/auth";
import { generateDayPlan } from "@/lib/automation/generate-day";
import { prisma } from "@/lib/prisma";
import { startOfDay, endOfDay } from "@/lib/date-utils";

export async function POST() {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const userId = session.user.id;

  // Count existing SYSTEM blocks for today before regeneration
  const now = new Date();
  const dayStart = startOfDay(now);
  const dayEnd = endOfDay(now);

  const existingBefore = await prisma.calendarEvent.count({
    where: {
      userId,
      source: "SYSTEM",
      startAt: { gte: dayStart, lt: dayEnd },
      NOT: { title: { startsWith: "__" } },
    },
  });

  // Force regeneration: delete the morning log so the engine re-runs
  await prisma.lifeCycleLog.deleteMany({
    where: { userId, type: "MORNING", date: dayStart },
  });
  await prisma.daySnapshot.deleteMany({
    where: { userId, date: dayStart },
  });

  // Delete existing SYSTEM events for today so we get a clean plan
  await prisma.calendarEvent.deleteMany({
    where: {
      userId,
      source: "SYSTEM",
      startAt: { gte: dayStart, lt: dayEnd },
      NOT: { title: { startsWith: "__" } },
    },
  });

  // Generate the fresh day plan
  const result = await generateDayPlan(userId, now);

  const blocksCreated = result.events.filter(
    (e) => e.source === "SYSTEM" && !e.title.startsWith("__")
  ).length;

  return NextResponse.json({
    ok: true,
    blocksCreated,
    score: result.score,
    focusCount: result.focusItems.length,
    wasAlreadyPlanned: existingBefore > 0,
  });
}
