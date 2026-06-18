import { NextResponse } from "next/server";
import { headers } from "next/headers";
import crypto from "node:crypto";

import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { PLANS, type PlanKey } from "@/lib/billing/plans";
import { initializeTransaction } from "@/lib/billing/paystack";

export async function POST(req: Request) {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await req.json().catch(() => ({}));
  const planKey = body.plan as PlanKey;
  const plan = PLANS[planKey];
  if (!plan) return NextResponse.json({ error: "Invalid plan" }, { status: 400 });

  const appUrl = process.env.NEXT_PUBLIC_APP_URL?.trim() || new URL(req.url).origin;
  const reference = `lifeos_${crypto.randomUUID()}`;

  await prisma.paymentTransaction.create({
    data: {
      userId: session.user.id,
      reference,
      amount: plan.amountPesewas,
      plan: plan.key,
      status: "pending",
    },
  });

  const result = await initializeTransaction({
    email: session.user.email,
    amountPesewas: plan.amountPesewas,
    reference,
    callbackUrl: `${appUrl}/billing?reference=${reference}`,
    metadata: { userId: session.user.id, plan: plan.key },
  });

  if (!result.ok) {
    return NextResponse.json({ error: result.error }, { status: 502 });
  }

  return NextResponse.json({ url: result.authorizationUrl });
}
