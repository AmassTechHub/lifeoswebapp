"use server";

import { revalidatePath } from "next/cache";

import { requireUserId } from "@/lib/actions/auth";
import { prisma } from "@/lib/prisma";

export async function createGoal(formData: FormData) {
  const userId = await requireUserId();
  const title = String(formData.get("title") ?? "").trim();
  const level = String(formData.get("level") ?? "WEEKLY");
  const description = String(formData.get("description") ?? "").trim() || null;

  if (!title) return { error: "Title is required" };

  await prisma.goal.create({
    data: {
      userId,
      title,
      description,
      level: level as "VISION" | "ANNUAL" | "QUARTERLY" | "MONTHLY" | "WEEKLY" | "DAILY",
    },
  });
  revalidatePath("/goals");
  revalidatePath("/dashboard");
  return { ok: true };
}

export async function toggleGoalComplete(id: string) {
  const userId = await requireUserId();
  const goal = await prisma.goal.findFirst({ where: { id, userId } });
  if (!goal) return { error: "Not found" };

  await prisma.goal.update({
    where: { id },
    data: { completed: !goal.completed },
  });
  revalidatePath("/goals");
  revalidatePath("/dashboard");
  return { ok: true };
}

export async function deleteGoal(id: string) {
  const userId = await requireUserId();
  const goal = await prisma.goal.findFirst({ where: { id, userId } });
  if (!goal) return { error: "Not found" };
  await prisma.goal.delete({ where: { id } });
  revalidatePath("/goals");
  revalidatePath("/dashboard");
  return { ok: true };
}

export async function getGoals(userId: string) {
  return prisma.goal.findMany({
    where: { userId },
    orderBy: [{ completed: "asc" }, { level: "asc" }, { createdAt: "desc" }],
  });
}
