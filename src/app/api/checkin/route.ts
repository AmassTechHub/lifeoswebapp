import { headers } from "next/headers";
import { NextResponse } from "next/server";

import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { callClaude, getServerApiKey } from "@/lib/ai/claude";
import { checkAndIncrementUsage } from "@/lib/ai/usage";
import { getCoursesToday, getFlashcardsDueCount } from "@/lib/study/today";

type FocusItem = { id: string; title: string; category: string };

async function generateDailyPlan(userId: string, topPriority: string): Promise<FocusItem[] | null> {
  const apiKey = getServerApiKey();
  if (!apiKey) return null;

  const usage = await checkAndIncrementUsage(userId);
  if (!usage.allowed) return null;

  const todayStart = new Date();
  todayStart.setHours(0, 0, 0, 0);
  const todayEnd = new Date(todayStart);
  todayEnd.setDate(todayEnd.getDate() + 1);

  const [user, coursesToday, flashcardsDue, tasksDue, habits] = await Promise.all([
    prisma.user.findUnique({ where: { id: userId }, select: { name: true, isPro: true } }),
    getCoursesToday(userId),
    getFlashcardsDueCount(userId),
    prisma.task.findMany({
      where: { userId, completed: false, OR: [{ dueDate: { lt: todayEnd } }, { dueDate: null }] },
      orderBy: { dueDate: "asc" },
      take: 8,
      select: { title: true, category: true, dueDate: true },
    }),
    prisma.habit.findMany({
      where: { userId },
      include: { logs: { where: { date: { gte: todayStart, lt: todayEnd }, completed: true } } },
    }),
  ]);

  const habitsLeft = habits.filter((h) => h.logs.length === 0).map((h) => h.name);

  const system = `You are building today's focus list for a student/professional using a personal productivity app.
Blend what they say they're focused on today with their real schedule into a short, concrete, prioritized list of 4-7 things to actually do today. Reference course names and specific numbers directly (e.g. "Review 12 flashcards", "Class: CSM 388 at 10:30"). Don't invent tasks that weren't given to you. Order by importance — their stated focus and anything time-sensitive (classes, due tasks) first.

Return ONLY valid JSON (no markdown fences):
{ "items": [ { "title": "...", "category": "ACADEMICS"|"CODING"|"CONTENT"|"CLIENTS"|"PERSONAL" } ] }`;

  const userMessage = `Student: ${user?.name ?? "there"}
Stated focus today: ${topPriority || "(not specified)"}

Classes today: ${coursesToday.length === 0 ? "none" : coursesToday.map((c) => `${c.name} at ${c.startTime}`).join(", ")}
Flashcards due for review: ${flashcardsDue}
Tasks due/pending: ${tasksDue.length === 0 ? "none" : tasksDue.map((t) => t.title).join(", ")}
Habits not done today: ${habitsLeft.length === 0 ? "none" : habitsLeft.join(", ")}`;

  try {
    const raw = await callClaude({
      apiKey,
      system,
      messages: [{ role: "user", content: userMessage }],
      maxTokens: 600,
      isPro: user?.isPro ?? false,
    });
    const jsonMatch = raw.match(/\{[\s\S]*\}/);
    if (!jsonMatch) return null;
    const parsed = JSON.parse(jsonMatch[0]) as { items: { title: string; category: string }[] };
    if (!Array.isArray(parsed.items) || parsed.items.length === 0) return null;
    return parsed.items.map((item, i) => ({ id: `plan-${i}`, title: item.title, category: item.category }));
  } catch {
    return null;
  }
}

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

  // Build today's focus list from what they said they're focused on, blended
  // with their actual classes, due tasks, and spaced-repetition reviews.
  // Best-effort: if AI is unavailable or fails, the dashboard's existing
  // rule-based fallback (tasks due today) takes over — never block check-in.
  const plan = await generateDailyPlan(session.user.id, topPriority);
  if (plan) {
    await prisma.daySnapshot.update({
      where: { userId_date: { userId: session.user.id, date: today } },
      data: { focusJson: JSON.stringify(plan) },
    });
  }

  return NextResponse.json({ ok: true, plan });
}
