import { prisma } from "@/lib/prisma";

type GraphNode = {
  id: string;
  type: "course" | "task" | "event";
  label: string;
  meta: Record<string, number>;
};

export async function getKnowledgeGraph(userId: string) {
  const courses = await prisma.studyCourse.findMany({
    where: { userId },
    include: {
      _count: { select: { notes: true, materials: true, tasks: true, calendarEvents: true } },
    },
    orderBy: { updatedAt: "desc" },
  });

  const nodes: GraphNode[] = courses.map((c) => ({
    id: c.id,
    type: "course" as const,
    label: c.name,
    meta: {
      notes: c._count.notes,
      materials: c._count.materials,
      tasks: c._count.tasks,
      events: c._count.calendarEvents,
    },
  }));

  const edges: { from: string; to: string; label: string }[] = [];

  for (const course of courses) {
    const [tasks, events] = await Promise.all([
      prisma.task.findMany({
        where: { userId, studyCourseId: course.id },
        select: { id: true, title: true },
        take: 5,
      }),
      prisma.calendarEvent.findMany({
        where: { userId, studyCourseId: course.id },
        select: { id: true, title: true },
        take: 5,
        orderBy: { startAt: "desc" },
      }),
    ]);

    for (const task of tasks) {
      edges.push({ from: course.id, to: task.id, label: "task" });
      nodes.push({ id: task.id, type: "task", label: task.title, meta: {} });
    }
    for (const event of events) {
      edges.push({ from: course.id, to: event.id, label: "event" });
      nodes.push({ id: event.id, type: "event", label: event.title, meta: {} });
    }
  }

  const uniqueNodes = [...new Map(nodes.map((n) => [n.id, n])).values()];

  return { nodes: uniqueNodes, edges };
}
