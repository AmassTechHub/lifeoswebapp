import { WEEKDAYS, type TimetableBlock, type Weekday } from "@/lib/timetable/types";

const DAYS = WEEKDAYS;

const EXTRACT_PROMPT = `You are parsing a university course timetable image or document.
Extract every individual class block you see.

Return ONLY a valid JSON array — no markdown, no explanation — matching this schema exactly:
[{
  "title": "Full course name or code (e.g. 'CSM 388 Data Structures II' or 'CSM 388')",
  "courseCode": "Course code only if visible (e.g. 'CSM 388')",
  "day": "MONDAY|TUESDAY|WEDNESDAY|THURSDAY|FRIDAY|SATURDAY|SUNDAY",
  "hour": 10,
  "minute": 30,
  "durationMinutes": 55,
  "venue": "Room/venue if visible or null",
  "lecturer": "Lecturer name if visible or null",
  "group": 1
}]

Rules:
- "group" = the group number (1 or 2) if the cell is labelled "Group 1"/"Group 2", else null (means all groups).
- Use 24-hour time: hour 8 = 8am, hour 13 = 1pm, hour 17 = 5pm.
- durationMinutes: typical lecture = 55 min, lab = 110 min, seminar = 55 min.
- Extract ALL blocks regardless of group — the app will filter by the student's group.
- If cell says "ALL LECTURERS" or no specific lecturer, set lecturer to null.
- For KNUST-style timetables: each numbered column = a time period, rows = days.
  Common KNUST periods: 1=8:00, 2=9:00, 3=10:30, 4=11:30, 5=13:00, 6=14:00, 7=15:00, 8=16:00, 9=17:00, 10=18:00.
- Return empty array [] if no classes found.`;

export function normalizeBlocks(input: unknown): TimetableBlock[] {
  if (!Array.isArray(input)) return [];
  const results: TimetableBlock[] = [];
  for (const b of input) {
    const raw = b as Record<string, unknown>;
    const title = String(raw.title ?? "").trim();
    const dayRaw = String(raw.day ?? "").toUpperCase();
    const hour = Number(raw.hour ?? 0);
    const minute = Number(raw.minute ?? 0);
    const durationMinutes = Number(raw.durationMinutes ?? 55);
    if (!title || !DAYS.includes(dayRaw as Weekday)) continue;
    if (!Number.isFinite(hour) || hour < 0 || hour > 23) continue;
    if (!Number.isFinite(minute) || minute < 0 || minute > 59) continue;
    if (!Number.isFinite(durationMinutes) || durationMinutes < 30 || durationMinutes > 300) continue;
    const block: TimetableBlock = { title, day: dayRaw as Weekday, hour, minute, durationMinutes };
    if (raw.courseCode) block.courseCode = String(raw.courseCode).trim();
    if (raw.venue) block.venue = String(raw.venue).trim();
    if (raw.lecturer) block.lecturer = String(raw.lecturer).trim();
    if (raw.group != null) block.group = Number(raw.group);
    results.push(block);
  }
  return results;
}

export function starterBlocks(): TimetableBlock[] {
  return [
    { title: "Course block 1", day: "MONDAY", hour: 8, minute: 0, durationMinutes: 55 },
    { title: "Course block 2", day: "WEDNESDAY", hour: 10, minute: 30, durationMinutes: 55 },
    { title: "Course block 3", day: "FRIDAY", hour: 14, minute: 0, durationMinutes: 55 },
  ];
}

async function parseBlocksFromModelContent(text: string): Promise<TimetableBlock[]> {
  const jsonMatch = text.match(/\[[\s\S]*\]/);
  if (!jsonMatch) return [];
  try {
    return normalizeBlocks(JSON.parse(jsonMatch[0]));
  } catch {
    return [];
  }
}

async function extractWithOpenAI(
  content: { type: "text"; text: string } | { type: "image"; base64: string; mimeType: string },
  apiKey: string
): Promise<TimetableBlock[]> {
  const userContent =
    content.type === "text"
      ? [{ type: "text", text: `${EXTRACT_PROMPT}\n\nDocument text:\n${content.text.slice(0, 14000)}` }]
      : [
          { type: "text", text: EXTRACT_PROMPT },
          { type: "image_url", image_url: { url: `data:${content.mimeType};base64,${content.base64}`, detail: "high" } },
        ];

  const res = await fetch("https://api.openai.com/v1/chat/completions", {
    method: "POST",
    headers: { Authorization: `Bearer ${apiKey}`, "Content-Type": "application/json" },
    body: JSON.stringify({
      model: process.env.OPENAI_MODEL ?? "gpt-4o",
      messages: [{ role: "user", content: userContent }],
      max_tokens: 2000,
      temperature: 0.1,
    }),
  });

  if (!res.ok) return [];
  const data = await res.json();
  const raw = String(data.choices?.[0]?.message?.content ?? "");
  return parseBlocksFromModelContent(raw);
}

export async function extractBlocksFromImage(
  base64: string,
  mimeType: string,
  apiKey: string
): Promise<TimetableBlock[]> {
  return extractWithOpenAI({ type: "image", base64, mimeType }, apiKey);
}

export async function extractBlocksFromText(text: string, apiKey: string): Promise<TimetableBlock[]> {
  const cleaned = text.replace(/\s+/g, " ").trim();
  if (cleaned.length < 20) return [];
  return extractWithOpenAI({ type: "text", text: cleaned }, apiKey);
}

export async function extractTextFromPdf(buffer: Buffer): Promise<string> {
  try {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const pdfParse = ((await import("pdf-parse")) as any).default ?? (await import("pdf-parse"));
    const result = await pdfParse(buffer);
    return String(result.text ?? "").trim();
  } catch {
    return "";
  }
}

export async function extractBlocksFromFile(
  buffer: Buffer,
  mimeType: string,
  userApiKey?: string
): Promise<{ blocks: TimetableBlock[]; aiUsed: boolean; source: "image" | "pdf" | "fallback" }> {
  const apiKey = userApiKey?.trim() || process.env.OPENAI_API_KEY?.trim() || "";
  const hasAi = Boolean(apiKey);

  if (mimeType === "application/pdf" || mimeType.endsWith("/pdf")) {
    const text = await extractTextFromPdf(buffer);
    if (text.length > 30 && hasAi) {
      const blocks = await extractBlocksFromText(text, apiKey);
      if (blocks.length > 0) return { blocks, aiUsed: true, source: "pdf" };
    }
  }

  if (["image/png", "image/jpeg", "image/webp", "image/gif"].includes(mimeType) && hasAi) {
    const blocks = await extractBlocksFromImage(buffer.toString("base64"), mimeType, apiKey);
    if (blocks.length > 0) return { blocks, aiUsed: true, source: "image" };
  }

  return { blocks: starterBlocks(), aiUsed: false, source: "fallback" };
}
