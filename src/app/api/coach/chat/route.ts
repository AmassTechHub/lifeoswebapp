import { NextResponse } from "next/server";
import { headers } from "next/headers";

import { auth } from "@/lib/auth";
import { getUserContextSummary } from "@/lib/ai/user-context";
import { prisma } from "@/lib/prisma";

// ─── Tool definitions ─────────────────────────────────────────────────────────

const TOOLS = [
  {
    name: "create_task",
    description:
      "Create a task in the user's Life OS task board. Use when the user says to add, create, or assign a task or to-do item.",
    input_schema: {
      type: "object",
      properties: {
        title: { type: "string", description: "Short task title" },
        description: { type: "string", description: "Optional context or notes for this task" },
        category: {
          type: "string",
          enum: ["ACADEMICS", "CODING", "CONTENT", "CLIENTS", "PERSONAL"],
          description: "Task category",
        },
        dueDate: {
          type: "string",
          description: "ISO 8601 datetime string, e.g. 2024-06-20T17:00:00Z. Use the current date from context as reference.",
        },
      },
      required: ["title"],
    },
  },
  {
    name: "create_calendar_event",
    description:
      "Add a scheduled event or time block to the user's calendar. Use when the user asks to schedule, block time, or plan a session. Act immediately — do not defer to later.",
    input_schema: {
      type: "object",
      properties: {
        title: { type: "string", description: "Event name" },
        startAt: { type: "string", description: "ISO 8601 datetime for start, e.g. 2024-06-20T18:00:00Z" },
        endAt: { type: "string", description: "ISO 8601 datetime for end" },
        category: {
          type: "string",
          enum: ["PERSONAL", "ACADEMICS", "CODING", "CONTENT", "CLIENTS", "OTHER"],
          description: "Event category",
        },
        description: { type: "string", description: "Optional notes" },
      },
      required: ["title", "startAt", "endAt"],
    },
  },
  {
    name: "create_goal",
    description:
      "Create a goal in Life OS. Use when the user says to set, add, or create a goal or objective.",
    input_schema: {
      type: "object",
      properties: {
        title: { type: "string" },
        description: { type: "string" },
        level: {
          type: "string",
          enum: ["VISION", "ANNUAL", "QUARTERLY", "MONTHLY", "WEEKLY", "DAILY"],
          description: "Goal time horizon",
        },
      },
      required: ["title", "level"],
    },
  },
  {
    name: "create_habit",
    description:
      "Create a new daily habit for the user to track. Use when the user says to add or start a habit.",
    input_schema: {
      type: "object",
      properties: {
        name: { type: "string", description: "Habit name" },
        color: { type: "string", description: "Hex color like #3b82f6" },
      },
      required: ["name"],
    },
  },
  {
    name: "create_deadline",
    description:
      "Create an exam, assignment, or project deadline linked to a study course. Use when the user mentions an upcoming exam, assignment due date, or project deadline.",
    input_schema: {
      type: "object",
      properties: {
        title: { type: "string", description: "Deadline title e.g. 'Midterm Exam', 'Assignment 2 submission'" },
        dueDate: { type: "string", description: "ISO 8601 date YYYY-MM-DD" },
        type: {
          type: "string",
          enum: ["ASSIGNMENT", "EXAM", "PROJECT", "QUIZ"],
          description: "Type of deadline",
        },
        courseName: {
          type: "string",
          description: "Name of the study course — will be matched to the user's existing courses",
        },
      },
      required: ["title", "dueDate"],
    },
  },
  {
    name: "get_spending_summary",
    description:
      "Fetch the user's real income, expenses, and spending by category for this month. ALWAYS call this before answering any question about money, spending, savings, or budget — never guess.",
    input_schema: { type: "object", properties: {}, required: [] },
  },
  {
    name: "get_budget_status",
    description:
      "Fetch the user's budget categories and how much of each limit has been used this month. Call this when asked about budget, whether they're over budget, or for savings advice.",
    input_schema: { type: "object", properties: {}, required: [] },
  },
  {
    type: "web_search_20250305",
    name: "web_search",
    max_uses: 5,
  },
];

// ─── Types ────────────────────────────────────────────────────────────────────

type ToolInput = Record<string, unknown>;

export type ActionRecord = {
  type: "task" | "event" | "goal" | "habit" | "deadline";
  label: string;
  id: string;
};

