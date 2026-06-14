import { headers } from "next/headers";
import { NextResponse } from "next/server";

import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function POST(request: Request) {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await request.json().catch(() => ({}));
  const key = typeof body.key === "string" ? body.key.trim() : "";

  await prisma.user.update({
    where: { id: session.user.id },
    data: { openAiKey: key || null },
  });

  return NextResponse.json({ ok: true });
}

export async function GET() {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const user = await prisma.user.findUnique({
    where: { id: session.user.id },
    select: { openAiKey: true },
  });

  return NextResponse.json({ hasKey: !!user?.openAiKey });
}
