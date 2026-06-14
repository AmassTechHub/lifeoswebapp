import { NextResponse } from "next/server";
import { headers } from "next/headers";

import { auth } from "@/lib/auth";
import { startOfDay } from "@/lib/date-utils";
import { prisma } from "@/lib/prisma";
import type { TimetableBlock } from "@/lib/timetable/types";

export async function GET() {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const dayStart = startOfDay(new Date());
  const horizon = new Date(dayStart);
  horizon.setDate(horizon.getDate() + 14);

  const events = await prisma.calendarEvent.findMany({
    where: {
      userId: session.user.id,
      source: "TIMETABLE",
      startAt: { gte: dayStart, lt: horizon },
    },
    orderBy: { startAt: "asc" },
  });

  const map = new Map<string, TimetableBlock>();
  for (const event of events) {
    const day = event.startAt
      .toLocaleDateString("en-US", { weekday: "long" })
      .toUpperCase() as TimetableBlock["day"];
    const durationMinutes = Math.round(
      (event.endAt.getTime() - event.startAt.getTime()) / 60_000
    );
    const key = `${event.title}|${day}|${event.startAt.getHours()}|${event.startAt.getMinutes()}`;
    if (!map.has(key)) {
      map.set(key, {
        title: event.title,
        day,
        hour: event.startAt.getHours(),
        minute: event.startAt.getMinutes(),
        durationMinutes: Math.max(30, durationMinutes),
      });
    }
  }

  return NextResponse.json({
    blocks: [...map.values()],
    hasTimetable: map.size > 0,
  });
}
