import { NextResponse } from "next/server";
import { headers } from "next/headers";

import { auth } from "@/lib/auth";
import { buildCourseContext, type StudySource } from "@/lib/study/course-context";

const SYSTEM = `You are Life OS Study Brain. Answer using ONLY the student's materials.
Return JSON only: {"answer":"string","citations":[{"sourceId":"id from context","quote":"short quote"}]}
Include 1-4 citations from the most relevant sources.`;

export async function POST(request: Request) {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await request.json().catch(() => ({}));
  const courseId = String(body.courseId ?? "");
  const question = String(body.question ?? "").trim();

  if (!courseId || !question) {
    return NextResponse.json({ error: "courseId and question required" }, { status: 400 });
  }

  const built = await buildCourseContext(session.user.id, courseId);
  if (!built) {
    return NextResponse.json({ error: "Course not found" }, { status: 404 });
  }

  const apiKey = process.env.OPENAI_API_KEY?.trim();
  if (!apiKey) {
    return NextResponse.json({
      reply: "Set OPENAI_API_KEY to use Study Brain.",
      citations: [],
      configured: false,
    });
  }

  const sourceIndex = built.sources
    .map((s) => `[${s.kind}:${s.id}] ${s.title}`)
    .join("\n");

  const res = await fetch("https://api.openai.com/v1/chat/completions", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model: process.env.OPENAI_MODEL ?? "gpt-4o-mini",
      messages: [
        { role: "system", content: SYSTEM },
        {
          role: "user",
          content: `Sources:\n${sourceIndex}\n\nContext:\n${built.context}\n\nQuestion: ${question}`,
        },
      ],
      max_tokens: 1000,
      temperature: 0.35,
    }),
  });

  if (!res.ok) {
    return NextResponse.json({ error: "AI request failed" }, { status: 502 });
  }

  const data = await res.json();
  const raw = String(data.choices?.[0]?.message?.content ?? "").trim();

  let reply = raw;
  let citations: { sourceId: string; title: string; quote: string; kind: string }[] = [];

  try {
    const jsonMatch = raw.match(/\{[\s\S]*\}/);
    if (jsonMatch) {
      const parsed = JSON.parse(jsonMatch[0]) as {
        answer?: string;
        citations?: { sourceId?: string; quote?: string }[];
      };
      reply = parsed.answer ?? raw;
      citations = (parsed.citations ?? [])
        .map((c) => {
          const source = built.sources.find((s) => s.id === c.sourceId);
          if (!source) return null;
          return {
            sourceId: source.id,
            title: source.title,
            quote: String(c.quote ?? "").slice(0, 200),
            kind: source.kind,
          };
        })
        .filter(Boolean) as typeof citations;
    }
  } catch {
    citations = built.sources.slice(0, 2).map((s: StudySource) => ({
      sourceId: s.id,
      title: s.title,
      quote: s.excerpt.slice(0, 120),
      kind: s.kind,
    }));
  }

  return NextResponse.json({
    reply,
    citations,
    configured: true,
    courseName: built.course.name,
  });
}
