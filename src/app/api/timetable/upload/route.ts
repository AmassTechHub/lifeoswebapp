import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";

import { NextResponse } from "next/server";

import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { applyTimetableBlocks } from "@/lib/timetable/apply";
import { extractBlocksFromFile, normalizeBlocks, starterBlocks } from "@/lib/timetable/extract";

const MAX_BYTES = 8 * 1024 * 1024;

export async function POST(request: Request) {
  const session = await auth.api.getSession({ headers: request.headers });
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const formData = await request.formData();
  const mode = String(formData.get("mode") ?? "apply");
  const file = formData.get("file") as File | null;
  const blocksRaw = formData.get("blocks") as string | null;
  const groupRaw = formData.get("group");
  const group = groupRaw ? Number(groupRaw) : null;

  if (mode === "apply" && !file && !blocksRaw) {
    return NextResponse.json({ error: "File or parsed blocks required" }, { status: 400 });
  }
  if (!file && !blocksRaw) {
    return NextResponse.json({ error: "File required" }, { status: 400 });
  }
  if (file && file.size > MAX_BYTES) {
    return NextResponse.json({ error: "Max 8MB" }, { status: 400 });
  }

  let fileName = "manual-blocks";
  let buffer: Buffer | null = null;
  let mimeType = "application/octet-stream";
  let extractionSource: "image" | "pdf" | "fallback" | "manual" = "manual";

  if (file) {
    const safeName = file.name.replace(/[^a-zA-Z0-9._-]/g, "_");
    const unique = `${Date.now()}-${safeName}`;
    const relDir = path.join("uploads", session.user.id, "timetables");
    const absDir = path.join(process.cwd(), "public", relDir);
    await mkdir(absDir, { recursive: true });

    buffer = Buffer.from(await file.arrayBuffer());
    await writeFile(path.join(absDir, unique), buffer);

    const fileUrl = `/${relDir.replace(/\\/g, "/")}/${unique}`;
    mimeType = file.type || "application/octet-stream";
    fileName = file.name;

    await prisma.timetableFile.create({
      data: {
        userId: session.user.id,
        fileName: file.name,
        fileUrl,
        mimeType,
      },
    });
  }

  let extracted = starterBlocks();
  let aiUsed = false;

  const userRecord = await prisma.user.findUnique({
    where: { id: session.user.id },
    select: { openAiKey: true },
  });
  const userApiKey = userRecord?.openAiKey?.trim() || undefined;

  if (blocksRaw) {
    try {
      const parsed = normalizeBlocks(JSON.parse(blocksRaw));
      if (parsed.length > 0) {
        extracted = parsed;
        extractionSource = "manual";
      }
    } catch {
      return NextResponse.json({ error: "Invalid blocks payload" }, { status: 400 });
    }
  } else if (buffer) {
    const result = await extractBlocksFromFile(buffer, mimeType, userApiKey);
    extracted = result.blocks;
    aiUsed = result.aiUsed;
    extractionSource = result.source;
  }

  if (mode === "preview") {
    return NextResponse.json({
      ok: true,
      preview: true,
      fileName,
      blocks: extracted,
      aiUsed,
      extractionSource,
    });
  }

  const applied = await applyTimetableBlocks(session.user.id, extracted, group);

  return NextResponse.json({
    ok: true,
    fileName,
    extractedCount: extracted.length,
    generatedEvents: applied.generatedEvents,
    coursesCreated: applied.coursesCreated,
    courseNames: applied.courseNames,
    aiUsed,
    extractionSource,
    events: applied.eventsToday,
  });
}
