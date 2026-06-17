import { headers } from "next/headers";
import { NextResponse } from "next/server";

import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

// Days until next review by difficulty (0=new, 1=easy, 2=medium, 3=hard)
const REVIEW_INTERVALS = [1, 3, 7, 14];

export async function POST(request: Request) {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await request.json().catch(() => ({}));
  const { id, correct } = body;
  if (!id || typeof correct !== "boolean") {
    return NextResponse.json({ error: "Missing id or correct" }, { status: 400 });
  }

  const card = await prisma.flashcard.findFirst({
    where: { id, userId: session.user.id },
  });
  if (!card) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const newDifficulty = correct
    ? Math.max(0, card.difficulty - 1)
    : Math.min(3, card.difficulty + 1);

  const daysUntilReview = correct ? REVIEW_INTERVALS[newDifficulty] : 1;
  const nextReviewAt = new Date();
  nextReviewAt.setDate(nextReviewAt.getDate() + daysUntilReview);

  await prisma.flashcard.update({
    where: { id },
    data: {
      difficulty: newDifficulty,
      reviewCount: { increment: 1 },
      lastReviewedAt: new Date(),
      nextReviewAt,
    },
  });

  // Award 2 XP per flashcard reviewed
  await prisma.user.update({
    where: { id: session.user.id },
    data: { xp: { increment: 2 } },
  });

  return NextResponse.json({ ok: true, nextReviewAt });
}
