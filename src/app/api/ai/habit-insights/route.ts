import { NextResponse } from "next/server";
import { headers } from "next/headers";

import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { callClaude, getServerApiKey } from "@/lib/ai/claude";
import { checkAndIncrementUsage } from "@/lib/ai/usage";

function subDays(date: Date, days: number): Date {
  const d = new Date(date);
  d.setDate(d.getDate() - days);
  return d;
}

function fmtDateKey(date: Date): string {
  return date.toISOString().slice(0, 10);
}

export async function POST() {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const apiKey = getServerApiKey();
  if (!apiKey) {
    return NextResponse.json({ insights: "Add your ANTHROPIC_API_KEY to enable habit insights." });
  }

  const usage = await checkAndIncrementUsage(session.user.id);
  if (!usage.allowed) {
    return NextResponse.json({ insights: "Daily AI limit reached. Come back tomorrow or upgrade to Pro." });
  }

  const userRecord = await prisma.user.findUnique({
    where: { id: session.user.id },
    select: { isPro: true, name: true },
  });

  const since = subDays(new Date(), 28);
  const habits = await prisma.habit.findMany({
    where: { userId: session.user.id },
    include: {
      logs: {
        where: { date: { gte: since }, completed: true },
        orderBy: { date: "asc" },
      },
    },
    orderBy: { createdAt: "asc" },
  });

  if (habits.length === 0) {
    return NextResponse.json({ insights: "You don't have any habits set up yet. Add some habits first to get AI insights!" });
  }

  const habitSummaries = habits.map((h) => {
    const totalDays = 28;
    const completedDays = h.logs.length;
    const rate = Math.round((completedDays / totalDays) * 100);

    // Find streaks
    const logDates = new Set(h.logs.map((l) => fmtDateKey(l.date)));
    let currentStreak = 0;
    for (let i = 0; i < totalDays; i++) {
      const d = fmtDateKey(subDays(new Date(), i));
      if (logDates.has(d)) currentStreak++;
      else break;
    }

    return `${h.name}: ${completedDays}/${totalDays} days (${rate}%), current streak: ${currentStreak} days`;
  });

  const system = `You are a habit coach AI. Analyze the user's 28-day habit data and provide specific, actionable insights.
Structure your response as:
1. Start with a brief overall assessment (1-2 sentences)
2. Highlight 1-2 strongest habits with what's working
3. Identify 1-2 habits needing improvement with specific, practical tips
4. End with ONE concrete challenge for the next 7 days

Keep it under 200 words. Be warm but direct. Address the user by name.`;

  try {
    const insights = await callClaude({
      apiKey,
      system,
      messages: [{
        role: "user",
        content: `Name: ${userRecord?.name ?? "User"}
28-day habit data:
${habitSummaries.join("\n")}`,
      }],
      maxTokens: 400,
      isPro: userRecord?.isPro ?? false,
    });
    return NextResponse.json({ insights });
  } catch {
    return NextResponse.json({ insights: "Could not generate insights right now. Try again." });
  }
}
