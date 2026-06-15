"use server";

import { revalidatePath } from "next/cache";

import { requireUserId } from "@/lib/actions/auth";
import { prisma } from "@/lib/prisma";

const DEFAULT_CATEGORIES = [
  { name: "Food & Drinks", emoji: "🍽️" },
  { name: "Transport", emoji: "🚌" },
  { name: "Education", emoji: "📚" },
  { name: "Data & Airtime", emoji: "📱" },
  { name: "Entertainment", emoji: "🎮" },
  { name: "Personal Care", emoji: "🧴" },
  { name: "Health", emoji: "💊" },
  { name: "Clothing", emoji: "👕" },
  { name: "Utilities", emoji: "💡" },
  { name: "Savings", emoji: "💰" },
];

export { DEFAULT_CATEGORIES };

export async function getBudgetData(userId: string) {
  const now = new Date();
  const month = now.getMonth() + 1;
  const year = now.getFullYear();
  const monthStart = new Date(year, month - 1, 1);
  const monthEnd = new Date(year, month, 0, 23, 59, 59);

  const [budgets, expenses, savingsGoals] = await Promise.all([
    prisma.budgetCategory.findMany({
      where: { userId, month, year },
      orderBy: { name: "asc" },
    }),
    prisma.expense.findMany({
      where: { userId, date: { gte: monthStart, lte: monthEnd } },
      select: { category: true, amount: true },
    }),
    prisma.savingsGoal.findMany({
      where: { userId, completed: false },
      orderBy: { createdAt: "asc" },
    }),
  ]);

  const spending: Record<string, number> = {};
  for (const e of expenses) {
    const key = e.category.trim();
    spending[key] = (spending[key] ?? 0) + e.amount;
  }

  return { budgets, spending, savingsGoals, month, year };
}

export async function upsertBudget(formData: FormData) {
  const userId = await requireUserId();
  const name = String(formData.get("name") ?? "").trim();
  const monthlyLimit = parseFloat(String(formData.get("monthlyLimit") ?? "0"));
  const emoji = String(formData.get("emoji") ?? "💰").trim();
  const now = new Date();
  const month = now.getMonth() + 1;
  const year = now.getFullYear();

  if (!name) return { error: "Category name required" };
  if (!monthlyLimit || monthlyLimit <= 0) return { error: "Enter a valid limit" };

  await prisma.budgetCategory.upsert({
    where: { userId_name_month_year: { userId, name, month, year } },
    create: { userId, name, monthlyLimit, month, year, emoji },
    update: { monthlyLimit, emoji },
  });

  revalidatePath("/finance");
  return { ok: true };
}

export async function deleteBudget(name: string) {
  const userId = await requireUserId();
  const now = new Date();
  const month = now.getMonth() + 1;
  const year = now.getFullYear();

  await prisma.budgetCategory.deleteMany({
    where: { userId, name, month, year },
  });
  revalidatePath("/finance");
  return { ok: true };
}

export async function createSavingsGoal(formData: FormData) {
  const userId = await requireUserId();
  const name = String(formData.get("name") ?? "").trim();
  const targetAmount = parseFloat(String(formData.get("targetAmount") ?? "0"));
  const currentAmount = parseFloat(String(formData.get("currentAmount") ?? "0")) || 0;
  const targetDateStr = String(formData.get("targetDate") ?? "").trim();
  const emoji = String(formData.get("emoji") ?? "🎯").trim();

  if (!name) return { error: "Goal name required" };
  if (!targetAmount || targetAmount <= 0) return { error: "Enter a valid target amount" };

  await prisma.savingsGoal.create({
    data: {
      userId,
      name,
      targetAmount,
      currentAmount,
      targetDate: targetDateStr ? new Date(targetDateStr) : null,
      emoji,
    },
  });
  revalidatePath("/finance");
  return { ok: true };
}

export async function updateSavingsGoal(id: string, currentAmount: number) {
  const userId = await requireUserId();
  const goal = await prisma.savingsGoal.findFirst({ where: { id, userId } });
  if (!goal) return { error: "Not found" };

  const completed = currentAmount >= goal.targetAmount;
  await prisma.savingsGoal.update({
    where: { id },
    data: { currentAmount, completed },
  });
  revalidatePath("/finance");
  return { ok: true };
}

export async function deleteSavingsGoal(id: string) {
  const userId = await requireUserId();
  const goal = await prisma.savingsGoal.findFirst({ where: { id, userId } });
  if (!goal) return { error: "Not found" };
  await prisma.savingsGoal.delete({ where: { id } });
  revalidatePath("/finance");
  return { ok: true };
}
