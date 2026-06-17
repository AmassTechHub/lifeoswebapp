import { prisma } from "@/lib/prisma";
import { extractBlocksFromImage, extractTextFromPdf } from "@/lib/timetable/extract";

const MAX_CONTEXT_CHARS = 12_000;

export type StudySource = {
  id: string;
  tag: string; // citation tag e.g. "S1" — AI references this inline, UI maps it back to this source
  kind: "note" | "material";
  title: string;
  excerpt: string;
};

export type CourseContextBuilt = {
  course: { id: string; name: string; code: string | null };
  context: string;
  sources: StudySource[];
};

async function fetchBuffer(url: string): Promise<Buffer | null> {
  try {
    const res = await fetch(url);
    if (!res.ok) return null;
    return Buffer.from(await res.arrayBuffer());
  } catch {
    return null;
  }
}

async function materialExcerpt(
  material: {
    id: string;
    title: string;
    fileName: string;
    fileUrl: string;
    mimeType: string | null;
  }
): Promise<string> {
  if (material.mimeType === "application/pdf" || material.fileName.endsWith(".pdf")) {
    const buffer = await fetchBuffer(material.fileUrl);
    if (buffer) {
      try {
        return (await extractTextFromPdf(buffer)).slice(0, 3000);
      } catch {
        return "";
      }
    }
  }

  if (
    material.mimeType &&
    ["image/png", "image/jpeg", "image/webp"].includes(material.mimeType) &&
    process.env.OPENAI_API_KEY?.trim()
  ) {
    const buffer = await fetchBuffer(material.fileUrl);
    if (buffer) {
      try {
        const blocks = await extractBlocksFromImage(
          buffer.toString("base64"),
          material.mimeType,
          process.env.OPENAI_API_KEY.trim()
        );
        if (blocks.length > 0) {
          return `Slide content: ${blocks.map((b) => b.title).join(", ")}`;
        }
      } catch {
        // fall through
      }
    }
  }

  return `(File: ${material.fileName})`;
}

export async function buildCourseContext(
  userId: string,
  courseId: string
): Promise<CourseContextBuilt | null> {
  const [course, flashcards] = await Promise.all([
    prisma.studyCourse.findFirst({
      where: { id: courseId, userId },
      include: {
        notes: { orderBy: { updatedAt: "desc" }, take: 12 },
        materials: { orderBy: { createdAt: "desc" }, take: 6 },
      },
    }),
    prisma.flashcard.findMany({
      where: { courseId, userId },
      orderBy: { createdAt: "desc" },
      take: 40,
      select: { id: true, front: true, back: true },
    }),
  ]);

  if (!course) return null;

  const sources: StudySource[] = [];
  const parts: string[] = [`Course: ${course.name}${course.code ? ` (${course.code})` : ""}`];
  let n = 0;

  for (const note of course.notes) {
    const tag = `S${++n}`;
    const excerpt = note.content.slice(0, 2000);
    sources.push({ id: note.id, tag, kind: "note", title: note.title, excerpt });
    parts.push(`\n[${tag}] (${note.type}) ${note.title}\n${excerpt}`);
  }

  for (const material of course.materials) {
    const tag = `S${++n}`;
    const excerpt = await materialExcerpt(material);
    sources.push({ id: material.id, tag, kind: "material", title: material.title, excerpt });
    parts.push(`\n[${tag}] (MATERIAL) ${material.title}\n${excerpt}`);
  }

  if (flashcards.length > 0) {
    const tag = `S${++n}`;
    const excerpt = flashcards.map((f) => `Q: ${f.front} | A: ${f.back}`).join("\n");
    sources.push({ id: "flashcards", tag, kind: "note", title: "Flashcards", excerpt });
    parts.push(`\n[${tag}] (FLASHCARDS)\n${excerpt}`);
  }

  return {
    course: { id: course.id, name: course.name, code: course.code },
    context: parts.join("\n").slice(0, MAX_CONTEXT_CHARS),
    sources,
  };
}
