"use server";

import { revalidatePath } from "next/cache";
import { requireUserId } from "@/lib/actions/auth";
import { prisma } from "@/lib/prisma";

export async function getTodayJournal(userId: string) {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  return prisma.journalEntry.findUnique({ where: { userId_date: { userId, date: today } } });
}

export async function getRecentJournals(userId: string, limit = 14) {
  return prisma.journalEntry.findMany({
    where: { userId },
    orderBy: { date: "desc" },
    take: limit,
  });
}

export async function saveJournalEntry(formData: FormData) {
  const userId = await requireUserId();
  const mood = String(formData.get("mood") ?? "neutral");
  const content = String(formData.get("content") ?? "").trim();
  const wins = String(formData.get("wins") ?? "").trim();
  const blockers = String(formData.get("blockers") ?? "").trim();

  const today = new Date();
  today.setHours(0, 0, 0, 0);

  await prisma.journalEntry.upsert({
    where: { userId_date: { userId, date: today } },
    create: { userId, date: today, mood, content, wins, blockers },
    update: { mood, content, wins, blockers },
  });
  revalidatePath("/journal");
  return { ok: true };
}

export async function saveAIReflection(date: Date, reflection: string) {
  const userId = await requireUserId();
  const d = new Date(date);
  d.setHours(0, 0, 0, 0);
  await prisma.journalEntry.updateMany({
    where: { userId, date: d },
    data: { aiReflection: reflection },
  });
  return { ok: true };
}
