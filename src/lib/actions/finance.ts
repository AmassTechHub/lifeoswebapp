"use server";

import { revalidatePath } from "next/cache";

import { requireUserId } from "@/lib/actions/auth";
import { prisma } from "@/lib/prisma";

export async function createExpense(formData: FormData) {
  const userId = await requireUserId();
  const amount = parseFloat(String(formData.get("amount") ?? "0"));
  const category = String(formData.get("category") ?? "Other").trim();
  const description = String(formData.get("description") ?? "").trim() || null;
  const paymentMethod = String(formData.get("paymentMethod") ?? "CASH").trim() || "CASH";

  if (!amount || amount <= 0) return { error: "Enter a valid amount" };

  await prisma.expense.create({
    data: { userId, amount, category, description, paymentMethod },
  });
  revalidatePath("/finance");
  revalidatePath("/dashboard");
  return { ok: true };
}

export async function createIncome(formData: FormData) {
  const userId = await requireUserId();
  const amount = parseFloat(String(formData.get("amount") ?? "0"));
  const source = String(formData.get("source") ?? "").trim();
  const description = String(formData.get("description") ?? "").trim() || null;

  if (!amount || amount <= 0) return { error: "Enter a valid amount" };
  if (!source) return { error: "Source is required" };

  await prisma.income.create({
    data: { userId, amount, source, description },
  });
  revalidatePath("/finance");
  revalidatePath("/dashboard");
  return { ok: true };
}

export async function deleteExpense(id: string) {
  const userId = await requireUserId();
  const row = await prisma.expense.findFirst({ where: { id, userId } });
  if (!row) return { error: "Not found" };
  await prisma.expense.delete({ where: { id } });
  revalidatePath("/finance");
  revalidatePath("/dashboard");
  return { ok: true };
}

export async function getFinanceSummary(userId: string) {
  const monthStart = new Date();
  monthStart.setDate(1);
  monthStart.setHours(0, 0, 0, 0);

  const [expenses, incomes] = await Promise.all([
    prisma.expense.findMany({
      where: { userId, date: { gte: monthStart } },
      orderBy: { date: "desc" },
    }),
    prisma.income.findMany({
      where: { userId, date: { gte: monthStart } },
      orderBy: { date: "desc" },
    }),
  ]);

  const totalExpenses = expenses.reduce((s, e) => s + e.amount, 0);
  const totalIncome = incomes.reduce((s, e) => s + e.amount, 0);

  const byCategory = expenses.reduce<Record<string, number>>((acc, e) => {
    acc[e.category] = (acc[e.category] ?? 0) + e.amount;
    return acc;
  }, {});

  return {
    expenses,
    incomes,
    totalExpenses,
    totalIncome,
    net: totalIncome - totalExpenses,
    byCategory: Object.entries(byCategory).sort((a, b) => b[1] - a[1]),
  };
}
