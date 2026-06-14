import { NextResponse } from "next/server";
import { headers } from "next/headers";

import { auth } from "@/lib/auth";
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
    payload: {
      title: "Deep work block",
      startHour: "18",
      durationMin: "90",
      category: "CODING",
    },
  });

  return { brief: lines.map((line) => `- ${line}`).join("\n"), actions, configured: false };
}

export async function GET() {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const context = await getUserContextSummary(session.user.id);
  const apiKey = process.env.OPENAI_API_KEY?.trim();
  if (!apiKey) {
    return NextResponse.json(buildFallbackBrief(context));
  }

  const prompt = [
    "You are Life OS AI Coach. Return ONLY valid JSON.",
    "JSON shape: {\"brief\":\"markdown bullets\", \"actions\":[{\"type\":\"create_task|complete_task|schedule_block\",\"label\":\"string\",\"payload\":{\"key\":\"value\"}}]}",
    "Keep brief to exactly 4 bullets: top focus, biggest risk, quick win, next module.",
    "Action payload rules:",
    "create_task => payload: {title, category}",
    "complete_task => payload: {taskId}",
    "schedule_block => payload: {title, startHour, durationMin, category}",
    "Use this user context:",
    JSON.stringify(context),
  ].join("\n");

  try {
    const res = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: process.env.OPENAI_MODEL ?? "gpt-4o-mini",
        messages: [{ role: "user", content: prompt }],
        max_tokens: 500,
        temperature: 0.3,
      }),
    });

    if (!res.ok) {
      return NextResponse.json(buildFallbackBrief(context));
    }

    const json = await res.json();
    const raw = String(json.choices?.[0]?.message?.content ?? "").trim();
    const parsed = JSON.parse(raw) as { brief?: string; actions?: ActionSuggestion[] };

    const payload: BriefPayload = {
      brief: parsed.brief ?? buildFallbackBrief(context).brief,
      actions: Array.isArray(parsed.actions) ? parsed.actions.slice(0, 3) : [],
      configured: true,
    };
    return NextResponse.json(payload);
  } catch {
    return NextResponse.json(buildFallbackBrief(context));
  }
}
