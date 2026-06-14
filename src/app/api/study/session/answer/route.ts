import { NextResponse } from "next/server";
import { headers } from "next/headers";

import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

function nextReviewDate(correct: boolean, reviewCount: number): Date {
  const now = new Date();
  if (!correct) {
    return new Date(now.getTime() + 24 * 60 * 60 * 1000); // tomorrow
  }
  // Gradually widen intervals: 1d → 3d → 7d → 14d
  const days = [1, 3, 7, 14][Math.min(reviewCount, 3)];
  return new Date(now.getTime() + days * 24 * 60 * 60 * 1000);
}

export async function POST(request: Request) {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await request.json().catch(() => ({}));
  const cardId = String(body.cardId ?? "");
  const correct = Boolean(body.correct);

  if (!cardId) {
    return NextResponse.json({ error: "cardId required" }, { status: 400 });
  }

  const card = await prisma.flashcard.findFirst({
    where: { id: cardId, userId: session.user.id },
    select: { id: true, difficulty: true, reviewCount: true },
  });

  if (!card) {
    return NextResponse.json({ error: "Card not found" }, { status: 404 });
  }

  const newDifficulty = correct
    ? Math.max(card.difficulty - 1, 0)
    : Math.min(card.difficulty + 1, 3);

  const newReviewCount = card.reviewCount + 1;
  const now = new Date();

  await prisma.flashcard.update({
    where: { id: cardId },
    data: {
      difficulty: newDifficulty,
      reviewCount: newReviewCount,
      lastReviewedAt: now,
      nextReviewAt: nextReviewDate(correct, card.reviewCount),
    },
  });

  return NextResponse.json({ ok: true, newDifficulty });
}
