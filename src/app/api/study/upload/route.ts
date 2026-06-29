import { NextResponse } from "next/server";
import { headers } from "next/headers";

import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { uploadToStorage } from "@/lib/supabase";

const MAX_BYTES_PER_FILE = 12 * 1024 * 1024;  // 12 MB per file
const MAX_FILES = 20;
const ALLOWED = [
  "application/pdf",
  "image/png",
  "image/jpeg",
  "image/webp",
  "application/vnd.ms-powerpoint",
  "application/vnd.openxmlformats-officedocument.presentationml.presentation",
];

export async function DELETE(request: Request) {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { searchParams } = new URL(request.url);
  const id = searchParams.get("id");
  if (!id) return NextResponse.json({ error: "id required" }, { status: 400 });

  const material = await prisma.studyMaterial.findFirst({
    where: { id, course: { userId: session.user.id } },
  });
  if (!material) return NextResponse.json({ error: "Not found" }, { status: 404 });

  await prisma.studyMaterial.delete({ where: { id } });
  return NextResponse.json({ ok: true });
}

export async function POST(request: Request) {
  const session = await auth.api.getSession({ headers: request.headers });
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const formData = await request.formData();
  const courseId = String(formData.get("courseId") ?? "");

  if (!courseId) {
    return NextResponse.json({ error: "courseId required" }, { status: 400 });
  }

  const course = await prisma.studyCourse.findFirst({
    where: { id: courseId, userId: session.user.id },
  });
  if (!course) {
    return NextResponse.json({ error: "Course not found" }, { status: 404 });
  }

  // Collect all uploaded files — supports both "file" (single) and "files[]" (multi)
  const files: File[] = [];
  const singleFile = formData.get("file");
  if (singleFile instanceof File) {
    files.push(singleFile);
  }
  const multiFiles = formData.getAll("files[]");
  for (const f of multiFiles) {
    if (f instanceof File) files.push(f);
  }
  // Also accept indexed keys: file_0, file_1, ...
  for (let i = 0; i < MAX_FILES; i++) {
    const f = formData.get(`file_${i}`);
    if (f instanceof File) files.push(f);
    else break;
  }

  if (files.length === 0) {
    return NextResponse.json({ error: "No files provided" }, { status: 400 });
  }
  if (files.length > MAX_FILES) {
    return NextResponse.json({ error: `Max ${MAX_FILES} files at once` }, { status: 400 });
  }

  const titleBase = String(formData.get("title") ?? "").trim();

  const results: { ok: boolean; material?: { id: string; title: string; fileName: string }; error?: string; file: string }[] = [];

  for (let i = 0; i < files.length; i++) {
    const file = files[i];

    if (file.size > MAX_BYTES_PER_FILE) {
      results.push({ ok: false, file: file.name, error: `File too large (max 12MB per file)` });
      continue;
    }

    if (file.type && !ALLOWED.includes(file.type)) {
      results.push({ ok: false, file: file.name, error: "Unsupported file type" });
      continue;
    }

    // Derive a title: use provided title for first file, or filename-based for multiples
    const title = files.length === 1 && titleBase
      ? titleBase
      : titleBase
        ? `${titleBase} (${i + 1})`
        : file.name.replace(/\.[^.]+$/, ""); // strip extension

    const safeName = file.name.replace(/[^a-zA-Z0-9._-]/g, "_");
    const storagePath = `${session.user.id}/${Date.now()}-${i}-${safeName}`;
    const buffer = Buffer.from(await file.arrayBuffer());

    let fileUrl: string;
    try {
      fileUrl = await uploadToStorage(buffer, storagePath, file.type || "application/octet-stream");
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      if (msg.includes("env vars not configured") || msg.includes("not configured")) {
        return NextResponse.json({
          error: "File storage not configured. Add NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY to Vercel environment variables.",
        }, { status: 503 });
      }
      results.push({ ok: false, file: file.name, error: `Upload failed: ${msg}` });
      continue;
    }

    const material = await prisma.studyMaterial.create({
      data: {
        courseId,
        title,
        fileName: file.name,
        fileUrl,
        mimeType: file.type || null,
        fileSize: file.size,
      },
    });

    results.push({ ok: true, file: file.name, material: { id: material.id, title, fileName: file.name } });
  }

  const successCount = results.filter((r) => r.ok).length;
  const failCount = results.filter((r) => !r.ok).length;

  // Single file — keep old response shape for backwards compat
  if (files.length === 1) {
    if (results[0].ok) {
      return NextResponse.json({ ok: true, material: results[0].material });
    } else {
      return NextResponse.json({ error: results[0].error }, { status: 400 });
    }
  }

  // Multi-file response
  return NextResponse.json({
    ok: failCount === 0,
    uploaded: successCount,
    failed: failCount,
    results,
  });
}
