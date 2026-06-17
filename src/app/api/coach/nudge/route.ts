import { NextResponse } from "next/server";
import { headers } from "next/headers";

import { auth } from "@/lib/auth";
import { getUserContextSummary } from "@/lib/ai/user-context";

export type NudgeType = "task" | "habit" | "study" | "deadline" | "event" | "rest" | "ok";

export async function GET() {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  try {
    const context = await getUserContextSummary(session.user.id);
    const now = new Date();
    const hour = now.getHours();

    let nudge = "";
    let type: NudgeType = "ok";

    // Priority 1: Overdue tasks
    if (context.tasks.overdueCount > 0) {
      const n = context.tasks.overdueCount;
      nudge = `${n} task${n > 1 ? "s are" : " is"} overdue. Tackle the quickest one now to get back on track.`;
      type = "task";
    }

    // Priority 2: Event starting in the next 30 min
    if (!nudge) {
      const soon = context.schedule.blocksToday.find((b) => {
        const diff = (new Date(b.startAt).getTime() - now.getTime()) / 60000;
        return diff > 0 && diff <= 30;
      });
      if (soon) {
        const mins = Math.round((new Date(soon.startAt).getTime() - now.getTime()) / 60000);
        nudge = `"${soon.title}" starts in ${mins} min — wrap up and prepare.`;
        type = "event";
      }
    }

    // Priority 3: Tasks due today
    if (!nudge && context.tasks.dueToday.length > 0) {
      const n = context.tasks.dueToday.length;
      nudge = `${n} task${n > 1 ? "s" : ""} due today. Start with: "${context.tasks.dueToday[0].title}"`;
      type = "task";
    }

    // Priority 4: Client deliverables due soon
    if (!nudge && context.clients.deliverablesDueSoon.length > 0) {
      const d = context.clients.deliverablesDueSoon[0];
      nudge = `Client deliverable coming up: "${d.title}" for ${d.clientName}. Check your progress.`;
      type = "deadline";
    }

    // Priority 5: Habits incomplete (morning/afternoon only)
    if (!nudge && context.habits.total > 0 && context.habits.completedToday < context.habits.total && hour < 21) {
      const remaining = context.habits.total - context.habits.completedToday;
      nudge = `${remaining} habit${remaining > 1 ? "s" : ""} left today. One quick win keeps your streak alive.`;
      type = "habit";
    }

    // Priority 6: No study yet today (between 9am–8pm)
    if (!nudge && context.study.courses.length > 0 && context.study.notesUpdatedToday === 0 && hour >= 9 && hour <= 20) {
      const course = context.study.courses[0];
      nudge = `No study yet today. Even 20 min on "${course.name}" builds retention — open it now.`;
      type = "study";
    }

    // Priority 7: Evening wind-down
    if (!nudge && hour >= 21) {
      nudge = "Good work today. Review what you completed and plan tomorrow's top 3 priorities before you rest.";
      type = "rest";
    }

    // All clear
    if (!nudge) {
      nudge = "You're on track. Protect your focus time and stay in the zone.";
      type = "ok";
    }

    return NextResponse.json({ nudge, type });
  } catch {
    return NextResponse.json(
      { nudge: "Stay focused and productive.", type: "ok" as NudgeType },
    );
  }
}
