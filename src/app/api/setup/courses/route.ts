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

  // Override colors based on provided course colors (after apply creates courses)
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
}

// GET: returns the KNUST CS3 Group 1 preset
export async function GET() {
  return NextResponse.json({ preset: KNUST_CS3_PRESET });
}

const KNUST_CS3_PRESET = {
  label: "KNUST B.Sc. CS Year 3 — Semester 2",
  group: 1,
  courses: [
    {
      code: "CSM 388",
      name: "Data Structures II",
      color: "#3b82f6",
      slots: [
        { day: "MONDAY",    startTime: "10:30", endTime: "11:25", venue: "SCB-SF20" },
        { day: "TUESDAY",   startTime: "10:30", endTime: "11:25", venue: "FF17" },
      ],
    },
    {
      code: "CSM 352",
      name: "Computer Architecture",
      color: "#8b5cf6",
      slots: [
        { day: "MONDAY",    startTime: "13:00", endTime: "13:55", venue: "SCB-SF7" },
        { day: "THURSDAY",  startTime: "18:00", endTime: "18:55", venue: "FF17" },
      ],
    },
    {
      code: "CSM 354",
      name: "Computer Graphics",
      color: "#ec4899",
      slots: [
        { day: "MONDAY",    startTime: "17:00", endTime: "17:55", venue: "SCB-SF19" },
        { day: "TUESDAY",   startTime: "15:00", endTime: "15:55", venue: "FF6" },
      ],
    },
    {
      code: "CSM 374",
      name: "Real-Time and Embedded Systems",
      color: "#ef4444",
      slots: [
        { day: "TUESDAY",   startTime: "13:00", endTime: "13:55", venue: "FF17" },
        { day: "FRIDAY",    startTime: "17:00", endTime: "17:55", venue: "SCB-TF1" },
      ],
    },
    {
      code: "CSM 358",
      name: "E-Commerce",
      color: "#f59e0b",
      slots: [
        { day: "WEDNESDAY", startTime: "15:00", endTime: "15:55", venue: "SCB-SF19" },
      ],
    },
    {
      code: "CSM 394",
      name: "Operations Research II",
      color: "#a855f7",
      slots: [
        { day: "WEDNESDAY", startTime: "16:00", endTime: "16:55", venue: "SCB-SF7" },
        { day: "THURSDAY",  startTime: "17:00", endTime: "17:55", venue: "DCB-FF24" },
      ],
    },
    {
      code: "ACF 256",
      name: "Financial Accounting II",
      color: "#f97316",
      slots: [
        { day: "THURSDAY",  startTime: "08:00", endTime: "08:55", venue: "SCB-SF19" },
      ],
    },
    {
      code: "CSM 376",
      name: "Research Method and IT Project",
      color: "#06b6d4",
      slots: [
        { day: "THURSDAY",  startTime: "10:30", endTime: "11:25", venue: "SCB-SF1" },
      ],
    },
    {
      code: "CSM 366",
      name: "Mini Project",
      color: "#22c55e",
      slots: [
        { day: "FRIDAY",    startTime: "10:30", endTime: "14:55", venue: "" },
      ],
    },
  ],
} as const;
