import { NextResponse } from "next/server";
import { headers } from "next/headers";

import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
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

  const userRecord = await prisma.user.findUnique({
    where: { id: session.user.id },
    select: { openAiKey: true },
  });
  const apiKey = userRecord?.openAiKey?.trim() || process.env.OPENAI_API_KEY?.trim() || "";
  if (!apiKey) {
    return NextResponse.json({
      error: "OPENAI_API_KEY required for Study Brain generation",
      configured: false,
    }, { status: 503 });
  }

  const prompts: Record<GenerateAction, string> = {
    summary: `From this course context, write a clear exam-ready summary with headings and key definitions. Return markdown only.`,
    flashcards: `From this course context, return ONLY a JSON array: [{"front":"question","back":"answer"}]. Create 8-12 high-quality flashcards.`,
    "exam-prep": `From this course context, list: 1) Top 5 topics to master 2) Common mistakes 3) 10 rapid-fire Q&A pairs. Use markdown.`,
  };

  const res = await fetch("https://api.openai.com/v1/chat/completions", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model: process.env.OPENAI_MODEL ?? "gpt-4o-mini",
      messages: [
        {
          role: "user",
          content: `${prompts[action] ?? prompts.summary}\n\nContext:\n${built.context}`,
        },
      ],
      max_tokens: 1200,
      temperature: 0.3,
    }),
  });

  if (!res.ok) {
    return NextResponse.json({ error: "AI generation failed" }, { status: 502 });
  }

  const data = await res.json();
  const raw = String(data.choices?.[0]?.message?.content ?? "").trim();

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
