import { headers } from "next/headers";
import { NextResponse } from "next/server";

import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function GET() {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const user = await prisma.user.findUnique({
    where: { id: session.user.id },
    select: { xp: true },
  });

  const xp = user?.xp ?? 0;
  const level = 1 + Math.floor(xp / 100);
  const xpInLevel = xp % 100;

  return NextResponse.json({ xp, level, xpInLevel, xpForNext: 100 });
}
