"use server";

import { revalidatePath } from "next/cache";

import { requireUserId } from "@/lib/actions/auth";
import { prisma } from "@/lib/prisma";

function todayDate() {
  const d = new Date();
  d.setHours(0, 0, 0, 0);
  return d;
}

export async function createHabit(formData: FormData) {
  const userId = await requireUserId();
  const name = String(formData.get("name") ?? "").trim();
  const color = String(formData.get("color") ?? "#3b82f6");
  if (!name) return { error: "Name is required" };

  await prisma.habit.create({ data: { userId, name, color } });
  revalidatePath("/habits");
  revalidatePath("/dashboard");
  return { ok: true };
}

export async function toggleHabitToday(habitId: string) {
  const userId = await requireUserId();
  const habit = await prisma.habit.findFirst({ where: { id: habitId, userId } });
  if (!habit) return { error: "Not found" };

  const date = todayDate();
  const existing = await prisma.habitLog.findUnique({
    where: { habitId_date: { habitId, date } },
  });

  if (existing) {
    await prisma.habitLog.delete({ where: { id: existing.id } });
  } else {
    await prisma.habitLog.create({ data: { habitId, date, completed: true } });
  }

  revalidatePath("/habits");
  revalidatePath("/dashboard");
  return { ok: true };
}

export async function deleteHabit(habitId: string) {
  const userId = await requireUserId();
  const habit = await prisma.habit.findFirst({ where: { id: habitId, userId } });
  if (!habit) return { error: "Not found" };
  await prisma.habitLog.deleteMany({ where: { habitId } });
  await prisma.habit.delete({ where: { id: habitId } });
  revalidatePath("/habits");
  revalidatePath("/dashboard");
  return { ok: true };
}

export async function getHabitsWithLogs(userId: string, days = 28) {
  const habits = await prisma.habit.findMany({
    where: { userId },
    orderBy: { createdAt: "asc" },
  });

  const start = new Date();
  start.setDate(start.getDate() - days);
  start.setHours(0, 0, 0, 0);

  const logs = await prisma.habitLog.findMany({
    where: {
      habitId: { in: habits.map((h) => h.id) },
      date: { gte: start },
      completed: true,
    },
  });

  const logSet = new Set(
    logs.map((l) => `${l.habitId}:${l.date.toISOString().slice(0, 10)}`)
  );

  return habits.map((h) => ({
    ...h,
    logDates: Array.from({ length: days }, (_, i) => {
      const d = new Date(start);
      d.setDate(d.getDate() + i);
      const key = `${h.id}:${d.toISOString().slice(0, 10)}`;
      return logSet.has(key);
    }),
  }));
}