type TextBlock = { type: "text"; text: string };
type ToolUseBlock = { type: "tool_use"; id: string; name: string; input: ToolInput };
type ServerToolUseBlock = { type: "server_tool_use"; id: string; name: string; input: ToolInput };
type WebSearchResultBlock = { type: "web_search_tool_result"; tool_use_id: string; content: unknown };
type ToolResultBlock = { type: "tool_result"; tool_use_id: string; content: string };
type ContentBlock = TextBlock | ToolUseBlock | ServerToolUseBlock | WebSearchResultBlock | ToolResultBlock;
type ChatMessage = { role: "user" | "assistant"; content: string | ContentBlock[] };

interface AnthropicResponse {
  content: ContentBlock[];
  stop_reason: "end_turn" | "tool_use" | "max_tokens" | "pause_turn";
}

// ─── System prompt builder ─────────────────────────────────────────────────────

function buildSystemPrompt(user: {
  name: string;
  primaryGoal: string | null;
  useCase: string | null;
  workSchedule: string | null;
}): string {
  const parts: string[] = [];
  parts.push(`You are Life OS AI Coach for ${user.name}.`);
  parts.push(
    "You help with: daily planning, study (notes, summaries, flashcards), content creation, tasks, goals, habits, and finance awareness."
  );
  parts.push("You have MEMORY — you can see recent daily/weekly summaries in the context. Reference them to give continuity.");
  if (user.primaryGoal) {
    parts.push(`Their current primary goal: "${user.primaryGoal}".`);
  }
  if (user.useCase) {
    try {
      const cases = JSON.parse(user.useCase) as string[];
      if (cases.length > 0) parts.push(`They use Life OS for: ${cases.join(", ")}.`);
    } catch {}
  }
  if (user.workSchedule) {
    try {
      const s = JSON.parse(user.workSchedule) as {
        days?: string[];
        startTime?: string;
        endTime?: string;
      };
      if (s.days && s.startTime && s.endTime) {
        parts.push(`Work schedule: ${s.days.join(", ")}, ${s.startTime}–${s.endTime}.`);
      }
    } catch {}
  }
  parts.push("Keep answers practical, short, and actionable. No fluff.");
  parts.push("If asked to plan a day, use bullet points with times.");
  parts.push("If asked for study help, explain clearly like a tutor.");
  parts.push("If asked for content, suggest hooks, outlines, or script beats.");
  parts.push("You work for users worldwide — don't assume any specific country, currency, or context unless it's in the user's profile.");
  parts.push("");
  parts.push("TOOLS — you can act directly in Life OS:");
  parts.push("  create_task           → 'add a task', 'remind me to X', 'I need to do X'");
  parts.push("  create_calendar_event → 'block time for X', 'add X to my schedule', 'schedule X sessions'");
  parts.push("  create_goal           → 'set a goal to X', 'I want to achieve X'");
  parts.push("  create_habit          → 'add a habit to track', 'I want to build a habit of X'");
  parts.push("  create_deadline       → 'I have an exam/assignment on X date'");
  parts.push("  get_spending_summary  → 'how much did I spend?', 'my finances', 'how much on food/transport?'");
  parts.push("  get_budget_status     → 'am I over budget?', 'savings goal', 'how's my budget?'");
  parts.push("  web_search            → anything current, recent, or outside your training data");
  parts.push("");
  parts.push("CRITICAL RULES:");
  parts.push("  • USE TOOLS IMMEDIATELY — NEVER say 'I will add that later' or 'I'll schedule that soon'. Do it NOW.");
  parts.push("  • 'can you later add content creation schedules' = create the calendar events RIGHT NOW.");
  parts.push("  • For multiple blocks (3 sessions this week), call create_calendar_event once per block.");
  parts.push("  • Use 'nowIso' from context to calculate correct future dates.");
  parts.push("  • NEVER guess finance numbers — always call get_spending_summary or get_budget_status first.");
  parts.push(
    "  • NEVER say 'I don't have enough information' or 'my knowledge is limited' for anything time-sensitive, current, or about real-world facts — call web_search instead and answer from the results."
  );
  parts.push("  • Reference RECENT HISTORY when relevant — if they struggled with habits last week, acknowledge it.");
  parts.push("  • After tool use, give ONE short confirmation sentence. The UI shows what was created.");
  return parts.join("\n");
}

// ─── Tool executor ─────────────────────────────────────────────────────────────

