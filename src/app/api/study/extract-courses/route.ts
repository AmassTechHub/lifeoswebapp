import { NextResponse } from "next/server";
import { headers } from "next/headers";

import { auth } from "@/lib/auth";
import { getServerApiKey } from "@/lib/ai/claude";

const COURSE_COLORS = [
  "#3b82f6", "#8b5cf6", "#ec4899", "#ef4444",
  "#f59e0b", "#a855f7", "#06b6d4", "#22c55e", "#f97316", "#14b8a6",
];

const SYSTEM_PROMPT = `You are extracting a university course list from student-provided text or document content.
The student may have pasted their course registration page, transcript, or any academic document.

Extract each course and return ONLY valid JSON — no markdown, no explanation:
{
  "courses": [
    {
      "name": "Full course name (e.g. 'Data Structures II')",
      "code": "Course code if present (e.g. 'CSM 388') or empty string",
      "credits": 3
    }
  ]
}

Rules:
- Extract every unique course you see. Do NOT include duplicates.
- If credits/units are shown, use them. Otherwise default to 3.
- If only a code is shown with no name, use the code as the name too.
- Ignore non-course content (grades, GPA rows, student info headers, semester headers).
- Return an empty array if no courses are found.
- Return at most 20 courses.`;

export async function POST(req: Request) {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const apiKey = getServerApiKey();
  if (!apiKey) return NextResponse.json({ error: "AI not configured" }, { status: 503 });

  const contentType = req.headers.get("content-type") ?? "";
  let inputText = "";

  if (contentType.includes("multipart/form-data")) {
    const form = await req.formData();
    const text = form.get("text");
    const file = form.get("file") as File | null;

    if (text && typeof text === "string" && text.trim()) {
      inputText = text.trim().slice(0, 12000);
    } else if (file) {
      const mimeType = file.type;

      if (mimeType === "application/pdf") {
        // Extract text from PDF using pdf-parse
        const buf = Buffer.from(await file.arrayBuffer());
        try {
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          const pdfParse = ((await import("pdf-parse")) as any).default ?? (await import("pdf-parse"));
          const result = await pdfParse(buf);
          inputText = String(result.text ?? "").trim().slice(0, 12000);
        } catch {
          return NextResponse.json({ error: "Could not read PDF. Try pasting the text instead." }, { status: 422 });
        }
      } else if (mimeType.startsWith("image/")) {
        // Use Claude vision API
        const base64 = Buffer.from(await file.arrayBuffer()).toString("base64");
        try {
          const res = await fetch("https://api.anthropic.com/v1/messages", {
            method: "POST",
            headers: {
              "x-api-key": apiKey,
              "anthropic-version": "2023-06-01",
              "Content-Type": "application/json",
            },
            body: JSON.stringify({
              model: "claude-haiku-4-5-20251001",
              max_tokens: 1500,
              system: SYSTEM_PROMPT,
              messages: [{
                role: "user",
                content: [
                  { type: "image", source: { type: "base64", media_type: mimeType, data: base64 } },
                  { type: "text", text: "Extract the course list from this image." },
                ],
              }],
            }),
          });
          if (!res.ok) return NextResponse.json({ error: "AI vision request failed." }, { status: 500 });
          const data = await res.json() as { content: { type: string; text: string }[] };
          const raw = data.content?.[0]?.text?.trim() ?? "";
          return NextResponse.json(parseCourses(raw));
        } catch {
          return NextResponse.json({ error: "AI request failed." }, { status: 500 });
        }
      } else {
        return NextResponse.json({ error: "Unsupported file type. Upload a PDF or image." }, { status: 422 });
      }
    }
  } else {
    const body = await req.json().catch(() => ({})) as { text?: string };
    inputText = (body.text ?? "").trim().slice(0, 12000);
  }

  if (!inputText) {
    return NextResponse.json({ error: "No content provided." }, { status: 400 });
  }

  try {
    const res = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "x-api-key": apiKey,
        "anthropic-version": "2023-06-01",
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "claude-haiku-4-5-20251001",
        max_tokens: 1500,
        system: SYSTEM_PROMPT,
        messages: [{ role: "user", content: inputText }],
      }),
    });

    if (!res.ok) return NextResponse.json({ error: "AI request failed." }, { status: 500 });
    const data = await res.json() as { content: { type: string; text: string }[] };
    const raw = data.content?.[0]?.text?.trim() ?? "";
    return NextResponse.json(parseCourses(raw));
  } catch {
    return NextResponse.json({ error: "AI request failed." }, { status: 500 });
  }
}

function parseCourses(raw: string) {
  const jsonMatch = raw.match(/\{[\s\S]*\}/);
  if (!jsonMatch) return { courses: [] };
  try {
    const parsed = JSON.parse(jsonMatch[0]) as { courses: { name: string; code: string; credits: number }[] };
    const courses = (parsed.courses ?? []).slice(0, 20).map((c, i) => ({
      name: String(c.name ?? "").trim(),
      code: String(c.code ?? "").trim(),
      credits: Number(c.credits) || 3,
      color: COURSE_COLORS[i % COURSE_COLORS.length],
    })).filter((c) => c.name);
    return { courses };
  } catch {
    return { courses: [] };
  }
}
