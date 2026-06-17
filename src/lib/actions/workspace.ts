"use server";

import { revalidatePath } from "next/cache";

import { requireUserId } from "@/lib/actions/auth";
import { prisma } from "@/lib/prisma";

export async function createWorkspaceDoc(formData: FormData) {
  const userId = await requireUserId();
  const title = String(formData.get("title") ?? "").trim();
  const folder = String(formData.get("folder") ?? "General").trim() || "General";
  const content = String(formData.get("content") ?? "");
  const parentId = String(formData.get("parentId") ?? "").trim() || null;

  if (!title) return { error: "Title required" };

  if (parentId) {
    const parent = await prisma.workspaceDoc.findFirst({ where: { id: parentId, userId } });
    if (!parent) return { error: "Parent page not found" };
  }

  const doc = await prisma.workspaceDoc.create({
    data: { userId, title, folder, content, parentId },
  });
  revalidatePath("/workspace");
  return { ok: true, id: doc.id };
}

export async function updateWorkspaceDoc(id: string, formData: FormData) {
  const userId = await requireUserId();
  const doc = await prisma.workspaceDoc.findFirst({ where: { id, userId } });
  if (!doc) return { error: "Not found" };

  const title = String(formData.get("title") ?? doc.title).trim();
  const content = String(formData.get("content") ?? doc.content);
  const folder = String(formData.get("folder") ?? doc.folder).trim();

  await prisma.workspaceDoc.update({
    where: { id },
    data: { title, content, folder },
  });
  revalidatePath("/workspace");
  return { ok: true };
}

export async function deleteWorkspaceDoc(id: string) {
  const userId = await requireUserId();
  const doc = await prisma.workspaceDoc.findFirst({ where: { id, userId } });
  if (!doc) return { error: "Not found" };
  await prisma.workspaceDoc.delete({ where: { id } });
  revalidatePath("/workspace");
  return { ok: true };
}

export async function getWorkspaceDocs(userId: string) {
  return prisma.workspaceDoc.findMany({
    where: { userId },
    orderBy: [{ pinned: "desc" }, { updatedAt: "desc" }],
  });
}