async function executeTool(
  name: string,
  input: ToolInput,
  userId: string
): Promise<{ result: string; action?: ActionRecord }> {
  try {
    if (name === "create_task") {
      const validCategories = ["ACADEMICS", "CODING", "CONTENT", "CLIENTS", "PERSONAL"] as const;
      type TaskCat = (typeof validCategories)[number];
      const category: TaskCat = validCategories.includes(String(input.category ?? "") as TaskCat)
        ? (String(input.category) as TaskCat)
        : "PERSONAL";

      const task = await prisma.task.create({
        data: {
          userId,
          title: String(input.title ?? "New task"),
          description: input.description ? String(input.description) : null,
          category,
          dueDate: input.dueDate ? new Date(String(input.dueDate)) : null,
          completed: false,
        },
      });
      return {
        result: `Task created: "${task.title}" (id: ${task.id})`,
        action: { type: "task", label: task.title, id: task.id },
      };
    }

    if (name === "create_calendar_event") {
      const validCategories = ["PERSONAL", "ACADEMICS", "CODING", "CONTENT", "CLIENTS", "OTHER"] as const;
      type EventCat = (typeof validCategories)[number];
      const category: EventCat = validCategories.includes(String(input.category ?? "") as EventCat)
        ? (String(input.category) as EventCat)
        : "OTHER";

      const startAt = new Date(String(input.startAt));
      const endAt = new Date(String(input.endAt));

      if (isNaN(startAt.getTime()) || isNaN(endAt.getTime())) {
        return { result: `Error: Invalid dates provided for "${String(input.title ?? "")}"` };
      }

      const event = await prisma.calendarEvent.create({
        data: {
          userId,
          title: String(input.title ?? "Event"),
          startAt,
          endAt,
          category,
          description: input.description ? String(input.description) : null,
          source: "SYSTEM",
        },
      });
      return {
        result: `Calendar event created: "${event.title}" on ${event.startAt.toLocaleDateString()} ${event.startAt.toLocaleTimeString()} (id: ${event.id})`,
        action: { type: "event", label: event.title, id: event.id },
      };
    }

    if (name === "create_goal") {
      const validLevels = ["VISION", "ANNUAL", "QUARTERLY", "MONTHLY", "WEEKLY", "DAILY"] as const;
      type GoalLvl = (typeof validLevels)[number];
      const level: GoalLvl = validLevels.includes(String(input.level ?? "") as GoalLvl)
        ? (String(input.level) as GoalLvl)
        : "MONTHLY";

      const goal = await prisma.goal.create({
        data: {
          userId,
          title: String(input.title ?? "New goal"),
          description: input.description ? String(input.description) : null,
          level,
        },
      });
      return {
        result: `Goal created: "${goal.title}" (level: ${goal.level}, id: ${goal.id})`,
        action: { type: "goal", label: goal.title, id: goal.id },
      };
    }

    if (name === "create_habit") {
      const habit = await prisma.habit.create({
        data: {
          userId,
          name: String(input.name ?? "New habit"),
          color: input.color ? String(input.color) : "#3b82f6",
        },
      });
      return {
        result: `Habit created: "${habit.name}" (id: ${habit.id})`,
        action: { type: "habit", label: habit.name, id: habit.id },
      };
    }

    if (name === "create_deadline") {
      const dueDate = new Date(String(input.dueDate));
      if (isNaN(dueDate.getTime())) return { result: `Error: Invalid due date for "${String(input.title ?? "")}"` };

      // Match course by name
      let courseId: string | null = null;
      if (input.courseName) {
        const needle = String(input.courseName).toLowerCase();
        const courses = await prisma.studyCourse.findMany({
          where: { userId },
          select: { id: true, name: true },
        });
        const match = courses.find(
          (c) => c.name.toLowerCase().includes(needle) || needle.includes(c.name.toLowerCase())
        );
        if (match) courseId = match.id;
      }

      const deadline = await prisma.deadline.create({
        data: {
          userId,
          title: String(input.title ?? "Deadline"),
          dueDate,
          type: ["ASSIGNMENT", "EXAM", "PROJECT", "QUIZ"].includes(String(input.type ?? ""))
            ? String(input.type)
            : "ASSIGNMENT",
          courseId,
          completed: false,
        },
      });
      return {
        result: `Deadline created: "${deadline.title}" due ${deadline.dueDate.toLocaleDateString()} (id: ${deadline.id})`,
        action: { type: "deadline", label: deadline.title, id: deadline.id },
      };
    }

    if (name === "get_spending_summary") {
      const now = new Date();
      const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
      const prevMonthStart = new Date(now.getFullYear(), now.getMonth() - 1, 1);
      const prevMonthEnd = new Date(now.getFullYear(), now.getMonth(), 0, 23, 59, 59);

      const [expenses, prevExpenses, incomes, userPrefsRow] = await Promise.all([
        prisma.expense.findMany({
          where: { userId, date: { gte: monthStart } },
          select: { amount: true, category: true },
        }),
        prisma.expense.findMany({
          where: { userId, date: { gte: prevMonthStart, lte: prevMonthEnd } },
          select: { amount: true, category: true },
        }),
        prisma.income.findMany({
          where: { userId, date: { gte: monthStart } },
          select: { amount: true, source: true },
        }),
        prisma.user.findUnique({ where: { id: userId }, select: { currency: true } }),
      ]);

      const cur = userPrefsRow?.currency ?? "GHS";

      const byCategory: Record<string, number> = {};
      for (const e of expenses) byCategory[e.category] = (byCategory[e.category] ?? 0) + e.amount;

      const prevByCategory: Record<string, number> = {};
      for (const e of prevExpenses) prevByCategory[e.category] = (prevByCategory[e.category] ?? 0) + e.amount;

      const totalExpenses = expenses.reduce((s, e) => s + e.amount, 0);
      const totalIncome = incomes.reduce((s, e) => s + e.amount, 0);
      const prevTotal = prevExpenses.reduce((s, e) => s + e.amount, 0);

      const month = now.toLocaleDateString("en-US", { month: "long", year: "numeric" });
      const categoryLines = Object.entries(byCategory)
        .sort((a, b) => b[1] - a[1])
        .map(([cat, amt]) => {
          const prev = prevByCategory[cat] ?? 0;
          const change = prev > 0 ? ` (${amt > prev ? "+" : ""}${Math.round(((amt - prev) / prev) * 100)}% vs last month)` : "";
          return `  ${cat}: ${cur} ${amt.toFixed(2)}${change}`;
        });

      return {
        result: [
          `Spending summary — ${month}:`,
          `Total income: ${cur} ${totalIncome.toFixed(2)}`,
          `Total expenses: ${cur} ${totalExpenses.toFixed(2)}`,
          `Net: ${cur} ${(totalIncome - totalExpenses).toFixed(2)}`,
          `Last month total: ${cur} ${prevTotal.toFixed(2)}`,
          `By category:`,
          ...categoryLines,
        ].join("\n"),
      };
    }

    if (name === "get_budget_status") {
      const now = new Date();
      const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);

      const [budgets, expenses, goals, budgetUserPrefs] = await Promise.all([
        prisma.budgetCategory.findMany({
          where: { userId, month: now.getMonth() + 1, year: now.getFullYear() },
          select: { name: true, monthlyLimit: true },
        }),
        prisma.expense.findMany({
          where: { userId, date: { gte: monthStart } },
          select: { amount: true, category: true },
        }),
        prisma.savingsGoal.findMany({
          where: { userId, completed: false },
          select: { name: true, targetAmount: true, currentAmount: true },
          take: 5,
        }),
        prisma.user.findUnique({ where: { id: userId }, select: { currency: true } }),
      ]);

      const bCur = budgetUserPrefs?.currency ?? "GHS";

      const byCategory: Record<string, number> = {};
      for (const e of expenses) byCategory[e.category] = (byCategory[e.category] ?? 0) + e.amount;

      const budgetLines =
        budgets.length === 0
          ? ["No budget categories set for this month."]
          : budgets.map((b) => {
              const spent = byCategory[b.name] ?? 0;
              const pct = Math.round((spent / b.monthlyLimit) * 100);
              const status = pct >= 100 ? "OVER BUDGET" : pct >= 80 ? "NEAR LIMIT" : "OK";
              return `  ${b.name}: ${bCur} ${spent.toFixed(2)} / ${bCur} ${b.monthlyLimit.toFixed(2)} (${pct}%) — ${status}`;
            });

      const goalLines =
        goals.length === 0
          ? []
          : ["Savings goals:", ...goals.map((g) => {
              const pct = g.targetAmount > 0 ? Math.round((g.currentAmount / g.targetAmount) * 100) : 0;
              return `  ${g.name}: ${bCur} ${g.currentAmount.toFixed(2)} / ${bCur} ${g.targetAmount.toFixed(2)} (${pct}%)`;
            })];

      return {
        result: [
          `Budget status — ${now.toLocaleDateString("en-US", { month: "long", year: "numeric" })}:`,
          ...budgetLines,
          ...(goalLines.length > 0 ? ["", ...goalLines] : []),
        ].join("\n"),
      };
    }

    return { result: `Unknown tool: ${name}` };
  } catch (err) {
    const msg = err instanceof Error ? err.message : "Unknown error";
    return { result: `Error executing ${name}: ${msg}` };
  }
}

