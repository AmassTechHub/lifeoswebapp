"use server";

import { revalidatePath } from "next/cache";

import { requireUserId } from "@/lib/actions/auth";
import { prisma } from "@/lib/prisma";

export async function createTask(formData: FormData) {
  const userId = await requireUserId();
  const title = String(formData.get("title") ?? "").trim();
  const category = String(formData.get("category") ?? "PERSONAL");
  const dueDateRaw = String(formData.get("dueDate") ?? "");

  if (!title) return { error: "Title is required" };

  await prisma.task.create({
    data: {
      userId,
      title,
      category: category as "ACADEMICS" | "CODING" | "CONTENT" | "CLIENTS" | "PERSONAL",
      dueDate: dueDateRaw ? new Date(dueDateRaw) : null,
    },
  });
  revalidatePath("/tasks");
  revalidatePath("/dashboard");
  return { ok: true };
}

export async function toggleTaskComplete(id: string) {
  const userId = await requireUserId();
  const task = await prisma.task.findFirst({ where: { id, userId } });
  if (!task) return { error: "Not found" };

  await prisma.task.update({
    where: { id },
    data: { completed: !task.completed, status: !task.completed ? "COMPLETED" : "PLANNED" },
  });
  revalidatePath("/tasks");
  revalidatePath("/dashboard");
  return { ok: true };
}

export async function deleteTask(id: string) {
  const userId = await requireUserId();
  const task = await prisma.task.findFirst({ where: { id, userId } });
  if (!task) return { error: "Not found" };
  await prisma.task.delete({ where: { id } });
  revalidatePath("/tasks");
  revalidatePath("/dashboard");
  return { ok: true };
}

export async function updateTaskStatus(id: string, status: string) {
  const userId = await requireUserId();
  const task = await prisma.task.findFirst({ where: { id, userId } });
  if (!task) return { error: "Not found" };

  const completed = status === "COMPLETED";
  await prisma.task.update({
    where: { id },
    data: {
      status: status as "BACKLOG" | "PLANNED" | "IN_PROGRESS" | "REVIEW" | "COMPLETED",
      completed,
    },
  });
  revalidatePath("/tasks");
  revalidatePath("/dashboard");
  return { ok: true };
}

export async function getTasks(userId: string) {
  return prisma.task.findMany({
    where: { userId },
    orderBy: [{ completed: "asc" }, { dueDate: "asc" }],
  });
}
