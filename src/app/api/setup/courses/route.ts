import { headers } from "next/headers";
import { NextResponse } from "next/server";

import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { applyTimetableBlocks } from "@/lib/timetable/apply";
import type { TimetableBlock } from "@/lib/timetable/types";

interface SetupSlot {
  day: string;
  startTime: string;
  endTime: string;
  venue?: string;
}

interface SetupCourse {
  code: string;
  name: string;
  color: string;
  slots: SetupSlot[];
}

function timeToHourMinute(t: string): { hour: number; minute: number } {
  const [h, m] = t.split(":").map(Number);
  return { hour: h, minute: m };
}

function durationMins(start: string, end: string): number {
  const s = timeToHourMinute(start);
  const e = timeToHourMinute(end);
  return (e.hour * 60 + e.minute) - (s.hour * 60 + s.minute);
}

const WEEKDAY_MAP: Record<string, TimetableBlock["day"]> = {
  MON: "MONDAY", TUE: "TUESDAY", WED: "WEDNESDAY",
  THU: "THURSDAY", FRI: "FRIDAY", SAT: "SATURDAY", SUN: "SUNDAY",
  MONDAY: "MONDAY", TUESDAY: "TUESDAY", WEDNESDAY: "WEDNESDAY",
  THURSDAY: "THURSDAY", FRIDAY: "FRIDAY", SATURDAY: "SATURDAY", SUNDAY: "SUNDAY",
};

// Allow up to 60 seconds on Vercel — this route does a lot of sequential DB work
export const maxDuration = 60;

export async function POST(request: Request) {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await request.json().catch(() => ({}));
  const courses: SetupCourse[] = Array.isArray(body.courses) ? body.courses : [];
  const group: number | null = body.group ?? null;

  if (courses.length === 0) {
    return NextResponse.json({ error: "No courses provided" }, { status: 400 });
  }

  // Build TimetableBlock[] from structured course data
  const blocks: TimetableBlock[] = [];
  for (const course of courses) {
    for (const slot of course.slots) {
      const day = WEEKDAY_MAP[slot.day.toUpperCase()] ?? WEEKDAY_MAP[slot.day.slice(0, 3).toUpperCase()];
      if (!day) continue;
      const { hour, minute } = timeToHourMinute(slot.startTime);
      const dur = durationMins(slot.startTime, slot.endTime);
      blocks.push({
        title: `${course.code} ${course.name}`,
        courseCode: course.code,
        day,
        hour,
        minute,
        durationMinutes: Math.max(dur, 30),
        venue: slot.venue,
        group: null,
      });
    }
  }

  try {
    const result = await applyTimetableBlocks(session.user.id, blocks, group);

    // Apply custom colors
    for (const course of courses) {
      await prisma.studyCourse.updateMany({
        where: { userId: session.user.id, code: course.code },
        data: { color: course.color, name: course.name },
      });
    }

    return NextResponse.json({
      ok: true,
      coursesCreated: result.coursesCreated,
      courseNames: result.courseNames,
      generatedEvents: result.generatedEvents,
    });
  } catch (err) {
    console.error("Setup courses error:", err);
    const message = err instanceof Error ? err.message : "Setup failed";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
