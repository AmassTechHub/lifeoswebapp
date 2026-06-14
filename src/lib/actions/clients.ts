"use server";

import { revalidatePath } from "next/cache";

import { requireUserId } from "@/lib/actions/auth";
import { prisma } from "@/lib/prisma";

export async function createClient(formData: FormData) {
  const userId = await requireUserId();
  const name = String(formData.get("name") ?? "").trim();
  if (!name) return { error: "Name is required" };

  await prisma.client.create({
    data: {
      userId,
      name,
      email: String(formData.get("email") ?? "").trim() || null,
      phone: String(formData.get("phone") ?? "").trim() || null,
      notes: String(formData.get("notes") ?? "").trim() || null,
    },
  });
  revalidatePath("/clients");
  return { ok: true };
}

export async function deleteClient(id: string) {
  const userId = await requireUserId();
  const client = await prisma.client.findFirst({ where: { id, userId } });
  if (!client) return { error: "Not found" };
  await prisma.client.delete({ where: { id } });
  revalidatePath("/clients");
  revalidatePath("/dashboard");
  return { ok: true };
}

export async function createDeliverable(formData: FormData) {
  const userId = await requireUserId();
  const clientId = String(formData.get("clientId") ?? "");
  const title = String(formData.get("title") ?? "").trim();
  const dueRaw = String(formData.get("dueDate") ?? "");
  const amountRaw = String(formData.get("amount") ?? "");

  if (!title || !clientId) return { error: "Client and title required" };

  const client = await prisma.client.findFirst({ where: { id: clientId, userId } });
  if (!client) return { error: "Client not found" };

  await prisma.clientDeliverable.create({
    data: {
      clientId,
      title,
      dueDate: dueRaw ? new Date(dueRaw) : null,
      amount: amountRaw ? parseFloat(amountRaw) : null,
    },
  });
  revalidatePath("/clients");
  revalidatePath("/dashboard");
  return { ok: true };
}

export async function updateDeliverableStatus(id: string, status: string) {
  const userId = await requireUserId();
  const d = await prisma.clientDeliverable.findFirst({
    where: { id, client: { userId } },
  });
  if (!d) return { error: "Not found" };
  if (!["PENDING", "IN_PROGRESS", "DONE"].includes(status)) {
    return { error: "Invalid status" };
  }
  await prisma.clientDeliverable.update({
    where: { id },
    data: { status: status as "PENDING" | "IN_PROGRESS" | "DONE" },
  });
  revalidatePath("/clients");
  revalidatePath("/dashboard");
  return { ok: true };
}

export async function deleteDeliverable(id: string) {
  const userId = await requireUserId();
  const d = await prisma.clientDeliverable.findFirst({
    where: { id, client: { userId } },
  });
  if (!d) return { error: "Not found" };
  await prisma.clientDeliverable.delete({ where: { id } });
  revalidatePath("/clients");
  return { ok: true };
}

export async function getClientsWithDeliverables(userId: string) {
  return prisma.client.findMany({
    where: { userId },
    include: {
      deliverables: { orderBy: [{ status: "asc" }, { dueDate: "asc" }] },
    },
    orderBy: { updatedAt: "desc" },
  });
}
