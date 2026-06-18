import { prisma } from "@/lib/prisma";
import { PLANS, type PlanKey } from "@/lib/billing/plans";

export async function grantProFromReference(reference: string, userId: string, planKey: PlanKey) {
  const plan = PLANS[planKey];
  if (!plan) return;

  const tx = await prisma.paymentTransaction.findUnique({ where: { reference } });
  if (!tx || tx.status === "success") return; // already processed or unknown reference

  const expiresAt = new Date(Date.now() + plan.intervalDays * 24 * 60 * 60 * 1000);
  await prisma.$transaction([
    prisma.paymentTransaction.update({ where: { reference }, data: { status: "success" } }),
    prisma.user.update({ where: { id: userId }, data: { isPro: true, proExpiresAt: expiresAt } }),
  ]);
}
