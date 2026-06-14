import { NextResponse } from "next/server";
import { headers } from "next/headers";

import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function GET() {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const user = await prisma.user.findUnique({
    where: { id: session.user.id },
    select: {
      momoSubscriptionKey: true,
      momoUserId: true,
      momoApiSecret: true,
      momoEnvironment: true,
    },
  });

  return NextResponse.json({
    configured: !!(user?.momoSubscriptionKey && user?.momoUserId && user?.momoApiSecret),
    environment: user?.momoEnvironment ?? "sandbox",
    // never send secrets in full — send masked hints only
    hasSubscriptionKey: !!user?.momoSubscriptionKey,
    hasUserId: !!user?.momoUserId,
    hasApiSecret: !!user?.momoApiSecret,
  });
}

export async function POST(request: Request) {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await request.json().catch(() => ({}));
  const subscriptionKey = String(body.subscriptionKey ?? "").trim() || null;
  const userId = String(body.userId ?? "").trim() || null;
  const apiSecret = String(body.apiSecret ?? "").trim() || null;
  const environment = body.environment === "production" ? "production" : "sandbox";

  await prisma.user.update({
    where: { id: session.user.id },
    data: { momoSubscriptionKey: subscriptionKey, momoUserId: userId, momoApiSecret: apiSecret, momoEnvironment: environment },
  });

  return NextResponse.json({ ok: true });
}
