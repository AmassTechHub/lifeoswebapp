import { addMinutes, atTime, endOfDay, startOfDay } from "@/lib/date-utils";
import { prisma } from "@/lib/prisma";

export const AUTO_BRIEF_TAG = "__coach:auto_brief";

export async function wasAutoBriefToday(userId: string) {
  const now = new Date();
  const start = startOfDay(now);
  const end = endOfDay(now);

  const marker = await prisma.calendarEvent.findFirst({
    where: {
      userId,
      source: "SYSTEM",
      title: AUTO_BRIEF_TAG,
      startAt: { gte: start, lt: end },
    },
    select: { id: true, createdAt: true },
  });

  return {
    delivered: Boolean(marker),
    deliveredAt: marker?.createdAt?.toISOString() ?? null,
  };
}

export async function markAutoBriefToday(userId: string) {
  const existing = await wasAutoBriefToday(userId);
  if (existing.delivered) return existing;

  const now = new Date();
  const eventStart = atTime(now, 6, 30);
  await prisma.calendarEvent.create({
    data: {
      userId,
      title: AUTO_BRIEF_TAG,
      description: "Auto daily brief delivered on dashboard",
      startAt: eventStart,
      endAt: addMinutes(eventStart, 5),
      category: "PERSONAL",
      source: "SYSTEM",
    },
  });

  return { delivered: true, deliveredAt: new Date().toISOString() };
}

export type EveningReminderLevel = "none" | "soft" | "medium" | "urgent";

export function getEveningReminder(
  hour: number,
  eveningDone: boolean
): { level: EveningReminderLevel; message: string } {
  if (eveningDone) {
    return { level: "none", message: "" };
  }

  if (hour >= 22) {
    return {
      level: "urgent",
      message: "Urgent: close your day with evening review now to protect tomorrow's momentum.",
    };
  }
  if (hour >= 21) {
    return {
      level: "medium",
      message: "Evening review is due. Complete it before midnight.",
    };
  }
  if (hour >= 19) {
    return {
      level: "soft",
      message: "Reminder: complete your evening review before you close today.",
    };
  }

  return { level: "none", message: "" };
}
