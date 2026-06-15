import { NextResponse } from "next/server";
import { headers } from "next/headers";

import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { callClaude, getServerApiKey } from "@/lib/ai/claude";
import { checkAndIncrementUsage } from "@/lib/ai/usage";

export async function POST(request: Request) {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const apiKey = getServerApiKey();
  if (!apiKey) {
    return NextResponse.json({ error: "AI not configured" }, { status: 503 });
  }

  const usage = await checkAndIncrementUsage(session.user.id);
  if (!usage.allowed) {
    return NextResponse.json({ error: "Daily AI limit reached. Upgrade to Pro for unlimited access." }, { status: 429 });
  }

  const body = await request.json().catch(() => ({}));
  const { topic, hook, channel, style } = body as {
    topic: string;
    hook?: string;
    channel?: string;
    style?: string;
  };

  if (!topic) return NextResponse.json({ error: "Topic is required" }, { status: 400 });

  const userRecord = await prisma.user.findUnique({
    where: { id: session.user.id },
    select: { isPro: true, name: true },
  });

  const system = `You are an expert YouTube script writer for tech and educational content creators in Ghana and Africa.
Write a complete, engaging video script that:
1. Opens with the exact hook provided (or creates a strong hook if none given)
2. Has a natural intro that addresses the viewer's pain/curiosity
3. Includes 3-5 main sections with clear talking points and transitions
4. Uses conversational, relatable language (not formal/corporate)
5. Ends with a clear call-to-action (subscribe, comment, follow)

Format your response as:
## Hook
[Hook text]

## Intro
[Intro script]

## Section 1: [Title]
[Content]

## Section 2: [Title]
[Content]

[Continue for all sections...]

## Outro & CTA
[Closing lines]

---
Estimated duration: X minutes`;

  try {
    const script = await callClaude({
      apiKey,
      system,
      messages: [{
        role: "user",
        content: `Topic: ${topic}
Hook: ${hook || "Create a compelling hook for this topic"}
Channel: ${channel || "Tech/Education"}
Style: ${style || "Educational, conversational, engaging"}
Creator: ${userRecord?.name ?? "Content Creator"}`,
      }],
      maxTokens: 1500,
      isPro: userRecord?.isPro ?? false,
    });

    return NextResponse.json({ script });
  } catch {
    return NextResponse.json({ error: "Script generation failed. Try again." }, { status: 500 });
  }
}
