import { NextResponse } from "next/server";
import { headers } from "next/headers";

import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { uploadToStorage } from "@/lib/supabase";

const MAX_BYTES = 12 * 1024 * 1024;
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
  const file = formData.get("file") as File | null;
  const courseId = String(formData.get("courseId") ?? "");
  const title = String(formData.get("title") ?? "").trim() || "Slides";

  if (!file || !courseId) {
    return NextResponse.json({ error: "File and course required" }, { status: 400 });
  }

  const course = await prisma.studyCourse.findFirst({
    where: { id: courseId, userId: session.user.id },
  });
  if (!course) {
    return NextResponse.json({ error: "Course not found" }, { status: 404 });
  }

  if (file.size > MAX_BYTES) {
    return NextResponse.json({ error: "File too large (max 12MB)" }, { status: 400 });
  }

  if (file.type && !ALLOWED.includes(file.type)) {
    return NextResponse.json({ error: "PDF or image files only" }, { status: 400 });
  }

  const safeName = file.name.replace(/[^a-zA-Z0-9._-]/g, "_");
  const storagePath = `${session.user.id}/${Date.now()}-${safeName}`;
  const buffer = Buffer.from(await file.arrayBuffer());

  let fileUrl: string;
  try {
    fileUrl = await uploadToStorage(buffer, storagePath, file.type || "application/octet-stream");
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    console.error("Storage upload error:", msg);
    if (msg.includes("env vars not configured") || msg.includes("not configured")) {
      return NextResponse.json({ error: "File storage not configured. Add NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY to Vercel environment variables." }, { status: 503 });
    }
    return NextResponse.json({ error: `Upload failed: ${msg}` }, { status: 503 });
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

  return NextResponse.json({ ok: true, material });
}
