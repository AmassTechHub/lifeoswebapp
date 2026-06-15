import { NextResponse } from "next/server";
import { headers } from "next/headers";

import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { callClaude, getServerApiKey } from "@/lib/ai/claude";
import { checkAndIncrementUsage } from "@/lib/ai/usage";

export async function POST(request: Request) {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await request.json().catch(() => ({}));
  const { mood, content, wins, blockers } = body as {
    mood: string; content: string; wins: string; blockers: string;
  };

  const apiKey = getServerApiKey();
  if (!apiKey) {
    return NextResponse.json({ reflection: "Add your ANTHROPIC_API_KEY to enable AI reflections." });
  }

  const usage = await checkAndIncrementUsage(session.user.id);
  if (!usage.allowed) {
    return NextResponse.json({ reflection: "Daily AI limit reached. Come back tomorrow or upgrade to Pro." });
  }

  const userRecord = await prisma.user.findUnique({
    where: { id: session.user.id },
    select: { isPro: true, name: true },
  });

  const system = `You are a compassionate AI life coach. A student just wrote their daily journal entry.
Write a 3-4 sentence personalized reflection that:
1. Acknowledges their mood and validates their feelings
2. Celebrates at least one win specifically
3. Offers ONE concrete coaching tip for their blocker
4. Ends with a brief motivational close
Keep it warm, specific, and not generic. Address them directly. Do NOT use bullet points — write in flowing prose.`;

  try {
    const reflection = await callClaude({
      apiKey,
      system,
      messages: [{
        role: "user",
        content: `Name: ${userRecord?.name ?? "Student"}
Mood: ${mood}
What happened today: ${content || "Nothing written"}
Wins: ${wins || "Nothing listed"}
Blockers: ${blockers || "Nothing listed"}`,
      }],
      maxTokens: 300,
      isPro: userRecord?.isPro ?? false,
    });
    return NextResponse.json({ reflection });
  } catch {
    return NextResponse.json({ reflection: "Could not generate reflection right now. Try again." });
  }
}
