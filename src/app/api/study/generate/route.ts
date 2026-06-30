import { NextResponse } from "next/server";
import { headers } from "next/headers";

import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { callClaude, getServerApiKey } from "@/lib/ai/claude";
import { checkAndIncrementUsage } from "@/lib/ai/usage";
import { buildCourseContext } from "@/lib/study/course-context";

type GenerateAction = "summary" | "flashcards" | "exam-prep";

export async function POST(request: Request) {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await request.json().catch(() => ({}));
  const courseId = String(body.courseId ?? "");
  const action = String(body.action ?? "summary") as GenerateAction;

  if (!courseId) {
    return NextResponse.json({ error: "courseId required" }, { status: 400 });
  }

  const built = await buildCourseContext(session.user.id, courseId);
  if (!built) {
    return NextResponse.json({ error: "Course not found" }, { status: 404 });
  }

  const apiKey = getServerApiKey();
  if (!apiKey) {
    return NextResponse.json({ error: "AI not configured. Add ANTHROPIC_API_KEY.", configured: false }, { status: 503 });
  }

  const usage = await checkAndIncrementUsage(session.user.id);
  if (!usage.allowed) {
    return NextResponse.json({ error: "Daily AI limit reached. Upgrade to Pro for unlimited.", configured: true }, { status: 429 });
  }

  const userRecord = await prisma.user.findUnique({
    where: { id: session.user.id },
    select: { isPro: true },
  });

  const systems: Record<GenerateAction, string> = {
    summary: "You are a study assistant. Write a clear, exam-ready summary with headings and key definitions. Return markdown only.",
    flashcards: 'You are a flashcard generator. Return ONLY a JSON array: [{"front":"question","back":"answer"}]. Create 8-12 high-quality flashcards. No markdown fences.',
    "exam-prep": "You are an exam coach. List: 1) Top 5 topics to master 2) Common mistakes 3) 10 rapid-fire Q&A pairs. Use markdown.",
  };

  const raw = await callClaude({
    apiKey,
    system: systems[action] ?? systems.summary,
    messages: [{ role: "user", content: `Course context:\n${built.context}` }],
    maxTokens: 1400,
    isPro: userRecord?.isPro ?? false,
  }).catch((err: unknown) => {
    console.error("[study/generate] Claude error:", err instanceof Error ? err.message : err);
    return null;
  });

  if (!raw) {
    return NextResponse.json({ error: "AI is temporarily unavailable. Please try again." }, { status: 503 });
  }

  if (action === "summary") {
    const note = await prisma.studyNote.create({
      data: {
        courseId,
        title: `AI Summary · ${new Date().toLocaleDateString()}`,
        content: raw,
        type: "SUMMARY",
      },
    });
    return NextResponse.json({ ok: true, action, noteId: note.id, content: raw });
  }

  if (action === "flashcards") {
    const match = raw.match(/\[[\s\S]*\]/);
    let created = 0;
    if (match) {
      try {
        const cards = JSON.parse(match[0]) as { front?: string; back?: string }[];
        for (const card of cards.slice(0, 15)) {
          const front = String(card.front ?? "").trim();
          const back = String(card.back ?? "").trim();
          if (!front || !back) continue;
          await prisma.flashcard.create({
            data: { userId: session.user.id, courseId, front, back },
          });
          created += 1;
        }
      } catch {
        return NextResponse.json({ error: "Could not parse flashcards" }, { status: 422 });
      }
    }
    return NextResponse.json({ ok: true, action, flashcardsCreated: created });
  }

  return NextResponse.json({ ok: true, action, content: raw });
}
