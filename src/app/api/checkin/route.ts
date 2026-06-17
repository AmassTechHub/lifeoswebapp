import { headers } from "next/headers";
import { NextResponse } from "next/server";

import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

function todayUTC() {
  const d = new Date();
  d.setUTCHours(0, 0, 0, 0);
  return d;
}

export async function GET() {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const snapshot = await prisma.daySnapshot.findFirst({
    where: { userId: session.user.id, date: { gte: todayUTC() } },
    select: { energyLevel: true, topPriority: true },
  });

  return NextResponse.json({
    done: snapshot?.energyLevel != null,
    energyLevel: snapshot?.energyLevel ?? null,
    topPriority: snapshot?.topPriority ?? null,
  });
}

export async function POST(request: Request) {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await request.json().catch(() => ({}));
  const energyLevel = Number(body.energyLevel);
  const topPriority = String(body.topPriority ?? "").trim();

  if (!energyLevel || energyLevel < 1 || energyLevel > 5) {
    return NextResponse.json({ error: "Invalid energy level (1-5)" }, { status: 400 });
  }

  const today = todayUTC();

  await prisma.daySnapshot.upsert({
    where: { userId_date: { userId: session.user.id, date: today } },
    update: { energyLevel, topPriority },
    create: {
      userId: session.user.id,
      date: today,
      score: energyLevel * 20,
      breakdown: "{}",
      focusJson: "{}",
      energyLevel,
      topPriority,
    },
  });

  // Award 5 XP for daily check-in
  await prisma.user.update({
    where: { id: session.user.id },
    data: { xp: { increment: 5 } },
  });

  return NextResponse.json({ ok: true });
}
