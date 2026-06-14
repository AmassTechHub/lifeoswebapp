import { notFound, redirect } from "next/navigation";

import { prisma } from "@/lib/prisma";
import { requireSession } from "@/lib/session";
import { StudySessionClient } from "@/components/learning/StudySessionClient";

export const dynamic = "force-dynamic";

export default async function StudySessionPage({
  params,
}: {
  params: Promise<{ courseId: string }>;
}) {
  const { courseId } = await params;
  const session = await requireSession();

  const course = await prisma.studyCourse.findFirst({
    where: { id: courseId, userId: session.user.id },
    select: {
      id: true,
      name: true,
      code: true,
      color: true,
      notes: {
        where: { type: "SUMMARY" },
        orderBy: { createdAt: "desc" },
        take: 1,
        select: { id: true, title: true, content: true },
      },
    },
  });

  if (!course) notFound();

  const now = new Date();
  const dueCards = await prisma.flashcard.findMany({
    where: {
      userId: session.user.id,
      courseId,
      OR: [{ nextReviewAt: null }, { nextReviewAt: { lte: now } }],
    },
    select: {
      id: true,
      front: true,
      back: true,
      difficulty: true,
      reviewCount: true,
    },
    orderBy: { difficulty: "desc" },
  });

  const userKey = await prisma.user.findUnique({
    where: { id: session.user.id },
    select: { openAiKey: true },
  });
  const hasAiKey = Boolean(
    userKey?.openAiKey?.trim() || process.env.OPENAI_API_KEY?.trim()
  );

  return (
    <StudySessionClient
      course={course}
      dueCards={dueCards}
      latestSummary={course.notes[0] ?? null}
      hasAiKey={hasAiKey}
    />
  );
}
