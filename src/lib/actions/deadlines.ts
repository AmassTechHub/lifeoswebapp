"use server";

import { revalidatePath } from "next/cache";
import { requireUserId } from "@/lib/actions/auth";
import { prisma } from "@/lib/prisma";

export async function getDeadlines() {
  const userId = await requireUserId();
  return prisma.deadline.findMany({
    where: { userId },
    include: { course: { select: { id: true, name: true, code: true, color: true } } },
    orderBy: [{ completed: "asc" }, { dueDate: "asc" }],
  });
}

export async function createDeadline(formData: FormData) {
  const userId = await requireUserId();
  const title = String(formData.get("title") ?? "").trim();
  const type = String(formData.get("type") ?? "ASSIGNMENT").trim();
  const courseId = String(formData.get("courseId") ?? "").trim() || null;
  const dueDate = String(formData.get("dueDate") ?? "").trim();
  const notes = String(formData.get("notes") ?? "").trim() || null;

  if (!title || !dueDate) return { error: "Title and due date are required" };

  await prisma.deadline.create({
    data: { userId, title, type, courseId, dueDate: new Date(dueDate), notes },
  });
  revalidatePath("/deadlines");
  return { ok: true };
}

export async function updateDeadline(id: string, formData: FormData) {
  const userId = await requireUserId();
  const deadline = await prisma.deadline.findFirst({ where: { id, userId } });
  if (!deadline) return { error: "Not found" };

  const title = String(formData.get("title") ?? "").trim();
  const type = String(formData.get("type") ?? "ASSIGNMENT").trim();
  const courseId = String(formData.get("courseId") ?? "").trim() || null;
  const dueDate = String(formData.get("dueDate") ?? "").trim();
  const notes = String(formData.get("notes") ?? "").trim() || null;

  if (!title || !dueDate) return { error: "Title and due date are required" };

  await prisma.deadline.update({
    where: { id },
    data: { title, type, courseId, dueDate: new Date(dueDate), notes },
  });
  revalidatePath("/deadlines");
  return { ok: true };
}

export async function toggleDeadline(id: string) {
  const userId = await requireUserId();
  const deadline = await prisma.deadline.findFirst({ where: { id, userId } });
  if (!deadline) return { error: "Not found" };
  await prisma.deadline.update({
    where: { id },
    data: { completed: !deadline.completed },
  });
  revalidatePath("/deadlines");
  return { ok: true };
}

export async function deleteDeadline(id: string) {
  const userId = await requireUserId();
  const deadline = await prisma.deadline.findFirst({ where: { id, userId } });
  if (!deadline) return { error: "Not found" };
  await prisma.deadline.delete({ where: { id } });
  revalidatePath("/deadlines");
  return { ok: true };
}

// Lightweight version for the QuickAdd FAB — title + dueDate only
export async function createDeadlineQuick(title: string, dueDate: string, type = "ASSIGNMENT") {
  const userId = await requireUserId();
  if (!title.trim() || !dueDate) return { error: "Title and due date are required" };
  await prisma.deadline.create({
    data: { userId, title: title.trim(), type, dueDate: new Date(dueDate) },
  });
  revalidatePath("/deadlines");
  revalidatePath("/dashboard");
  return { ok: true };
}
