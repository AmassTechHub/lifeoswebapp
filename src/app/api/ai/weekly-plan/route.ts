import { NextResponse } from "next/server";
import { headers } from "next/headers";

import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { callClaude, getServerApiKey } from "@/lib/ai/claude";
import { checkAndIncrementUsage } from "@/lib/ai/usage";
import { getUserContextSummary } from "@/lib/ai/user-context";

type GeneratedTask = {
  title: string;
  category: "ACADEMICS" | "CODING" | "CONTENT" | "CLIENTS" | "PERSONAL";
  day: string;
  priority: "high" | "medium" | "low";
  why: string;
};

export async function POST() {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const apiKey = getServerApiKey();
  if (!apiKey) return NextResponse.json({ error: "AI not configured", tasks: [] });

  const usage = await checkAndIncrementUsage(session.user.id);
  if (!usage.allowed) return NextResponse.json({ error: "Daily AI limit reached", tasks: [] }, { status: 429 });

  const [context, userRecord] = await Promise.all([
    getUserContextSummary(session.user.id),
    prisma.user.findUnique({ where: { id: session.user.id }, select: { isPro: true, name: true } }),
  ]);

  const today = new Date();
  const weekDays = Array.from({ length: 7 }, (_, i) => {
    const d = new Date(today);
    d.setDate(today.getDate() + i);
    return d.toLocaleDateString("en-US", { weekday: "long" });
  });

  const system = `You are Life OS AI Planner. Generate a focused weekly plan.
Return ONLY a JSON array (no markdown) of 6-8 tasks:
[{"title":"string","category":"ACADEMICS|CODING|CONTENT|CLIENTS|PERSONAL","day":"Monday","priority":"high|medium|low","why":"1-sentence reason"}]

Rules:
- Spread tasks across the week (not all on one day)
- Include at least 1 high-priority task from overdue/goals
- Include realistic tasks given the user's courses and goals
- day must be one of: ${weekDays.join(", ")}
- Keep titles short and action-oriented ("Write DSA exam notes", not "Study")`;

  try {
    const raw = await callClaude({
      apiKey,
      system,
      messages: [{
        role: "user",
        content: `Plan for: ${userRecord?.name ?? "Student"}
Week starting: ${weekDays[0]}
Context: ${JSON.stringify(context)}`,
      }],
      maxTokens: 900,
      isPro: userRecord?.isPro ?? false,
    });

    const match = raw.match(/\[[\s\S]*\]/);
    if (!match) return NextResponse.json({ tasks: [], error: "Could not parse plan" });

    const tasks = JSON.parse(match[0]) as GeneratedTask[];
    return NextResponse.json({ tasks: tasks.slice(0, 8) });
  } catch {
    return NextResponse.json({ tasks: [], error: "Failed to generate plan" });
  }
}
