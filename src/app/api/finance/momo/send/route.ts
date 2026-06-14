import { NextResponse } from "next/server";
import { headers } from "next/headers";
import { randomUUID } from "crypto";

import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { initiateDisbursement, type MoMoCreds } from "@/lib/momo/client";

export async function POST(request: Request) {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await request.json().catch(() => ({}));
  const recipientPhone = String(body.recipientPhone ?? "").trim();
  const recipientName = String(body.recipientName ?? "").trim() || null;
  const amount = parseFloat(body.amount);
  const note = String(body.note ?? "").trim() || null;

  if (!recipientPhone) return NextResponse.json({ error: "Recipient phone is required" }, { status: 400 });
  if (!amount || amount <= 0) return NextResponse.json({ error: "Enter a valid amount" }, { status: 400 });

  const user = await prisma.user.findUnique({
    where: { id: session.user.id },
    select: { momoSubscriptionKey: true, momoUserId: true, momoApiSecret: true, momoEnvironment: true },
  });

  if (!user?.momoSubscriptionKey || !user?.momoUserId || !user?.momoApiSecret) {
    return NextResponse.json(
      { error: "MoMo credentials not set. Go to Settings → MoMo to add them." },
      { status: 422 }
    );
  }

  const creds: MoMoCreds = {
    subscriptionKey: user.momoSubscriptionKey,
    userId: user.momoUserId,
    apiSecret: user.momoApiSecret,
    environment: (user.momoEnvironment ?? "sandbox") as "sandbox" | "production",
  };

  const referenceId = randomUUID();

  let accepted = false;
  let statusCode = 0;
  try {
    const result = await initiateDisbursement(creds, { referenceId, recipientPhone, amount, note: note ?? undefined });
    accepted = result.accepted;
    statusCode = result.statusCode;
  } catch (err) {
    const message = err instanceof Error ? err.message : "MTN API error";
    return NextResponse.json({ error: message }, { status: 502 });
  }

  if (!accepted) {
    return NextResponse.json(
      { error: `MTN rejected the request (status ${statusCode}). Check your credentials.` },
      { status: 502 }
    );
  }

  // Save the pending transaction
  await prisma.moMoTransaction.create({
    data: {
      userId: session.user.id,
      referenceId,
      recipientPhone,
      recipientName,
      amount,
      note,
      status: "PENDING",
    },
  });

  return NextResponse.json({ referenceId, status: "PENDING" });
}
