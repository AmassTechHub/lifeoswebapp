import { NextResponse } from "next/server";
import { headers } from "next/headers";

import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function POST(request: Request) {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await request.json().catch(() => ({}));
  const useCases = Array.isArray(body.useCases) ? body.useCases : [];
  const primaryGoal = typeof body.primaryGoal === "string" ? body.primaryGoal.trim() : null;

  await prisma.user.update({
    where: { id: session.user.id },
    data: {
      onboardingCompleted: true,
      useCase: JSON.stringify(useCases),
      primaryGoal: primaryGoal || null,
    },
  });

  return NextResponse.json({ ok: true });
}
