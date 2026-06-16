import { NextResponse } from "next/server";
import { headers } from "next/headers";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { revalidatePath } from "next/cache";

export async function POST(req: Request) {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const fd = await req.formData();
  const name = String(fd.get("name") ?? "").trim();
  const code = String(fd.get("code") ?? "").trim() || null;
  const color = String(fd.get("color") ?? "#3b82f6").trim() || "#3b82f6";

  if (!name) return NextResponse.json({ error: "Course name is required" }, { status: 400 });

  await prisma.studyCourse.create({
    data: { userId: session.user.id, name, code, color },
  });

  revalidatePath("/learning");
  revalidatePath("/dashboard");

  return NextResponse.json({ ok: true });
}
