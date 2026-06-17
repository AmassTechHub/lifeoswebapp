import { NextResponse } from "next/server";

import { prisma } from "@/lib/prisma";
import { sendPushToUser } from "@/lib/push/send";

const LOOKAHEAD_MS = 5 * 60_000; // catch anything starting in the next 5 minutes
const LOOKBACK_MS = 30 * 60_000; // don't spam ancient misses if the cron was down

function unauthorized() {
  return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
}

async function runCheck() {
  const now = new Date();
  const windowStart = new Date(now.getTime() - LOOKBACK_MS);
  const windowEnd = new Date(now.getTime() + LOOKAHEAD_MS);

  const [dueEvents, dueTasks] = await Promise.all([
    prisma.calendarEvent.findMany({
      where: { startAt: { gte: windowStart, lte: windowEnd }, notifiedAt: null },
      select: { id: true, userId: true, title: true, startAt: true },
    }),
    prisma.task.findMany({
      where: { dueDate: { gte: windowStart, lte: windowEnd }, notifiedAt: null, completed: false },
      select: { id: true, userId: true, title: true },
    }),
  ]);

  let eventsNotified = 0;
  let tasksNotified = 0;

  for (const event of dueEvents) {
    const sent = await sendPushToUser(event.userId, {
      title: "Starting now",
      body: event.title,
      url: "/calendar",
    });
    if (sent > 0) eventsNotified++;
    await prisma.calendarEvent.update({ where: { id: event.id }, data: { notifiedAt: now } });
  }

  for (const task of dueTasks) {
    const sent = await sendPushToUser(task.userId, {
      title: "Task due now",
      body: task.title,
      url: "/tasks",
    });
    if (sent > 0) tasksNotified++;
    await prisma.task.update({ where: { id: task.id }, data: { notifiedAt: now } });
  }

  return { eventsChecked: dueEvents.length, tasksChecked: dueTasks.length, eventsNotified, tasksNotified };
}

function checkAuth(request: Request): boolean {
  const authHeader = request.headers.get("authorization") ?? "";
  const token = authHeader.startsWith("Bearer ") ? authHeader.slice(7).trim() : "";
  const secret = process.env.CRON_SECRET?.trim();
  return Boolean(secret) && token === secret;
}

export async function GET(request: Request) {
  if (!checkAuth(request)) return unauthorized();
  const result = await runCheck();
  return NextResponse.json({ ok: true, ...result });
}

export async function POST(request: Request) {
  if (!checkAuth(request)) return unauthorized();
  const result = await runCheck();
  return NextResponse.json({ ok: true, ...result });
}
