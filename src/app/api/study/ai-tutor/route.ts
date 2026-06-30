import { NextResponse } from "next/server";
import { headers } from "next/headers";

import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { callClaude, getServerApiKey } from "@/lib/ai/claude";
import { checkAndIncrementUsage } from "@/lib/ai/usage";
import { buildCourseContext } from "@/lib/study/course-context";

type Mode =
  | "teach" | "quiz" | "examPrep" | "socratic" | "predict" | "recap" | "concepts" | "voice"
  | "podcast" | "studyGuide" | "mindmap";

const CITATION_RULE = `
CITATION RULE: Each source in the course materials below is tagged like [S1], [S2]. After every claim, fact, or concept you state, cite the exact tag it came from, e.g. "Binary search runs in O(log n) [S2]." Use only tags that appear in the materials — never invent one. If a point draws on multiple sources, cite all of them, e.g. [S1][S3].`;

function examPrepPrompt(numQuestions: number): string {
  return `You are an exam-prep quiz generator for university exams. Generate exactly ${numQuestions} multiple-choice questions (A-D only) covering EVERYTHING examinable in the provided course materials, notes, and flashcards — spread questions across all topics and sources given, not just the first few. Vary difficulty: roughly a third easy/recall, a third applied, a third tricky/discriminating.
Each source below is tagged [S1], [S2] etc. — record which tag each question is drawn from.
Return ONLY valid JSON (no markdown fences):
{
  "questions": [
    {
      "id": "q1",
      "question": "...",
      "options": ["A. ...", "B. ...", "C. ...", "D. ..."],
      "answer": "B",
      "explanation": "One sentence on why this is correct and why the others are wrong.",
      "source": "S2"
    }
  ]
}`;
}

const SYSTEM_PROMPTS: Record<Exclude<Mode, "examPrep">, string> = {
  teach: `You are an expert university lecturer. Teach the student the course material in a clear, structured way.
Format your response with:
1. A short intro (1-2 sentences)
2. 3-5 key concepts, each with: heading, explanation, and a concrete example
3. Mark topics most likely to appear in exams with ⭐ EXAM CRITICAL
4. End with "Key takeaway:" in one sentence

Be concise and exam-focused. No filler. Teach like time is short.
${CITATION_RULE}`,

  quiz: `You are a quiz generator for university exams. Generate exactly 5 exam-style questions from the course materials.
Mix question types: at least 2 MCQ and 2 short answer. Make them exam-realistic, not trivial.
Each source below is tagged [S1], [S2] etc. — record which tag each question is drawn from.
Return ONLY valid JSON (no markdown fences):
{
  "questions": [
    {
      "id": "q1",
      "type": "mcq",
      "question": "...",
      "options": ["A. ...", "B. ...", "C. ...", "D. ..."],
      "answer": "B",
      "explanation": "...",
      "source": "S1"
    },
    {
      "id": "q2",
      "type": "short",
      "question": "...",
      "sampleAnswer": "...",
      "explanation": "...",
      "source": "S2"
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
End with: "Prepare these first:" followed by top 3 priority topics.
${CITATION_RULE}`,

  recap: `You are creating a last-minute exam revision card. The student has limited time.
Extract the absolute essentials from the course materials.
Format:
"⚡ SPEED RECAP — [Course Name]"
Then list exactly 10 must-know points, each as:
• [Concept]: [one crisp sentence]

End with: "REMEMBER: [one core truth about this subject that ties everything together]"
No padding. No repetition. Every word must earn its place.
${CITATION_RULE}`,

  concepts: `You are extracting core concepts for study cards. From the course materials, identify 6-8 key concepts.
Each source below is tagged [S1], [S2] etc. — record which tag each concept is drawn from.
Return ONLY valid JSON (no markdown fences):
{
  "concepts": [
    {
      "name": "Concept Name",
      "definition": "One-sentence definition",
      "example": "A concrete real-world or technical example",
      "hook": "A memory trick or memorable way to remember this",
      "examTip": "What examiners usually ask about this",
      "source": "S1"
    }
  ]
}`,

  voice: `You are an engaging audio lecturer creating a spoken walkthrough of course material for text-to-speech playback.
Return ONLY valid JSON (no markdown fences):
{
  "sections": [
    {
      "title": "Section Title",
      "script": "The spoken text for this section. Write in natural conversational prose — complete sentences that flow well when read aloud. No bullet points, no headings, no markdown. Each section should be 3-6 sentences."
    }
  ],
  "totalEstimatedMinutes": 8
}

Rules:
- Create 5-8 sections covering the key topics in a logical order
- Begin with an engaging introduction that names the course/topic
- End with a summary that reinforces the most important points
- Include an exam tip in at least 2 sections, woven naturally into the prose
- Estimate totalEstimatedMinutes at roughly 130 words per minute
- Write every script as if speaking directly to the student — warm, clear, and confident`,

  podcast: `You are producing a two-host educational podcast episode discussing this course's material — like NotebookLM's Audio Overview.
Host A ("Maya") is a curious co-host who asks questions, reacts, and summarizes for the listener.
Host B ("Dr. K") is the subject expert who explains concepts clearly with concrete examples.
Write a natural back-and-forth dialogue — short turns (1-3 sentences each), genuine conversational rhythm ("Oh that's interesting", "Wait, so you're saying..."). NOT a lecture read aloud by two voices.
Each source below is tagged [S1], [S2] etc. — cite the tag right after a claim drawn from it, e.g. "...which is why it shows up every semester [S2]."
Return ONLY valid JSON (no markdown fences):
{
  "turns": [
    { "speaker": "A", "text": "..." },
    { "speaker": "B", "text": "..." }
  ],
  "totalEstimatedMinutes": 6
}
Rules:
- 20-35 turns total
- Open with Maya introducing the topic/course by name
- Cover the most exam-relevant points across ALL the materials given, not just the first source
- Weave in at least 2 exam tips naturally as dialogue
- Close with Dr. K giving a memorable one-line takeaway
- Estimate totalEstimatedMinutes at ~130 words/min combined across all turns`,

  studyGuide: `You are creating a comprehensive auto-generated study guide from everything in the course materials.
Each source below is tagged [S1], [S2] etc. — cite the tag for each section and FAQ answer.
Return ONLY valid JSON (no markdown fences):
{
  "overview": "2-3 sentence overview of what this unit covers",
  "sections": [
    { "heading": "...", "content": "2-4 sentences explaining this topic [S1]" }
  ],
  "faq": [
    { "question": "...", "answer": "...[S2]" }
  ],
  "timeline": [
    { "label": "...", "detail": "one sentence" }
  ]
}
Rules:
- 4-7 sections covering all major topics, ordered logically
- 5-8 FAQ entries — the questions students actually ask about this material
- timeline: only include if the material has a genuine sequence (historical events, process steps, algorithm steps) — 4-8 ordered items. Otherwise return an empty array.`,

  mindmap: `You are creating a hierarchical mind map of the course material, covering its full breadth.
Return ONLY valid JSON (no markdown fences):
{
  "root": "Course or Central Topic Name",
  "children": [
    {
      "label": "Major Topic",
      "children": [
        { "label": "Sub-topic", "children": [] }
      ]
    }
  ]
}
Rules:
- 4-7 top-level branches (major topics), covering ALL materials given — not just the first source
- Each branch should have 2-5 child nodes (sub-concepts)
- Children may have one more level of nesting (grandchildren) only where genuinely useful
- Labels must be short (2-6 words), never full sentences`,
};

