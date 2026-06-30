import { NextResponse } from "next/server";
import { headers } from "next/headers";

import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { callClaude, getServerApiKey } from "@/lib/ai/claude";
import { checkAndIncrementUsage } from "@/lib/ai/usage";
import { extractTextFromPdf } from "@/lib/timetable/extract";

const SYSTEM = `You are an expert exam coach who analyses past exam papers and course notes.
Your job is to generate practice questions that mimic the exact style, difficulty, and format of the provided past paper.

Return ONLY valid JSON — no markdown fences, no extra text:
{
  "paperSummary": "2-sentence description of what this exam tests and its style",
  "topTopics": ["topic1", "topic2", "topic3", "topic4", "topic5"],
  "questions": [
    {
      "id": "q1",
      "type": "mcq",
      "marks": 2,
      "question": "...",
      "options": ["A. ...", "B. ...", "C. ...", "D. ..."],
      "answer": "B",
      "explanation": "Why this is correct, and why the other options are wrong.",
      "examTip": "What the examiner is testing here — what to watch for."
    },
    {
      "id": "q2",
      "type": "short",
      "marks": 5,
      "question": "...",
      "markingScheme": ["Point 1 (1 mark)", "Point 2 (2 marks)", "Point 3 (2 marks)"],
      "sampleAnswer": "A complete model answer.",
      "examTip": "Common mistakes students make on this type of question."
    },
    {
      "id": "q3",
      "type": "essay",
      "marks": 10,
      "question": "...",
      "markingScheme": ["Introduction with clear thesis (2 marks)", "Point A with evidence (3 marks)", "Point B with evidence (3 marks)", "Conclusion (2 marks)"],
      "sampleAnswer": "A full model answer showing the expected depth.",
      "examTip": "Key terms the examiner expects to see."
    }
  ]
}

Rules:
- Generate 8-12 questions total — spread MCQ, short answer, and essay in proportion to the original paper
- Match the marks allocation of the original paper style
- Use content from BOTH the past paper AND the course notes/materials if provided
- Make questions exam-realistic — not trivial, not obscure
- Every question must have examTip populated — this is what makes the system valuable`;

export async function POST(request: Request) {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const apiKey = getServerApiKey();
  if (!apiKey) return NextResponse.json({ error: "AI not configured. Add ANTHROPIC_API_KEY." }, { status: 503 });

  const usage = await checkAndIncrementUsage(session.user.id);
  if (!usage.allowed) return NextResponse.json({ error: "Daily AI limit reached. Upgrade to Pro." }, { status: 429 });

  const formData = await request.formData().catch(() => null);
  if (!formData) return NextResponse.json({ error: "No form data" }, { status: 400 });

  const courseId = String(formData.get("courseId") ?? "");
  const file = formData.get("file") as File | null;

  if (!courseId) return NextResponse.json({ error: "courseId required" }, { status: 400 });
  if (!file) return NextResponse.json({ error: "Past paper file required" }, { status: 400 });

  // Verify course belongs to user
  const course = await prisma.studyCourse.findFirst({
    where: { id: courseId, userId: session.user.id },
    include: {
      notes: { take: 5, orderBy: { updatedAt: "desc" } },
      materials: { take: 3, orderBy: { createdAt: "desc" } },
    },
  });
  if (!course) return NextResponse.json({ error: "Course not found" }, { status: 404 });

  // Extract text from uploaded past paper
  let pastPaperText = "";
  try {
    const buffer = Buffer.from(await file.arrayBuffer());
    if (file.type === "application/pdf" || file.name.toLowerCase().endsWith(".pdf")) {
      pastPaperText = await extractTextFromPdf(buffer);
    } else if (file.type === "text/plain") {
      pastPaperText = buffer.toString("utf-8");
    } else {
      return NextResponse.json({ error: "Upload a PDF or text file of the past paper" }, { status: 400 });
    }
  } catch {
    return NextResponse.json({ error: "Could not read the file. Make sure it's a valid PDF." }, { status: 422 });
  }

  if (!pastPaperText.trim()) {
    return NextResponse.json({ error: "Could not extract text from this PDF. Try a text-based PDF (not a scanned image)." }, { status: 422 });
  }

  // Build course context (notes + existing materials)
  const notesContext = course.notes
    .map((n) => `[Note: ${n.title}]\n${n.content.slice(0, 800)}`)
    .join("\n\n");

  const user = await prisma.user.findUnique({
    where: { id: session.user.id },
    select: { isPro: true },
  });

  const prompt = `Course: ${course.name}${course.code ? ` (${course.code})` : ""}

PAST EXAM PAPER (analyse style, format, difficulty, mark allocation):
${pastPaperText.slice(0, 6000)}

COURSE NOTES (use as content source for new questions):
${notesContext.slice(0, 3000) || "(No notes uploaded yet — generate questions from the past paper alone)"}

Generate practice questions that match this paper's style exactly.`;

  try {
    const raw = await callClaude({
      apiKey,
      system: SYSTEM,
      messages: [{ role: "user", content: prompt }],
      maxTokens: 4000,
      isPro: user?.isPro ?? false,
    });

    const jsonMatch = raw.match(/\{[\s\S]*\}/);
    if (!jsonMatch) {
      return NextResponse.json({ error: "AI returned an unexpected format. Try again." }, { status: 422 });
    }

    const parsed = JSON.parse(jsonMatch[0]);
    return NextResponse.json({
      ok: true,
      courseName: course.name,
      paperName: file.name.replace(/\.[^/.]+$/, ""),
      ...parsed,
    });
  } catch (err) {
    const msg = err instanceof Error ? err.message : "Unknown error";
    console.error("[past-paper] error:", msg);
    return NextResponse.json({ error: "AI processing failed. Try again." }, { status: 500 });
  }
}
