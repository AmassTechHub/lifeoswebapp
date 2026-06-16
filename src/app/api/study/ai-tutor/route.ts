import { NextResponse } from "next/server";
import { headers } from "next/headers";

import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { callClaude, getServerApiKey } from "@/lib/ai/claude";
import { checkAndIncrementUsage } from "@/lib/ai/usage";
import { buildCourseContext } from "@/lib/study/course-context";

type Mode = "teach" | "quiz" | "socratic" | "predict" | "recap" | "concepts";

const SYSTEM_PROMPTS: Record<Mode, string> = {
  teach: `You are an expert university lecturer. Teach the student the course material in a clear, structured way.
Format your response with:
1. A short intro (1-2 sentences)
2. 3-5 key concepts, each with: heading, explanation, and a concrete example
3. Mark topics most likely to appear in exams with ⭐ EXAM CRITICAL
4. End with "Key takeaway:" in one sentence

Be concise and exam-focused. No filler. Teach like time is short.`,

  quiz: `You are a quiz generator for university exams. Generate exactly 5 exam-style questions from the course materials.
Mix question types: at least 2 MCQ and 2 short answer. Make them exam-realistic, not trivial.
Return ONLY valid JSON (no markdown fences):
{
  "questions": [
    {
      "id": "q1",
      "type": "mcq",
      "question": "...",
      "options": ["A. ...", "B. ...", "C. ...", "D. ..."],
      "answer": "B",
      "explanation": "..."
    },
    {
      "id": "q2",
      "type": "short",
      "question": "...",
      "sampleAnswer": "...",
      "explanation": "..."
    }
  ]
}`,

  socratic: `You are a Socratic tutor. Your ONLY job is to ask probing questions — never give direct answers or explanations.
When a student responds, acknowledge briefly then ask a deeper follow-up question.
Start with one focused question about a core concept in the course materials.
Keep each response to 2-4 sentences maximum. If the student gets stuck, give a small hint but still as a question.`,

  predict: `You are an exam prediction expert with deep knowledge of university exam patterns.
Analyze the course materials and predict the most likely exam topics.
Format your response as:
🔴 HIGH PROBABILITY (3-4 topics with brief explanation of WHY they're likely)
🟡 MEDIUM PROBABILITY (2-3 topics)
🟢 WORTH KNOWING (2-3 topics)

For each topic, explain: "Why it's likely to appear" in one sentence.
End with: "Prepare these first:" followed by top 3 priority topics.`,

  recap: `You are creating a last-minute exam revision card. The student has limited time.
Extract the absolute essentials from the course materials.
Format:
"⚡ SPEED RECAP — [Course Name]"
Then list exactly 10 must-know points, each as:
• [Concept]: [one crisp sentence]

End with: "REMEMBER: [one core truth about this subject that ties everything together]"
No padding. No repetition. Every word must earn its place.`,

  concepts: `You are extracting core concepts for study cards. From the course materials, identify 6-8 key concepts.
Return ONLY valid JSON (no markdown fences):
{
  "concepts": [
    {
      "name": "Concept Name",
      "definition": "One-sentence definition",
      "example": "A concrete real-world or technical example",
      "hook": "A memory trick or memorable way to remember this",
      "examTip": "What examiners usually ask about this"
    }
  ]
}`,
};

export async function POST(req: Request) {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await req.json().catch(() => ({})) as {
    courseId?: string;
    mode?: Mode;
    conversationHistory?: { role: "user" | "assistant"; content: string }[];
    userMessage?: string;
  };

  const { courseId, mode = "teach", conversationHistory = [], userMessage } = body;

  if (!courseId) return NextResponse.json({ error: "courseId required" }, { status: 400 });
  if (!SYSTEM_PROMPTS[mode]) return NextResponse.json({ error: "Invalid mode" }, { status: 400 });

  const apiKey = getServerApiKey();
  if (!apiKey) return NextResponse.json({ error: "AI not configured" }, { status: 503 });

  const usage = await checkAndIncrementUsage(session.user.id);
  if (!usage.allowed) {
    return NextResponse.json({ error: "Daily AI limit reached. Upgrade to Pro for unlimited." }, { status: 429 });
  }

  const built = await buildCourseContext(session.user.id, courseId);
  if (!built) return NextResponse.json({ error: "Course not found" }, { status: 404 });

  const user = await prisma.user.findUnique({
    where: { id: session.user.id },
    select: { isPro: true, name: true },
  });

  const system = `${SYSTEM_PROMPTS[mode]}

Course materials for context:
${built.context}`;

  let messages: { role: "user" | "assistant"; content: string }[];

  if (mode === "socratic" && conversationHistory.length > 0) {
    // Socratic is conversational — include history
    messages = [
      ...conversationHistory,
      ...(userMessage ? [{ role: "user" as const, content: userMessage }] : []),
    ];
    if (messages.length === 0) {
      messages = [{ role: "user", content: `Start the Socratic session for ${built.course.name}` }];
    }
  } else if (mode === "quiz" || mode === "concepts") {
    messages = [{ role: "user", content: `Generate questions/concepts for: ${built.course.name}${built.course.code ? ` (${built.course.code})` : ""}` }];
  } else {
    messages = [{ role: "user", content: `Course: ${built.course.name}${built.course.code ? ` (${built.course.code})` : ""}. Begin.` }];
  }

  try {
    const raw = await callClaude({
      apiKey,
      system,
      messages,
      maxTokens: mode === "quiz" || mode === "concepts" ? 2000 : 1200,
      isPro: user?.isPro ?? false,
    });

    if (mode === "quiz" || mode === "concepts") {
      const jsonMatch = raw.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        try {
          const parsed = JSON.parse(jsonMatch[0]);
          return NextResponse.json({ mode, data: parsed, courseName: built.course.name });
        } catch {
          // fall through to text response
        }
      }
    }

    return NextResponse.json({ mode, text: raw, courseName: built.course.name });
  } catch {
    return NextResponse.json({ error: "AI request failed. Try again." }, { status: 500 });
  }
}
