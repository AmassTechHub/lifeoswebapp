import { NextResponse } from "next/server";
import { headers } from "next/headers";

import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { getDisbursementStatus, type MoMoCreds } from "@/lib/momo/client";
import { revalidatePath } from "next/cache";

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ referenceId: string }> }
) {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { referenceId } = await params;

  const tx = await prisma.moMoTransaction.findFirst({
    where: { referenceId, userId: session.user.id },
  });

  if (!tx) return NextResponse.json({ error: "Transaction not found" }, { status: 404 });

  // If already resolved, return cached status
  if (tx.status === "SUCCESSFUL" || tx.status === "FAILED") {
    return NextResponse.json({ status: tx.status, expenseId: tx.expenseId });
  }

  const user = await prisma.user.findUnique({
    where: { id: session.user.id },
    select: { momoSubscriptionKey: true, momoUserId: true, momoApiSecret: true, momoEnvironment: true },
  });

  if (!user?.momoSubscriptionKey || !user?.momoUserId || !user?.momoApiSecret) {
    return NextResponse.json({ error: "MoMo credentials missing" }, { status: 422 });
  }

  const creds: MoMoCreds = {
    subscriptionKey: user.momoSubscriptionKey,
    userId: user.momoUserId,
    apiSecret: user.momoApiSecret,
    environment: (user.momoEnvironment ?? "sandbox") as "sandbox" | "production",
  };

  let status: string;
  let raw: Record<string, unknown>;
  try {
    const result = await getDisbursementStatus(creds, referenceId);
    status = result.status;
    raw = result.raw;
  } catch (err) {
    const message = err instanceof Error ? err.message : "Status check failed";
    return NextResponse.json({ error: message }, { status: 502 });
  }

  let expenseId: string | null = tx.expenseId;

  if (status === "SUCCESSFUL" && !tx.expenseId) {
    // Auto-log the expense
    const expense = await prisma.expense.create({
      data: {
        userId: session.user.id,
        amount: tx.amount,
        category: "MoMo Transfer",
        description: tx.note
          ? `${tx.note}${tx.recipientName ? ` → ${tx.recipientName}` : ""} (${tx.recipientPhone})`
          : `Sent to ${tx.recipientName ?? tx.recipientPhone}`,
        paymentMethod: "MOMO",
        date: new Date(),
      },
    });
    expenseId = expense.id;
    revalidatePath("/finance");
    revalidatePath("/dashboard");
  }

  // Update transaction record
  await prisma.moMoTransaction.update({
    where: { id: tx.id },
    data: { status, expenseId, raw: JSON.stringify(raw) },
  });

  return NextResponse.json({ status, expenseId });
}
