"use server";

import { revalidatePath } from "next/cache";

import { requireUserId } from "@/lib/actions/auth";
import { contentStages, type ContentStage } from "@/lib/content-stages";
import { prisma } from "@/lib/prisma";

export async function createContentItem(formData: FormData) {
  const userId = await requireUserId();
  const title = String(formData.get("title") ?? "").trim();
  const channel = String(formData.get("channel") ?? "").trim() || "General";
  const stage = String(formData.get("stage") ?? "IDEA");

  if (!title) return { error: "Title is required" };
  if (!contentStages.includes(stage as ContentStage)) {
    return { error: "Invalid stage" };
  }

  await prisma.contentItem.create({
    data: {
      userId,
      title,
      channel,
      stage: stage as ContentStage,
    },
  });
  revalidatePath("/content");
  revalidatePath("/dashboard");
  return { ok: true };
}

/**
 * Creates a content item that already has a script attached (used when the user
 * generates a script with AI and saves it straight into the pipeline). The item
 * lands at the SCRIPT stage since the script is the first concrete artifact.
 */
export async function saveGeneratedScript(input: {
  title: string;
  channel?: string;
  script: string;
  hook?: string;
}) {
  const userId = await requireUserId();
  const title = input.title.trim();
  const script = input.script.trim();
  if (!title) return { error: "Title is required" };
  if (!script) return { error: "Script is empty" };

  const item = await prisma.contentItem.create({
    data: {
      userId,
      title,
      channel: (input.channel ?? "").trim() || "General",
      stage: "SCRIPT",
      script,
      hook: (input.hook ?? "").trim(),
    },
  });
  revalidatePath("/content");
  revalidatePath("/dashboard");
  return { ok: true, id: item.id };
}

/** Saves an edited script onto an existing content item. */
export async function updateContentScript(id: string, script: string) {
  const userId = await requireUserId();
  const item = await prisma.contentItem.findFirst({ where: { id, userId } });
  if (!item) return { error: "Not found" };

  await prisma.contentItem.update({
    where: { id },
    data: { script: script ?? "" },
  });
  revalidatePath("/content");
  return { ok: true };
}

export async function updateContentStage(id: string, stage: string) {
  const userId = await requireUserId();
  if (!contentStages.includes(stage as ContentStage)) {
    return { error: "Invalid stage" };
  }

  const item = await prisma.contentItem.findFirst({ where: { id, userId } });
  if (!item) return { error: "Not found" };

  await prisma.contentItem.update({
    where: { id },
    data: { stage: stage as ContentStage },
  });
  revalidatePath("/content");
  return { ok: true };
}

export async function deleteContentItem(id: string) {
  const userId = await requireUserId();
  const item = await prisma.contentItem.findFirst({ where: { id, userId } });
  if (!item) return { error: "Not found" };
  await prisma.contentItem.delete({ where: { id } });
  revalidatePath("/content");
  return { ok: true };
}

export async function getContentItems(userId: string) {
  return prisma.contentItem.findMany({
    where: { userId },
    orderBy: [{ stage: "asc" }, { updatedAt: "desc" }],
  });
}
