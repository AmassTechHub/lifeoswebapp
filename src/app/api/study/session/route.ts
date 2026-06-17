import { headers } from "next/headers";
import { NextResponse } from "next/server";

import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function POST(request: Request) {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await request.json().catch(() => ({}));
  const durationSecs = Number(body.durationSecs) || 0;
  const courseId = typeof body.courseId === "string" && body.courseId ? body.courseId : null;
  const startedAt = body.startedAt ? new Date(body.startedAt) : new Date();
  const endedAt = body.endedAt ? new Date(body.endedAt) : new Date();

  if (durationSecs < 60) {
    return NextResponse.json({ error: "Session too short (minimum 60 seconds)" }, { status: 400 });
  }

  if (courseId) {
    const course = await prisma.studyCourse.findFirst({
      where: { id: courseId, userId: session.user.id },
    });
    if (!course) return NextResponse.json({ error: "Course not found" }, { status: 404 });
  }

  const studySession = await prisma.studySession.create({
    data: { userId: session.user.id, courseId, durationSecs, startedAt, endedAt },
  });

  // XP: 15 base + 1 per extra minute (capped at 60 total)
  const bonusMinutes = Math.min(Math.floor(durationSecs / 60) - 1, 45);
  const xpEarned = 15 + Math.max(bonusMinutes, 0);
  await prisma.user.update({
    where: { id: session.user.id },
    data: { xp: { increment: xpEarned } },
  });

  return NextResponse.json({ ok: true, sessionId: studySession.id, xpEarned });
}
