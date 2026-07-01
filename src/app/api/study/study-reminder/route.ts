import { NextResponse } from "next/server";
import { headers } from "next/headers";

import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { sendPushToUser } from "@/lib/push/send";

function checkCronAuth(request: Request): boolean {
  const authHeader = request.headers.get("authorization") ?? "";
  const token = authHeader.startsWith("Bearer ") ? authHeader.slice(7).trim() : "";
  const secret = process.env.CRON_SECRET?.trim();
  return Boolean(secret) && token === secret;
}

// Called by Vercel cron or manually — sends study reminders to all users
export async function GET(request: Request) {
  if (!checkCronAuth(request)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  return runReminders();
}

export async function POST(request: Request) {
  // Allow authenticated users to trigger their own reminder (for testing)
  const session = await auth.api.getSession({ headers: await headers() });
  if (session?.user) {
    await sendReminderToUser(session.user.id);
    return NextResponse.json({ ok: true });
  }
  if (!checkCronAuth(request)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  return runReminders();
}

async function sendReminderToUser(userId: string) {
  const now = new Date();

  // Flashcards due
  const dueCount = await prisma.flashcard.count({
    where: { userId, OR: [{ nextReviewAt: null }, { nextReviewAt: { lte: now } }] },
  });

  // Nearest exam
  const nearestExam = await prisma.deadline.findFirst({
    where: {
      userId, completed: false,
      type: { in: ["EXAM", "QUIZ"] },
      dueDate: { gte: now },
    },
    orderBy: { dueDate: "asc" },
    include: { course: { select: { name: true } } },
  });

  // Streak — check if studied today
  const todayStart = new Date(now);
  todayStart.setHours(0, 0, 0, 0);
  const studiedToday = await prisma.studySession.count({
    where: { userId, startedAt: { gte: todayStart } },
  });

  // Build message
  let title = "Time to study 📚";
  let body = "";

  if (nearestExam) {
    const daysLeft = Math.round(
      (new Date(nearestExam.dueDate).getTime() - now.getTime()) / 86_400_000
    );
    if (daysLeft <= 3) {
      title = `⚡ ${nearestExam.title} in ${daysLeft === 0 ? "TODAY" : `${daysLeft} day${daysLeft === 1 ? "" : "s"}`}`;
      body = dueCount > 0
        ? `${dueCount} flashcards due. Review them now.`
        : "Use AI Tutor → Exam Prep Quiz to prepare.";
    } else if (dueCount > 0) {
      title = `${dueCount} flashcard${dueCount !== 1 ? "s" : ""} waiting for review`;
      body = `${nearestExam.title} in ${daysLeft} days — keep your streak going.`;
    }
  } else if (dueCount > 0) {
    title = `${dueCount} flashcard${dueCount !== 1 ? "s" : ""} due for review`;
    body = studiedToday === 0
      ? "You haven't studied yet today. 5 minutes keeps your streak alive."
      : "Quick review session — you've already started today!";
  } else if (studiedToday === 0) {
    title = "Keep your streak going 🔥";
    body = "No cards due today, but a quick 5-minute session counts. Open the AI Tutor for a speed recap.";
  } else {
    return; // Nothing to remind about
  }

  await sendPushToUser(userId, { title, body, url: "/learning" });
}

async function runReminders() {
  // Get all users who have push subscriptions
  const subs = await prisma.pushSubscription.findMany({
    select: { userId: true },
    distinct: ["userId"],
  });

  let reminded = 0;
  for (const { userId } of subs) {
    try {
      await sendReminderToUser(userId);
      reminded++;
    } catch {
      // Non-fatal — continue with other users
    }
  }

  return NextResponse.json({ ok: true, reminded });
}
