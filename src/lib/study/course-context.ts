import { prisma } from "@/lib/prisma";
import { extractBlocksFromImage, extractTextFromPdf } from "@/lib/timetable/extract";

const MAX_CONTEXT_CHARS = 12_000;

export type StudySource = {
  id: string;
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
  const course = await prisma.studyCourse.findFirst({
    where: { id: courseId, userId },
    include: {
      notes: { orderBy: { updatedAt: "desc" }, take: 12 },
      materials: { orderBy: { createdAt: "desc" }, take: 6 },
    },
  });

  if (!course) return null;

  const sources: StudySource[] = [];
  const parts: string[] = [`Course: ${course.name}${course.code ? ` (${course.code})` : ""}`];

  for (const note of course.notes) {
    const excerpt = note.content.slice(0, 2000);
    const tag = `[${note.type}] ${note.title}`;
    sources.push({ id: note.id, kind: "note", title: note.title, excerpt });
    parts.push(`\n${tag}\n${excerpt}`);
  }

  for (const material of course.materials) {
    const excerpt = await materialExcerpt(material);
    const tag = `[MATERIAL] ${material.title}`;
    sources.push({ id: material.id, kind: "material", title: material.title, excerpt });
    parts.push(`\n${tag}\n${excerpt}`);
  }

  return {
    course: { id: course.id, name: course.name, code: course.code },
    context: parts.join("\n").slice(0, MAX_CONTEXT_CHARS),
    sources,
  };
}
