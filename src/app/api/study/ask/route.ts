import { NextResponse } from "next/server";
import { headers } from "next/headers";

import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { callClaude, getServerApiKey } from "@/lib/ai/claude";
import { checkAndIncrementUsage } from "@/lib/ai/usage";
import { buildCourseContext, type StudySource } from "@/lib/study/course-context";

const SYSTEM = `You are Life OS Study Brain. Answer using ONLY the student's provided course materials.
Return JSON only (no markdown fences): {"answer":"string","citations":[{"sourceId":"id from context","quote":"short quote"}]}
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

  const apiKey = getServerApiKey();
  if (!apiKey) {
    return NextResponse.json({ reply: "AI not configured. Add ANTHROPIC_API_KEY.", citations: [], configured: false });
  }

  const usage = await checkAndIncrementUsage(session.user.id);
  if (!usage.allowed) {
    return NextResponse.json({ reply: "Daily AI limit reached. Upgrade to Pro for unlimited.", citations: [], configured: true });
  }

  const userRecord = await prisma.user.findUnique({
    where: { id: session.user.id },
    select: { isPro: true },
  });

  const sourceIndex = built.sources.map((s) => `[${s.kind}:${s.id}] ${s.title}`).join("\n");

  const raw = await callClaude({
    apiKey,
    system: SYSTEM,
    messages: [
      {
        role: "user",
        content: `Sources:\n${sourceIndex}\n\nContext:\n${built.context}\n\nQuestion: ${question}`,
      },
    ],
    maxTokens: 1000,
    isPro: userRecord?.isPro ?? false,
  }).catch(() => "");

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

  return NextResponse.json({ reply, citations, configured: true, courseName: built.course.name });
}
