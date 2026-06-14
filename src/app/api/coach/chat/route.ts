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
  const apiKey = (userRecord?.openAiKey?.trim() || process.env.ANTHROPIC_API_KEY?.trim()) ?? "";
  if (!apiKey) {
    return NextResponse.json({
      reply:
        "AI Coach is ready, but no Claude API key is set yet. Go to Settings → AI Coach and paste your Anthropic API key (get one free at console.anthropic.com).",
      configured: false,
    });
  }

  const systemPrompt = buildSystemPrompt({
    name: userRecord?.name ?? session.user.name ?? "there",
    primaryGoal: userRecord?.primaryGoal ?? null,
    useCase: userRecord?.useCase ?? null,
    workSchedule: userRecord?.workSchedule ?? null,
  });

  const chatMessages = [
    ...history
      .slice(-12)
      .map((m: { role?: string; content?: string }) => ({
        role: m.role === "assistant" ? "assistant" : "user",
        content: String(m.content ?? "").slice(0, 4000),
      })),
    { role: "user", content: message },
  ];

  try {
    const res = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "x-api-key": apiKey,
        "anthropic-version": "2023-06-01",
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: process.env.ANTHROPIC_MODEL ?? "claude-haiku-4-5-20251001",
        max_tokens: 1024,
        system: `${systemPrompt}\n\nLive context:\n${JSON.stringify(context)}`,
        messages: chatMessages,
      }),
    });

    if (!res.ok) {
      const err = await res.text();
      console.error("Anthropic error:", err);
      return NextResponse.json(
        { error: "AI request failed. Check your Claude API key in Settings." },
        { status: 502 }
      );
    }

    const data = await res.json();
    const reply =
      (data.content as { type: string; text: string }[])?.[0]?.text?.trim() ??
      "I could not generate a response. Try again.";

    return NextResponse.json({ reply, configured: true });
  } catch (e) {
    console.error(e);
    return NextResponse.json({ error: "AI service unavailable" }, { status: 503 });
  }
}
