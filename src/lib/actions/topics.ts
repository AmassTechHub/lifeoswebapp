"use server";

import { revalidatePath } from "next/cache";
import { requireUserId } from "@/lib/actions/auth";
import { prisma } from "@/lib/prisma";

export async function getTopics(userId: string) {
  return prisma.learningTopic.findMany({
    where: { userId },
    orderBy: { createdAt: "desc" },
  });
}

export async function createTopic(formData: FormData) {
  const userId = await requireUserId();
  const name = String(formData.get("name") ?? "").trim();
  const category = String(formData.get("category") ?? "General").trim();
  if (!name) return { error: "Topic name required" };

  await prisma.learningTopic.create({
    data: { userId, name, category },
  });
  revalidatePath("/learning");
  return { ok: true };
}

export async function updateTopicProgress(
  id: string,
  fields: { learned?: boolean; practiced?: boolean; built?: boolean; confidence?: number }
) {
  const userId = await requireUserId();
  await prisma.learningTopic.updateMany({
    where: { id, userId },
    data: fields,
  });
  revalidatePath("/learning");
  return { ok: true };
}

export async function deleteTopic(id: string) {
  const userId = await requireUserId();
  await prisma.learningTopic.deleteMany({ where: { id, userId } });
  revalidatePath("/learning");
  return { ok: true };
}
