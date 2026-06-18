import { prisma } from "@/lib/prisma";

// CourseSchedule.dayOfWeek: 0=Mon … 6=Sun (matches planner.ts / timetable/apply.ts)
// Date.getDay():             0=Sun, 1=Mon … 6=Sat
function jsDayToCourseDay(jsDay: number): number {
  return (jsDay + 6) % 7;
}

export type CourseToday = {
  id: string;
  name: string;
  code: string | null;
  color: string;
  startTime: string;
  endTime: string;
  venue: string | null;
};

// Courses with a class scheduled today, ordered by start time.
export async function getCoursesToday(userId: string, baseDate = new Date()): Promise<CourseToday[]> {
  const courseDay = jsDayToCourseDay(baseDate.getDay());

  const courses = await prisma.studyCourse.findMany({
    where: { userId, scheduleSlots: { some: { dayOfWeek: courseDay } } },
    include: { scheduleSlots: { where: { dayOfWeek: courseDay }, orderBy: { startTime: "asc" } } },
  });

  return courses
    .flatMap((c) =>
      c.scheduleSlots.map((slot) => ({
        id: c.id,
        name: c.name,
        code: c.code,
        color: c.color,
        startTime: slot.startTime,
        endTime: slot.endTime,
        venue: slot.venue,
      }))
    )
    .sort((a, b) => a.startTime.localeCompare(b.startTime));
}

// Flashcards due for spaced-repetition review right now (never reviewed, or past their next review date).
export async function getFlashcardsDueCount(userId: string): Promise<number> {
  return prisma.flashcard.count({
    where: {
      userId,
      OR: [{ nextReviewAt: null }, { nextReviewAt: { lte: new Date() } }],
    },
  });
}
