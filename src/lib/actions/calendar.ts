"use server";

import { revalidatePath } from "next/cache";

import { requireUserId } from "@/lib/actions/auth";
import { addMinutes, endOfDay, startOfDay } from "@/lib/date-utils";
import { eventCategories, type EventCategoryValue } from "@/lib/event-categories";
import { prisma } from "@/lib/prisma";

export async function createCalendarEvent(formData: FormData) {
  const userId = await requireUserId();
  const title = String(formData.get("title") ?? "").trim();
  const date = String(formData.get("date") ?? "");
  const startTime = String(formData.get("startTime") ?? "09:00");
  const endTime = String(formData.get("endTime") ?? "10:00");
  const category = String(formData.get("category") ?? "PERSONAL");

  if (!title || !date) return { error: "Title and date are required" };
  if (!eventCategories.includes(category as EventCategoryValue)) {
    return { error: "Invalid category" };
  }

  const [sh, sm] = startTime.split(":").map(Number);
  const [eh, em] = endTime.split(":").map(Number);
  const base = new Date(date);
  const startAt = startOfDay(base);
  startAt.setHours(sh, sm, 0, 0);
  const endAt = startOfDay(base);
  endAt.setHours(eh, em, 0, 0);
  if (endAt <= startAt) endAt.setTime(addMinutes(startAt, 60).getTime());

  await prisma.calendarEvent.create({
    data: {
      userId,
      title,
      startAt,
      endAt,
      category: category as EventCategoryValue,
      source: "MANUAL",
    },
  });

  revalidatePath("/calendar");
  revalidatePath("/planner");
  revalidatePath("/dashboard");
  return { ok: true };
}

export async function deleteCalendarEvent(id: string) {
  const userId = await requireUserId();
  const event = await prisma.calendarEvent.findFirst({ where: { id, userId } });
  if (!event) return { error: "Not found" };
  await prisma.calendarEvent.delete({ where: { id } });
  revalidatePath("/calendar");
  revalidatePath("/planner");
  revalidatePath("/dashboard");
  return { ok: true };
}

export async function getCalendarEvents(userId: string, from: Date, to: Date) {
  return prisma.calendarEvent.findMany({
    where: {
      userId,
      startAt: { gte: from, lt: to },
    },
    orderBy: { startAt: "asc" },
  });
}

export async function getWeekEvents(userId: string, anchor = new Date()) {
  const start = startOfDay(anchor);
  const day = start.getDay();
  const mondayOffset = day === 0 ? -6 : 1 - day;
  start.setDate(start.getDate() + mondayOffset);
  const end = addMinutes(start, 7 * 24 * 60);
  return getCalendarEvents(userId, start, end);
}

export async function getPlannerDay(userId: string, date = new Date()) {
  const dayStart = startOfDay(date);
  const dayEnd = endOfDay(date);

  const [events, snapshot, habits, tasks] = await Promise.all([
    prisma.calendarEvent.findMany({
      where: { userId, startAt: { gte: dayStart, lt: dayEnd } },
      orderBy: { startAt: "asc" },
    }),
    prisma.daySnapshot.findUnique({
      where: { userId_date: { userId, date: dayStart } },
    }),
    prisma.habit.findMany({
      where: { userId },
      include: {
        logs: {
          where: { date: { gte: dayStart, lt: dayEnd }, completed: true },
        },
      },
    }),
    prisma.task.findMany({
      where: {
        userId,
        completed: false,
        OR: [
          { dueDate: { gte: dayStart, lt: dayEnd } },
          { dueDate: null },
        ],
      },
      orderBy: { dueDate: "asc" },
      take: 10,
    }),
  ]);

  return {
    events,
    snapshot,
    habits: habits.map((h) => ({
      id: h.id,
      name: h.name,
      doneToday: h.logs.length > 0,
    })),
    tasks,
    date: dayStart,
  };
}

