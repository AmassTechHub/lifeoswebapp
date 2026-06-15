import { NextResponse } from "next/server";
import { headers } from "next/headers";

import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { callClaude, getServerApiKey } from "@/lib/ai/claude";
import { checkAndIncrementUsage } from "@/lib/ai/usage";
import { getUserContextSummary } from "@/lib/ai/user-context";

type ActionSuggestion = {
  type: "create_task" | "complete_task" | "schedule_block";
  label: string;
  payload: Record<string, string>;
};

type BriefPayload = {
  brief: string;
  actions: ActionSuggestion[];
  configured: boolean;
};

function buildFallbackBrief(context: Awaited<ReturnType<typeof getUserContextSummary>>): BriefPayload {
  const topTask = context.tasks.dueToday[0];
  const topDeliverable = context.clients.deliverablesDueSoon[0];

  const lines = [
    `Top focus: ${topTask ? topTask.title : "Run daily setup and create your first priority task."}`,
    `Biggest risk: ${
      context.tasks.overdueCount > 0
        ? `${context.tasks.overdueCount} overdue task(s) need rescue planning today.`
        : "No overdue task pressure right now."
    }`,
    `Quick win: complete one high-impact task before midday.`,
    `Suggested module: ${
      context.schedule.blocksToday.length > 0 ? "Planner and Focus" : "Planner to build your day blocks"
    }.`,
  ];

  const actions: ActionSuggestion[] = [];
  if (topTask) {
    actions.push({
      type: "complete_task",
      label: `Mark "${topTask.title}" complete`,
      payload: { taskId: topTask.id },
    });
  }
  if (topDeliverable) {
    actions.push({
      type: "create_task",
      label: "Create client follow-up task",
      payload: {
        title: `Follow up: ${topDeliverable.clientName} - ${topDeliverable.title}`,
        category: "CLIENTS",
      },
    });
  }
  actions.push({
    type: "schedule_block",
    label: "Add 90-minute deep work block (18:00)",
    payload: { title: "Deep work block", startHour: "18", durationMin: "90", category: "CODING" },
  });

  return { brief: lines.map((line) => `- ${line}`).join("\n"), actions, configured: false };
}

export async function GET() {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const context = await getUserContextSummary(session.user.id);
  const apiKey = getServerApiKey();
  if (!apiKey) {
    return NextResponse.json(buildFallbackBrief(context));
  }

  const usage = await checkAndIncrementUsage(session.user.id);
  if (!usage.allowed) {
    return NextResponse.json({ ...buildFallbackBrief(context), configured: false });
  }

  const userRecord = await prisma.user.findUnique({
    where: { id: session.user.id },
    select: { isPro: true },
  });

  const system = [
    "You are Life OS AI Coach. Return ONLY valid JSON with no markdown fences.",
    'JSON shape: {"brief":"markdown bullets","actions":[{"type":"create_task|complete_task|schedule_block","label":"string","payload":{"key":"value"}}]}',
    "Keep brief to exactly 4 bullets: top focus, biggest risk, quick win, next module.",
    "create_task payload: {title, category}  |  complete_task payload: {taskId}  |  schedule_block payload: {title, startHour, durationMin, category}",
  ].join("\n");

  try {
    const reply = await callClaude({
      apiKey,
      system,
      messages: [{ role: "user", content: `User context:\n${JSON.stringify(context)}` }],
      maxTokens: 600,
      isPro: userRecord?.isPro ?? false,
    });

    const parsed = JSON.parse(reply) as { brief?: string; actions?: ActionSuggestion[] };
    return NextResponse.json({
      brief: parsed.brief ?? buildFallbackBrief(context).brief,
      actions: Array.isArray(parsed.actions) ? parsed.actions.slice(0, 3) : [],
      configured: true,
    } satisfies BriefPayload);
  } catch {
    return NextResponse.json(buildFallbackBrief(context));
  }
}