export async function POST(req: Request) {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await req.json().catch(() => ({})) as {
    courseId?: string;
    mode?: Mode;
    conversationHistory?: { role: "user" | "assistant"; content: string }[];
    userMessage?: string;
    numQuestions?: number;
  };

  const { courseId, mode = "teach", conversationHistory = [], userMessage } = body;
  const numQuestions = Math.min(Math.max(Math.round(body.numQuestions ?? 15), 5), 25);
  const JSON_MODES: Mode[] = ["quiz", "examPrep", "concepts", "voice", "podcast", "studyGuide", "mindmap"];
  const isJsonMode = JSON_MODES.includes(mode);

  const validModes: Mode[] = ["teach", "quiz", "examPrep", "socratic", "predict", "recap", "concepts", "voice", "podcast", "studyGuide", "mindmap"];
  if (!courseId) return NextResponse.json({ error: "courseId required" }, { status: 400 });
  if (!validModes.includes(mode)) return NextResponse.json({ error: "Invalid mode" }, { status: 400 });

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

  const system = `${mode === "examPrep" ? examPrepPrompt(numQuestions) : SYSTEM_PROMPTS[mode]}

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
  } else if (isJsonMode) {
    messages = [{ role: "user", content: `Generate content for: ${built.course.name}${built.course.code ? ` (${built.course.code})` : ""}` }];
  } else {
    messages = [{ role: "user", content: `Course: ${built.course.name}${built.course.code ? ` (${built.course.code})` : ""}. Begin.` }];
  }

  try {
    const raw = await callClaude({
      apiKey,
      system,
      messages,
      maxTokens:
        mode === "examPrep" ? 4000 :
        mode === "podcast" ? 3500 :
        mode === "studyGuide" ? 3000 :
        mode === "quiz" || mode === "concepts" || mode === "mindmap" ? 2000 :
        mode === "voice" ? 2500 : 1200,
      isPro: user?.isPro ?? false,
    });
    if (isJsonMode) {
      const jsonMatch = raw.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        try {
          const parsed = JSON.parse(jsonMatch[0]);
          return NextResponse.json({ mode, data: parsed, courseName: built.course.name, sources: built.sources });
        } catch {
          // fall through to text response
        }
      }
    }

    return NextResponse.json({ mode, text: raw, courseName: built.course.name, sources: built.sources });
  } catch {
    return NextResponse.json({ error: "AI request failed. Try again." }, { status: 500 });
  }
}
