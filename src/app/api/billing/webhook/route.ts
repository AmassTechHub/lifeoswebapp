import { NextResponse } from "next/server";

import { verifyWebhookSignature } from "@/lib/billing/paystack";
import { grantProFromReference } from "@/lib/billing/grant";
import type { PlanKey } from "@/lib/billing/plans";

export async function POST(req: Request) {
  const rawBody = await req.text();
  const signature = req.headers.get("x-paystack-signature");

  if (!verifyWebhookSignature(rawBody, signature)) {
    return NextResponse.json({ error: "Invalid signature" }, { status: 401 });
  }

  const event = JSON.parse(rawBody);

  if (event.event === "charge.success") {
    const reference = event.data.reference as string;
    const metadata = event.data.metadata as { userId?: string; plan?: PlanKey } | undefined;
    if (metadata?.userId && metadata?.plan) {
      await grantProFromReference(reference, metadata.userId, metadata.plan);
    }
  }

  return NextResponse.json({ ok: true });
}
