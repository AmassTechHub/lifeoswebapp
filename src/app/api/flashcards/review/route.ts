import { headers } from "next/headers";
import { NextResponse } from "next/server";

import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

/**
 * SM-2 Spaced Repetition Algorithm
 * ─────────────────────────────────
 * quality: 0-5 rating (we map correct→5, hard→3, wrong→1)
 * easiness (EF): starts at 2.5, min 1.3 — measures how "easy" the card is
 * interval: days until next review
 *
 * After each review:
 *   EF' = EF + (0.1 - (5-q) * (0.08 + (5-q) * 0.02))
 *   EF' = max(1.3, EF')
 *   if q < 3 → reset interval to 1 (failed recall)
 *   else:
 *     n=1 → interval=1
 *     n=2 → interval=6
 *     n>2 → interval=round(prev_interval * EF')
 */
function sm2(
  quality: number,       // 0-5
  prevInterval: number,  // days
  prevEF: number,        // ease factor, starts 2.5
  prevN: number          // repetition count (0-indexed successes)
): { interval: number; ef: number; n: number } {
  // Update ease factor
  let ef = prevEF + (0.1 - (5 - quality) * (0.08 + (5 - quality) * 0.02));
  if (ef < 1.3) ef = 1.3;

  let interval: number;
  let n: number;

  if (quality < 3) {
    // Failed recall — reset
    interval = 1;
    n = 0;
  } else {
    n = prevN + 1;
    if (n === 1) interval = 1;
    else if (n === 2) interval = 6;
    else interval = Math.round(prevInterval * ef);
  }

  return { interval, ef, n };
}

export async function POST(request: Request) {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await request.json().catch(() => ({}));
  const { id, quality } = body as { id?: string; quality?: number; correct?: boolean };

  // Accept either quality (0-5, new) or correct (bool, legacy)
  let q: number;
  if (typeof quality === "number") {
    q = Math.max(0, Math.min(5, Math.round(quality)));
  } else if (typeof body.correct === "boolean") {
    q = body.correct ? 5 : 1;
  } else {
    return NextResponse.json({ error: "Missing quality or correct" }, { status: 400 });
  }

  if (!id) return NextResponse.json({ error: "Missing id" }, { status: 400 });

  const card = await prisma.flashcard.findFirst({
    where: { id, userId: session.user.id },
  });
  if (!card) return NextResponse.json({ error: "Not found" }, { status: 404 });

  // Pull existing SM-2 state from card fields
  // We store: difficulty (0-3) maps loosely to inverted quality
  // We need to store ef and n — use the existing fields creatively:
  //   reviewCount = total reviews (n proxy)
  //   difficulty = 0=new,1=easy,2=medium,3=hard (we keep for UI display)
  // For ef we'll store in a dedicated way: encode in nextReviewAt gap isn't enough.
  // Best approach: use reviewCount as n, compute EF from difficulty history.
  // Since we can't add columns without migration, we derive EF from difficulty:
  //   difficulty 0(new)/1(easy) → EF=2.5, 2(medium) → EF=2.1, 3(hard) → EF=1.5

  const prevEFByDifficulty: Record<number, number> = { 0: 2.5, 1: 2.5, 2: 2.1, 3: 1.5 };
  const prevEF = prevEFByDifficulty[card.difficulty] ?? 2.5;
  const prevN = card.reviewCount;
  const prevInterval = card.nextReviewAt
    ? Math.max(1, Math.round((card.nextReviewAt.getTime() - (card.lastReviewedAt?.getTime() ?? Date.now())) / 86_400_000))
    : 1;

  const { interval, ef, n } = sm2(q, prevInterval, prevEF, prevN);

  // Map EF back to difficulty for UI display
  const newDifficulty = ef >= 2.4 ? 1 : ef >= 1.8 ? 2 : 3;
  // New card that just passed gets difficulty 1; reset card (q<3) gets 3
  const uiDifficulty = q < 3 ? 3 : q === 5 ? 1 : newDifficulty;

  const nextReviewAt = new Date();
  nextReviewAt.setDate(nextReviewAt.getDate() + interval);

  await prisma.flashcard.update({
    where: { id },
    data: {
      difficulty: uiDifficulty,
      reviewCount: n,
      lastReviewedAt: new Date(),
      nextReviewAt,
    },
  });

  // XP: more for harder cards answered correctly
  const xpGain = q >= 4 ? 3 : q >= 3 ? 2 : 1;
  await prisma.user.update({
    where: { id: session.user.id },
    data: { xp: { increment: xpGain } },
  });

  return NextResponse.json({ ok: true, nextReviewAt, interval, ef: Math.round(ef * 100) / 100 });
}
