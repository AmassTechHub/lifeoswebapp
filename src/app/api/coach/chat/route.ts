import { NextResponse } from "next/server";

import { auth } from "@/lib/auth";
import { getUserContextSummary } from "@/lib/ai/user-context";
import { prisma } from "@/lib/prisma";
import { headers } from "next/headers";

function buildSystemPrompt(user: {
  name: string;
  primaryGoal: string | null;
  useCase: string | null;
  workSchedule: string | null;
}): string {
  const parts: string[] = [];
  parts.push(`You are Life OS AI Coach for ${user.name}.`);
  parts.push(
    "You help with: daily planning, study (notes, summaries, flashcards), content creation, tasks, goals, habits, and finance awareness."
  );
  if (user.primaryGoal) {
    parts.push(`Their current primary goal: "${user.primaryGoal}".`);
  }
  if (user.useCase) {
    try {
      const cases = JSON.parse(user.useCase) as string[];
      if (cases.length > 0) parts.push(`They use Life OS for: ${cases.join(", ")}.`);
    } catch {}
  }
  if (user.workSchedule) {
    try {
      const s = JSON.parse(user.workSchedule) as {
        days?: string[];
        startTime?: string;
        endTime?: string;
      };
      if (s.days && s.startTime && s.endTime) {
        parts.push(`Work schedule: ${s.days.join(", ")}, ${s.startTime}–${s.endTime}.`);
      }
    } catch {}
  }
  parts.push("Keep answers practical, short, and actionable. No fluff.");
  parts.push("If asked to plan a day, use bullet points with times.");
  parts.push("If asked for study help, explain clearly like a tutor.");
  parts.push("If asked for content, suggest hooks, outlines, or script beats.");
  return parts.join("\n");
}

export async function POST(request: Request) {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await request.json().catch(() => ({}));
  const message = String(body.message ?? "").trim();
  const history = Array.isArray(body.history) ? body.history : [];

  if (!message) {
    return NextResponse.json({ error: "Message is required" }, { status: 400 });
  }

  const [context, userRecord] = await Promise.all([
    getUserContextSummary(session.user.id),
    prisma.user.findUnique({
      where: { id: session.user.id },
      select: { openAiKey: true, name: true, primaryGoal: true, useCase: true, workSchedule: true },
    }),
  ]);
  const apiKey = (userRecord?.openAiKey?.trim() || process.env.OPENAI_API_KEY?.trim()) ?? "";
  if (!apiKey) {
    return NextResponse.json({
      reply:
        "AI Coach is ready, but OPENAI_API_KEY is not set yet. Add it to your .env file, restart the server, and ask again. Until then: open Focus for deep work, Learning for notes and flashcards, and Content Hub to move videos through your pipeline.",
      configured: false,
    });
  }

  const systemPrompt = buildSystemPrompt({
    name: userRecord?.name ?? session.user.name ?? "there",
    primaryGoal: userRecord?.primaryGoal ?? null,
    useCase: userRecord?.useCase ?? null,
    workSchedule: userRecord?.workSchedule ?? null,
  });

  const messages = [
    {
      role: "system",
      content: `${systemPrompt}\n\nLive context:\n${JSON.stringify(context)}`,
    },
    ...history
      .slice(-12)
      .map((m: { role?: string; content?: string }) => ({
        role: m.role === "assistant" ? "assistant" : "user",
        content: String(m.content ?? "").slice(0, 4000),
      })),
    { role: "user", content: message },
  ];

  try {
    const res = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: process.env.OPENAI_MODEL ?? "gpt-4o-mini",
        messages,
        max_tokens: 800,
        temperature: 0.7,
      }),
    });

    if (!res.ok) {
      const err = await res.text();
      console.error("OpenAI error:", err);
      return NextResponse.json(
        { error: "AI request failed. Check your API key and billing." },
        { status: 502 }
      );
    }

    const data = await res.json();
    const reply =
      data.choices?.[0]?.message?.content?.trim() ??
      "I could not generate a response. Try again.";

    return NextResponse.json({ reply, configured: true });
  } catch (e) {
    console.error(e);
    return NextResponse.json({ error: "AI service unavailable" }, { status: 503 });
  }
}
