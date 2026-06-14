import { NextResponse } from "next/server";

import { runEveningCycle, runMorningCycle, runWeeklyCycle } from "@/lib/engine/life-cycles";
import { prisma } from "@/lib/prisma";

function unauthorized() {
  return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
}

export async function POST(request: Request) {
  const authHeader = request.headers.get("authorization") ?? "";
  const token = authHeader.startsWith("Bearer ") ? authHeader.slice(7).trim() : "";
  const secret = process.env.CRON_SECRET?.trim();
  if (!secret || token !== secret) {
    return unauthorized();
  }

  const body = (await request.json().catch(() => ({}))) as { userId?: string; mode?: string };
  const mode = body.mode === "evening" ? "evening" : body.mode === "weekly" ? "weekly" : "morning";

  const users = body.userId
    ? [{ id: body.userId }]
    : await prisma.user.findMany({ select: { id: true }, take: 200 });

  const results: Array<{ userId: string; summary: string }> = [];

  for (const user of users) {
    if (mode === "morning") {
      const r = await runMorningCycle(user.id);
      results.push({ userId: user.id, summary: r.summary });
    } else if (mode === "evening") {
      const r = await runEveningCycle(user.id);
      results.push({ userId: user.id, summary: r.summary });
    } else {
      const r = await runWeeklyCycle(user.id);
      results.push({ userId: user.id, summary: r.summary });
    }
  }

  return NextResponse.json({
    ok: true,
    mode,
    processed: results.length,
    results,
  });
}
