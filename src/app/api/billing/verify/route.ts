import { NextResponse } from "next/server";
import { headers } from "next/headers";

import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { verifyTransaction } from "@/lib/billing/paystack";
import { grantProFromReference } from "@/lib/billing/grant";
import type { PlanKey } from "@/lib/billing/plans";

export async function GET(req: Request) {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const reference = new URL(req.url).searchParams.get("reference");
  if (!reference) return NextResponse.json({ error: "Missing reference" }, { status: 400 });

  const tx = await prisma.paymentTransaction.findUnique({ where: { reference } });
  if (!tx || tx.userId !== session.user.id) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  if (tx.status === "success") {
    return NextResponse.json({ ok: true, status: "success" });
  }

  const result = await verifyTransaction(reference);
  if (result.ok && result.status === "success") {
    await grantProFromReference(reference, session.user.id, tx.plan as PlanKey);
    return NextResponse.json({ ok: true, status: "success" });
  }

  return NextResponse.json({ ok: true, status: result.status ?? "pending" });
}
