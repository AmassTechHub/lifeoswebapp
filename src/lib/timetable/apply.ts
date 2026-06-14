import { generateDayPlan } from "@/lib/automation/generate-day";
import { atTime, startOfDay } from "@/lib/date-utils";
import { linkCoursesToEntities } from "@/lib/knowledge/link-courses";
import { prisma } from "@/lib/prisma";
import { assignColor, type TimetableBlock } from "@/lib/timetable/types";

const WEEKDAY_TO_INT: Record<string, number> = {
  MONDAY: 0, TUESDAY: 1, WEDNESDAY: 2, THURSDAY: 3,
  FRIDAY: 4, SATURDAY: 5, SUNDAY: 6,
};

function getDayName(date: Date) {
  return date
    .toLocaleDateString("en-US", { weekday: "long" })
    .toUpperCase() as TimetableBlock["day"];
}

function padTime(h: number, m: number) {
  return `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}`;
}

function addMinutes(h: number, m: number, mins: number) {
  const total = h * 60 + m + mins;
  return padTime(Math.floor(total / 60) % 24, total % 60);
}

export async function applyTimetableBlocks(
  userId: string,
  blocks: TimetableBlock[],
  group?: number | null
) {
  // Filter by group if specified
  const filtered = group
    ? blocks.filter((b) => b.group === group || b.group == null)
    : blocks;

  const today = new Date();
  const dayStart = startOfDay(today);
  const inTwoWeeks = new Date(dayStart);
  inTwoWeeks.setDate(inTwoWeeks.getDate() + 14);

  // Clear old timetable calendar events
  await prisma.calendarEvent.deleteMany({
    where: { userId, source: "TIMETABLE", startAt: { gte: dayStart, lt: inTwoWeeks } },
  });

  // Build calendar events for next 14 days
  const recurringEvents: {
    userId: string;
    title: string;
    startAt: Date;
    endAt: Date;
    category: "ACADEMICS";
    source: "TIMETABLE";
    studyCourseId?: string;
  }[] = [];

  // Get or create each unique course
  const uniqueCourses = [
    ...new Map(
      filtered.map((b) => {
        const key = b.courseCode ?? b.title.split(" ").slice(0, 2).join(" ");
        return [key, b];
      })
    ).values(),
  ].filter((b) => !b.title.toLowerCase().includes("course block") && !b.title.toLowerCase().includes("seminar-cs"));

  let colorIndex = 0;
  const courseIdMap = new Map<string, string>();

  for (const block of uniqueCourses) {
    const courseKey = block.courseCode ?? block.title.split(" ").slice(0, 2).join(" ");
    const existingByCode = block.courseCode
      ? await prisma.studyCourse.findFirst({ where: { userId, code: block.courseCode } })
      : null;
    const existingByName = !existingByCode
      ? await prisma.studyCourse.findFirst({ where: { userId, name: { contains: block.courseCode ?? block.title.slice(0, 10) } } })
      : null;

    const existing = existingByCode ?? existingByName;

    if (existing) {
      courseIdMap.set(courseKey, existing.id);
      if (!existing.color || existing.color === "#3b82f6") {
        await prisma.studyCourse.update({
          where: { id: existing.id },
          data: {
            code: block.courseCode ?? existing.code,
            color: assignColor(colorIndex),
          },
        });
      }
      colorIndex++;
    } else {
      const newCourse = await prisma.studyCourse.create({
        data: {
          userId,
          name: block.title,
          code: block.courseCode ?? undefined,
          color: assignColor(colorIndex++),
        },
      });
      courseIdMap.set(courseKey, newCourse.id);
    }
  }

  // Delete old schedule slots for courses we're re-seeding
  for (const courseId of courseIdMap.values()) {
    await prisma.courseSchedule.deleteMany({ where: { courseId } });
  }

  // Create CourseSchedule records (one per unique day+time+course)
  const schedulesSeen = new Set<string>();

  for (const b of filtered) {
    const courseKey = b.courseCode ?? b.title.split(" ").slice(0, 2).join(" ");
    const courseId = courseIdMap.get(courseKey);
    if (!courseId) continue;

    const dayOfWeek = WEEKDAY_TO_INT[b.day] ?? 0;
    const startTime = padTime(b.hour, b.minute);
    const endTime = addMinutes(b.hour, b.minute, b.durationMinutes);
    const slotKey = `${courseId}|${dayOfWeek}|${startTime}`;

    if (!schedulesSeen.has(slotKey)) {
      schedulesSeen.add(slotKey);
      await prisma.courseSchedule.create({
        data: {
          courseId,
          dayOfWeek,
          startTime,
          endTime,
          venue: b.venue ?? null,
        },
      });
    }
  }

  // Generate recurring calendar events
  for (let i = 0; i < 14; i++) {
    const d = new Date(dayStart);
    d.setDate(d.getDate() + i);
    const day = getDayName(d);
    for (const b of filtered.filter((block) => block.day === day)) {
      const startAt = atTime(d, b.hour, b.minute);
      const endAt = new Date(startAt.getTime() + b.durationMinutes * 60_000);
      const courseKey = b.courseCode ?? b.title.split(" ").slice(0, 2).join(" ");
      const studyCourseId = courseIdMap.get(courseKey);
      recurringEvents.push({
        userId,
        title: b.title,
        startAt,
        endAt,
        category: "ACADEMICS",
        source: "TIMETABLE",
        ...(studyCourseId ? { studyCourseId } : {}),
      });
    }
  }

  if (recurringEvents.length > 0) {
    await prisma.calendarEvent.createMany({ data: recurringEvents });
  }

  let eventsToday = 0;
  for (let i = 0; i < 7; i++) {
    const d = new Date(dayStart);
    d.setDate(d.getDate() + i);
    const plan = await generateDayPlan(userId, d);
    if (i === 0) eventsToday = plan.events.length;
  }

  await linkCoursesToEntities(userId);

  return {
    generatedEvents: recurringEvents.length,
    coursesCreated: courseIdMap.size,
    eventsToday,
    courseNames: [...courseIdMap.keys()],
  };
}
