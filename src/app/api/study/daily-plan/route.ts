import { NextResponse } from "next/server";
import { headers } from "next/headers";

import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

function daysUntil(date: Date | string): number {
  const due = new Date(date);
  const now = new Date();
  now.setHours(0, 0, 0, 0);
  due.setHours(0, 0, 0, 0);
  return Math.round((due.getTime() - now.getTime()) / 86_400_000);
}

export async function GET() {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const userId = session.user.id;
  const now = new Date();

  // 1. Flashcards due today (per course)
  const dueCards = await prisma.flashcard.findMany({
    where: {
      userId,
      OR: [{ nextReviewAt: null }, { nextReviewAt: { lte: now } }],
    },
    select: { id: true, courseId: true, difficulty: true },
  });

  // 2. Upcoming exams within 21 days
  const examCutoff = new Date(now);
  examCutoff.setDate(examCutoff.getDate() + 21);
  const upcomingExams = await prisma.deadline.findMany({
    where: {
      userId,
      completed: false,
      type: { in: ["EXAM", "QUIZ"] },
      dueDate: { gte: now, lte: examCutoff },
    },
    include: { course: { select: { id: true, name: true, color: true } } },
    orderBy: { dueDate: "asc" },
  });

  // 3. Assignments due within 3 days
  const assignmentCutoff = new Date(now);
  assignmentCutoff.setDate(assignmentCutoff.getDate() + 3);
  const urgentAssignments = await prisma.deadline.findMany({
    where: {
      userId,
      completed: false,
      type: { notIn: ["EXAM", "QUIZ"] },
      dueDate: { gte: now, lte: assignmentCutoff },
    },
    include: { course: { select: { id: true, name: true, color: true } } },
    orderBy: { dueDate: "asc" },
    take: 5,
  });

  // 4. Courses with no materials (need setup)
  const coursesWithNoMaterials = await prisma.studyCourse.findMany({
    where: { userId, materials: { none: {} }, notes: { none: {} } },
    select: { id: true, name: true, color: true },
    take: 3,
  });

  // 5. Build task list
  const tasks: {
    id: string;
    type: "review" | "exam-prep" | "assignment" | "upload" | "study";
    priority: "urgent" | "high" | "normal";
    title: string;
    subtitle: string;
    courseId?: string;
    courseName?: string;
    courseColor?: string;
    count?: number;
    daysLeft?: number;
  }[] = [];

  // Group due cards by course
  const cardsByCourse = new Map<string | null, number>();
  for (const c of dueCards) {
    const key = c.courseId ?? "general";
    cardsByCourse.set(key, (cardsByCourse.get(key) ?? 0) + 1);
  }

  // Flashcard review tasks
  for (const [courseKey, count] of cardsByCourse.entries()) {
    const course = courseKey !== "general"
      ? await prisma.studyCourse.findUnique({ where: { id: courseKey }, select: { id: true, name: true, color: true } })
      : null;
    tasks.push({
      id: `review-${courseKey}`,
      type: "review",
      priority: count >= 10 ? "urgent" : "high",
      title: `Review ${count} flashcard${count !== 1 ? "s" : ""}`,
      subtitle: course ? course.name : "General deck",
      courseId: course?.id ?? undefined,
      courseName: course?.name ?? undefined,
      courseColor: course?.color ?? undefined,
      count,
    });
  }

  // Exam prep tasks
  for (const exam of upcomingExams) {
    const days = daysUntil(exam.dueDate);
    tasks.push({
      id: `exam-${exam.id}`,
      type: "exam-prep",
      priority: days <= 3 ? "urgent" : days <= 7 ? "high" : "normal",
      title: `Prep: ${exam.title}`,
      subtitle: exam.course?.name ?? "Unnamed course",
      courseId: exam.course?.id,
      courseName: exam.course?.name,
      courseColor: exam.course?.color ?? "#3b82f6",
      daysLeft: days,
    });
  }

  // Urgent assignment tasks
  for (const a of urgentAssignments) {
    const days = daysUntil(a.dueDate);
    tasks.push({
      id: `assignment-${a.id}`,
      type: "assignment",
      priority: days === 0 ? "urgent" : days <= 1 ? "high" : "normal",
      title: a.title,
      subtitle: `Due ${days === 0 ? "today" : days === 1 ? "tomorrow" : `in ${days} days`}`,
      courseId: a.course?.id,
      courseName: a.course?.name,
      courseColor: a.course?.color,
      daysLeft: days,
    });
  }

  // Upload nudge for courses with no content
  for (const c of coursesWithNoMaterials) {
    tasks.push({
      id: `upload-${c.id}`,
      type: "upload",
      priority: "normal",
      title: `Upload slides for ${c.name}`,
      subtitle: "Unlock AI flashcards, summaries, and tutoring",
      courseId: c.id,
      courseName: c.name,
      courseColor: c.color,
    });
  }

  // Sort: urgent first, then by type weight
  const priorityOrder = { urgent: 0, high: 1, normal: 2 };
  const typeOrder = { review: 0, "exam-prep": 1, assignment: 2, upload: 3, study: 4 };
  tasks.sort((a, b) =>
    priorityOrder[a.priority] - priorityOrder[b.priority] ||
    typeOrder[a.type] - typeOrder[b.type]
  );

  const totalCards = dueCards.length;
  const nearestExam = upcomingExams[0];

  return NextResponse.json({
    tasks: tasks.slice(0, 8),
    summary: {
      cardsdue: totalCards,
      examsThisWeek: upcomingExams.filter((e) => daysUntil(e.dueDate) <= 7).length,
      nearestExamDays: nearestExam ? daysUntil(nearestExam.dueDate) : null,
      nearestExamTitle: nearestExam?.title ?? null,
    },
  });
}
