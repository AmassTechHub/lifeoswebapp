import { NextResponse } from "next/server";
import { headers } from "next/headers";

import { auth } from "@/lib/auth";
import { getEveningReminder } from "@/lib/ai/coach-state";
import { addMinutes, atTime, endOfDay, startOfDay } from "@/lib/date-utils";
import { prisma } from "@/lib/prisma";

const MORNING_TAG = "__routine:morning";
const EVENING_TAG = "__routine:evening";

function routineTag(type: string) {
  return type === "morning" ? MORNING_TAG : EVENING_TAG;
}

async function countStreak(userId: string, type: "morning" | "evening") {
  let streak = 0;
  for (let i = 0; i < 30; i += 1) {
    const day = new Date();
    day.setDate(day.getDate() - i);
    const start = startOfDay(day);
    const end = endOfDay(day);
    const exists = await prisma.calendarEvent.findFirst({
      where: {
        userId,
        source: "SYSTEM",
        title: routineTag(type),
        startAt: { gte: start, lt: end },
      },
      select: { id: true },
    });
    if (!exists) break;
    streak += 1;
  }
  return streak;
}

export async function GET() {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const userId = session.user.id;
  const now = new Date();
  const start = startOfDay(now);
  const end = endOfDay(now);

  const [morningDone, eveningDone, morningStreak, eveningStreak] = await Promise.all([
    prisma.calendarEvent.findFirst({
      where: {
        userId,
        source: "SYSTEM",
        title: MORNING_TAG,
        startAt: { gte: start, lt: end },
      },
      select: { id: true },
    }),
    prisma.calendarEvent.findFirst({
      where: {
        userId,
        source: "SYSTEM",
        title: EVENING_TAG,
        startAt: { gte: start, lt: end },
      },
      select: { id: true },
    }),
    countStreak(userId, "morning"),
    countStreak(userId, "evening"),
  ]);

  const eveningReminder = getEveningReminder(now.getHours(), Boolean(eveningDone));

  return NextResponse.json({
    morningDone: Boolean(morningDone),
    eveningDone: Boolean(eveningDone),
    morningStreak,
    eveningStreak,
    eveningReminder,
  });
}

export async function POST(request: Request) {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await request.json().catch(() => ({}));
  const type = body.type === "evening" ? "evening" : "morning";
  const userId = session.user.id;
  const now = new Date();
  const start = startOfDay(now);
  const end = endOfDay(now);

  const existing = await prisma.calendarEvent.findFirst({
    where: {
      userId,
      source: "SYSTEM",
      title: routineTag(type),
      startAt: { gte: start, lt: end },
    },
    select: { id: true },
  });

  if (!existing) {
    const hour = type === "morning" ? 6 : 21;
    const eventStart = atTime(now, hour, 0);
    const eventEnd = addMinutes(eventStart, 20);
    await prisma.calendarEvent.create({
      data: {
        userId,
        title: routineTag(type),
        description:
          type === "morning"
            ? "Morning routine completed from AI dashboard"
            : "Evening review completed from AI dashboard",
        startAt: eventStart,
        endAt: eventEnd,
        category: "PERSONAL",
        source: "SYSTEM",
      },
    });
  }

  const [morningStreak, eveningStreak] = await Promise.all([
    countStreak(userId, "morning"),
    countStreak(userId, "evening"),
  ]);

  return NextResponse.json({
    ok: true,
    result: `${type === "morning" ? "Morning routine" : "Evening review"} marked complete.`,
    morningStreak,
    eveningStreak,
  });
}
