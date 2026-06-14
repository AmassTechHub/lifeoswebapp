import { NextResponse } from "next/server";
import { headers } from "next/headers";

import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function GET() {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const now = new Date();

  const courses = await prisma.studyCourse.findMany({
    where: { userId: session.user.id },
    select: {
      id: true,
      name: true,
      color: true,
      _count: { select: { notes: true, materials: true, flashcards: true } },
      flashcards: {
        where: { OR: [{ nextReviewAt: null }, { nextReviewAt: { lte: now } }] },
        select: { id: true },
      },
      studySessions: {
        orderBy: { startedAt: "desc" },
        take: 1,
        select: { startedAt: true, cardsCorrect: true, cardsReviewed: true },
      },
    },
    orderBy: { updatedAt: "desc" },
  });

  return NextResponse.json({
    courses: courses.map((c) => ({
      id: c.id,
      name: c.name,
      color: c.color,
      noteCount: c._count.notes,
      materialCount: c._count.materials,
      flashcardCount: c._count.flashcards,
      dueCards: c.flashcards.length,
      lastSession: c.studySessions[0]
        ? {
            at: c.studySessions[0].startedAt.toISOString(),
            score:
              c.studySessions[0].cardsReviewed > 0
                ? Math.round(
                    (c.studySessions[0].cardsCorrect / c.studySessions[0].cardsReviewed) * 100
                  )
                : null,
          }
        : null,
    })),
  });
}
