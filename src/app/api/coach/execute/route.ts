import { NextResponse } from "next/server";
import { headers } from "next/headers";

import { auth } from "@/lib/auth";
import { addMinutes, atTime, endOfDay } from "@/lib/date-utils";
import { generateDayPlan } from "@/lib/automation/generate-day";
import { prisma } from "@/lib/prisma";

const allowedTaskCategories = new Set(["ACADEMICS", "CODING", "CONTENT", "CLIENTS", "PERSONAL"]);
const allowedEventCategories = new Set([
  "PERSONAL",
  "ACADEMICS",
  "CODING",
  "CONTENT",
  "CLIENTS",
  "CHURCH",
  "OTHER",
]);

export async function POST(request: Request) {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await request.json().catch(() => ({}));
  const actionType = String(body.actionType ?? "");
  const payload = (body.payload ?? {}) as Record<string, string>;
  const userId = session.user.id;

  if (actionType === "create_task") {
    const title = String(payload.title ?? "").trim();
    const category = String(payload.category ?? "PERSONAL");
    if (!title) {
      return NextResponse.json({ error: "Task title is required" }, { status: 400 });
    }
    const safeCategory = allowedTaskCategories.has(category) ? category : "PERSONAL";

    const created = await prisma.task.create({
      data: {
        userId,
        title,
        category: safeCategory as "ACADEMICS" | "CODING" | "CONTENT" | "CLIENTS" | "PERSONAL",
        status: "PLANNED",
      },
      select: { id: true, title: true },
    });

    return NextResponse.json({ ok: true, result: `Task created: ${created.title}`, id: created.id });
  }

  if (actionType === "complete_task") {
    const taskId = String(payload.taskId ?? "");
    if (!taskId) {
      return NextResponse.json({ error: "taskId is required" }, { status: 400 });
    }
    const task = await prisma.task.findFirst({ where: { id: taskId, userId } });
    if (!task) {
      return NextResponse.json({ error: "Task not found" }, { status: 404 });
    }
    await prisma.task.update({
      where: { id: task.id },
      data: { completed: true, status: "COMPLETED" },
    });
    return NextResponse.json({ ok: true, result: `Task completed: ${task.title}` });
  }

  if (actionType === "schedule_block") {
    const title = String(payload.title ?? "").trim();
    const startHour = Number(payload.startHour ?? "18");
    const durationMin = Number(payload.durationMin ?? "60");
    const categoryRaw = String(payload.category ?? "PERSONAL");
    if (!title) {
      return NextResponse.json({ error: "Block title is required" }, { status: 400 });
    }

    const safeHour = Number.isFinite(startHour) ? Math.min(22, Math.max(5, startHour)) : 18;
    const safeDuration = Number.isFinite(durationMin) ? Math.min(180, Math.max(30, durationMin)) : 60;
    const safeCategory = allowedEventCategories.has(categoryRaw) ? categoryRaw : "PERSONAL";
    const now = new Date();
    const startAt = atTime(now, safeHour, 0);
    const endAt = addMinutes(startAt, safeDuration);
    const dayEnd = endOfDay(now);
    if (endAt > dayEnd) {
      return NextResponse.json({ error: "Block must end today" }, { status: 400 });
    }

    await prisma.calendarEvent.create({
      data: {
        userId,
        title,
        startAt,
        endAt,
        category: safeCategory as
          | "PERSONAL"
          | "ACADEMICS"
          | "CODING"
          | "CONTENT"
          | "CLIENTS"
          | "CHURCH"
          | "OTHER",
        source: "SYSTEM",
      },
    });
    return NextResponse.json({ ok: true, result: `Scheduled block: ${title} at ${safeHour}:00` });
  }

  if (actionType === "run_daily_setup") {
    await generateDayPlan(userId);
    return NextResponse.json({ ok: true, result: "Daily setup complete. Schedule and focus refreshed." });
  }

  if (actionType === "rescue_overdue") {
    const now = new Date();
    const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const tomorrow = new Date(todayStart);
    tomorrow.setDate(tomorrow.getDate() + 1);

    const overdue = await prisma.task.findMany({
      where: {
        userId,
        completed: false,
        dueDate: { lt: todayStart },
      },
      select: { id: true },
      take: 12,
    });

    if (overdue.length === 0) {
      return NextResponse.json({ ok: true, result: "No overdue tasks found." });
    }

    await prisma.task.updateMany({
      where: { id: { in: overdue.map((task) => task.id) } },
      data: {
        dueDate: tomorrow,
        status: "PLANNED",
      },
    });

    return NextResponse.json({
      ok: true,
      result: `Rescheduled ${overdue.length} overdue task(s) to tomorrow.`,
    });
  }

  return NextResponse.json(
    {
      error: "Unsupported action type",
      supported: [
        "create_task",
        "complete_task",
        "schedule_block",
        "run_daily_setup",
        "rescue_overdue",
      ],
    },
    { status: 400 }
  );
}
