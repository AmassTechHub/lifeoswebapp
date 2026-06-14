"use server";

import { revalidatePath } from "next/cache";

import { requireUserId } from "@/lib/actions/auth";
import { prisma } from "@/lib/prisma";

export async function createFlashcard(formData: FormData) {
  const userId = await requireUserId();
  const front = String(formData.get("front") ?? "").trim();
  const back = String(formData.get("back") ?? "").trim();
  const courseId = String(formData.get("courseId") ?? "").trim() || null;

  if (!front || !back) return { error: "Front and back are required" };

  if (courseId) {
    const course = await prisma.studyCourse.findFirst({
      where: { id: courseId, userId },
    });
    if (!course) return { error: "Course not found" };
  }

  await prisma.flashcard.create({
    data: { userId, courseId, front, back },
  });
  revalidatePath("/learning");
  return { ok: true };
}

export async function deleteFlashcard(id: string) {
  const userId = await requireUserId();
  const card = await prisma.flashcard.findFirst({ where: { id, userId } });
  if (!card) return { error: "Not found" };
  await prisma.flashcard.delete({ where: { id } });
  revalidatePath("/learning");
  return { ok: true };
}

export async function getFlashcards(userId: string, courseId?: string) {
  return prisma.flashcard.findMany({
    where: {
      userId,
      ...(courseId ? { courseId } : {}),
    },
    orderBy: { updatedAt: "desc" },
  });
}