// ─── Route handler ─────────────────────────────────────────────────────────────

export async function POST(request: Request) {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await request.json().catch(() => ({}));
  const message = String(body.message ?? "").trim();
  const history = Array.isArray(body.history) ? body.history : [];

  if (!message) {
    return NextResponse.json({ error: "Message is required" }, { status: 400 });
  }

  const [context, userRecord] = await Promise.all([
    getUserContextSummary(session.user.id),
    prisma.user.findUnique({
      where: { id: session.user.id },
      select: {
        openAiKey: true,
        name: true,
        primaryGoal: true,
        useCase: true,
        workSchedule: true,
      },
    }),
  ]);

  // Fetch recent cycle logs for coach memory (last 7 days of context)
  const cycleMemory = await prisma.lifeCycleLog.findMany({
    where: { userId: session.user.id },
    orderBy: { createdAt: "desc" },
    take: 10,
    select: { type: true, summary: true, date: true },
  });

  const apiKey = (userRecord?.openAiKey?.trim() || process.env.ANTHROPIC_API_KEY?.trim()) ?? "";
  if (!apiKey) {
    return NextResponse.json({
      reply:
        "AI Coach is ready, but no Claude API key is set yet. Go to Settings → AI Coach and paste your Anthropic API key (get one free at console.anthropic.com).",
      configured: false,
    });
  }

  const systemPrompt = buildSystemPrompt({
    name: userRecord?.name ?? session.user.name ?? "there",
    primaryGoal: userRecord?.primaryGoal ?? null,
    useCase: userRecord?.useCase ?? null,
    workSchedule: userRecord?.workSchedule ?? null,
  });

  const chatMessages: ChatMessage[] = [
    ...history
      .slice(-12)
      .map((m: { role?: string; content?: string }) => ({
        role: (m.role === "assistant" ? "assistant" : "user") as "user" | "assistant",
        content: String(m.content ?? "").slice(0, 4000),
      })),
    { role: "user", content: message },
  ];

  const allActions: ActionRecord[] = [];
  const memorySection = cycleMemory.length > 0
    ? "\n\nRECENT HISTORY (your memory of this user):\n" +
      cycleMemory
        .map((c) => `  [${c.type} ${new Date(c.date).toLocaleDateString()}] ${c.summary}`)
        .join("\n")
    : "";

  const fullSystem = `${systemPrompt}\n\nLive context:\n${JSON.stringify(context)}${memorySection}`;

  async function callAnthropic(
    msgs: typeof chatMessages
  ): Promise<AnthropicResponse> {
    const res = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "x-api-key": apiKey,
        "anthropic-version": "2023-06-01",
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: process.env.ANTHROPIC_MODEL ?? "claude-3-5-haiku-20241022",
        max_tokens: 1536,
        system: fullSystem,
        tools: TOOLS,
        messages: msgs,
      }),
    });

    if (!res.ok) {
      const err = await res.text();
      throw new Error(`Anthropic error: ${err}`);
    }

    return res.json() as Promise<AnthropicResponse>;
  }

  try {
    let currentMessages = chatMessages;
    let finalReply = "";
    let iterations = 0;

    while (iterations < 5) {
      iterations++;
      const data = await callAnthropic(currentMessages);

      if (data.stop_reason === "pause_turn") {
        // Server-side tool (web_search) hit its internal iteration limit — resume.
        currentMessages = [...currentMessages, { role: "assistant", content: data.content }];
        continue;
      }

      if (data.stop_reason !== "tool_use") {
        // Final text response
        finalReply =
          data.content.find((b): b is TextBlock => b.type === "text")?.text?.trim() ??
          "I could not generate a response. Try again.";
        break;
      }

      // Extract tool_use blocks
      const toolUseBlocks = data.content.filter((b): b is ToolUseBlock => b.type === "tool_use");

      if (toolUseBlocks.length === 0) {
        finalReply =
          data.content.find((b): b is TextBlock => b.type === "text")?.text?.trim() ??
          "Done.";
        break;
      }

      // Execute all tools (sequentially to maintain DB integrity)
      const toolResults: { type: "tool_result"; tool_use_id: string; content: string }[] = [];
      for (const toolBlock of toolUseBlocks) {
        const { result, action } = await executeTool(toolBlock.name, toolBlock.input, session.user.id);
        toolResults.push({ type: "tool_result", tool_use_id: toolBlock.id, content: result });
        if (action) allActions.push(action);
      }

      // Append AI response + tool results to messages for next turn
      currentMessages = [
        ...currentMessages,
        { role: "assistant", content: data.content },
        { role: "user", content: toolResults },
      ];
    }

    if (!finalReply) finalReply = "Done! Check your tasks and calendar for what was added.";

    return NextResponse.json({
      reply: finalReply,
      actions: allActions,
      configured: true,
    });
  } catch (e) {
    console.error(e);
    return NextResponse.json({ error: "AI service unavailable. Check your API key." }, { status: 503 });
  }
}
