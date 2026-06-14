import { prisma } from "@/lib/prisma";

/** Links tasks and timetable events to study courses by title similarity. */
export async function linkCoursesToEntities(userId: string) {
  const courses = await prisma.studyCourse.findMany({
    where: { userId },
    select: { id: true, name: true, code: true },
  });
  if (courses.length === 0) return { linkedTasks: 0, linkedEvents: 0 };

  const tasks = await prisma.task.findMany({
    where: { userId, studyCourseId: null, category: "ACADEMICS" },
    select: { id: true, title: true },
  });
  const events = await prisma.calendarEvent.findMany({
    where: {
      userId,
      studyCourseId: null,
      source: "TIMETABLE",
      startAt: { gte: new Date(Date.now() - 14 * 86_400_000) },
    },
    select: { id: true, title: true },
  });

  let linkedTasks = 0;
  let linkedEvents = 0;

  function matchCourse(title: string) {
    const lower = title.toLowerCase();
    return courses.find(
      (c) =>
        lower.includes(c.name.toLowerCase()) ||
        (c.code && lower.includes(c.code.toLowerCase()))
    );
  }

  for (const task of tasks) {
    const course = matchCourse(task.title);
    if (!course) continue;
    await prisma.task.update({
      where: { id: task.id },
      data: { studyCourseId: course.id },
    });
    linkedTasks += 1;
  }

  for (const event of events) {
    const course = matchCourse(event.title);
    if (!course) continue;
    await prisma.calendarEvent.update({
      where: { id: event.id },
      data: { studyCourseId: course.id },
    });
    linkedEvents += 1;
  }

  return { linkedTasks, linkedEvents };
}
