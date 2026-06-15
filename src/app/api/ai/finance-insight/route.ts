import { NextResponse } from "next/server";
import { headers } from "next/headers";

import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { callClaude, getServerApiKey } from "@/lib/ai/claude";
import { checkAndIncrementUsage } from "@/lib/ai/usage";

export async function POST(request: Request) {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await request.json().catch(() => ({}));
  const { budgets, spending, totalIncome, savingsGoals } = body as {
    budgets: { name: string; monthlyLimit: number }[];
    spending: Record<string, number>;
    totalIncome: number;
    savingsGoals: { name: string; targetAmount: number; currentAmount: number }[];
  };

  const apiKey = getServerApiKey();
  if (!apiKey) {
    return NextResponse.json({ insights: getDefaultInsights(budgets, spending, totalIncome) });
  }

  const usage = await checkAndIncrementUsage(session.user.id);
  if (!usage.allowed) {
    return NextResponse.json({ insights: getDefaultInsights(budgets, spending, totalIncome) });
  }

  const userRecord = await prisma.user.findUnique({
    where: { id: session.user.id },
    select: { isPro: true },
  });

  const now = new Date();
  const daysInMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0).getDate();
  const dayOfMonth = now.getDate();
  const daysLeft = daysInMonth - dayOfMonth;
  const totalSpent = Object.values(spending).reduce((s, v) => s + v, 0);
  const totalBudget = budgets.reduce((s, b) => s + b.monthlyLimit, 0);
  const projectedTotal = dayOfMonth > 0 ? (totalSpent / dayOfMonth) * daysInMonth : 0;

  const context = {
    currentDate: now.toLocaleDateString("en-GH"),
    daysLeft,
    daysInMonth,
    dayOfMonth,
    budgets: budgets.map((b) => ({
      category: b.name,
      limit: b.monthlyLimit,
      spent: spending[b.name] ?? 0,
      remaining: b.monthlyLimit - (spending[b.name] ?? 0),
      pctUsed: b.monthlyLimit > 0 ? Math.round(((spending[b.name] ?? 0) / b.monthlyLimit) * 100) : 0,
    })),
    totalIncome,
    totalSpent,
    totalBudget,
    projectedTotal: Math.round(projectedTotal),
    savingsGoals,
    currency: "GHS (Ghana Cedis)",
  };

  const system = `You are a personal finance advisor for a Ghanaian student/young professional.
Analyze their spending vs budget and return EXACTLY 4 insights as a JSON array (no markdown fences):
[
  {"type":"warning|tip|success|info","title":"short title","body":"1-2 sentence insight"},
  ...
]
Types: "warning" = overspending risk, "tip" = actionable advice, "success" = positive trend, "info" = neutral info.
Include Ghana-specific investment advice when relevant (MTN MoMo savings 5% p.a., Treasury Bills ~22% p.a., Databank/Stanbic mutual funds, eCozy/Absa savings).
Be specific with numbers (₵ amounts, percentages, days left).`;

  try {
    const raw = await callClaude({
      apiKey,
      system,
      messages: [{ role: "user", content: `Finance context:\n${JSON.stringify(context)}` }],
      maxTokens: 800,
      isPro: userRecord?.isPro ?? false,
    });

    const match = raw.match(/\[[\s\S]*\]/);
    if (match) {
      const insights = JSON.parse(match[0]) as { type: string; title: string; body: string }[];
      return NextResponse.json({ insights: insights.slice(0, 4) });
    }
  } catch {
    // fall through to default
  }

  return NextResponse.json({ insights: getDefaultInsights(budgets, spending, totalIncome) });
}

function getDefaultInsights(
  budgets: { name: string; monthlyLimit: number }[],
  spending: Record<string, number>,
  totalIncome: number
): { type: string; title: string; body: string }[] {
  const insights: { type: string; title: string; body: string }[] = [];
  const now = new Date();
  const daysInMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0).getDate();
  const dayOfMonth = now.getDate();
  const totalSpent = Object.values(spending).reduce((s, v) => s + v, 0);

  const overBudget = budgets.filter(
    (b) => (spending[b.name] ?? 0) > b.monthlyLimit
  );

  if (overBudget.length > 0) {
    insights.push({
      type: "warning",
      title: "Over budget",
      body: `You've exceeded your limit in ${overBudget.map((b) => b.name).join(", ")}. Review these categories to get back on track.`,
    });
  }

  const saved = totalIncome - totalSpent;
  if (saved > 0) {
    insights.push({
      type: "success",
      title: "Positive savings",
      body: `You have ₵${saved.toFixed(2)} remaining from your income. Consider putting ₵${Math.round(saved * 0.5)} in a Treasury Bill or MoMo Savings (up to 22% p.a.).`,
    });
  }

  const pctMonthPassed = Math.round((dayOfMonth / daysInMonth) * 100);
  const totalBudget = budgets.reduce((s, b) => s + b.monthlyLimit, 0);
  const pctSpent = totalBudget > 0 ? Math.round((totalSpent / totalBudget) * 100) : 0;

  if (pctSpent > pctMonthPassed + 20) {
    insights.push({
      type: "warning",
      title: "Spending too fast",
      body: `You've used ${pctSpent}% of your budget but only ${pctMonthPassed}% of the month has passed. Slow down to avoid shortfalls.`,
    });
  } else {
    insights.push({
      type: "tip",
      title: "Investment tip",
      body: "Treasury Bills in Ghana offer ~22% p.a. with low risk. Contact your bank to invest any surplus above ₵500 this month.",
    });
  }

  if (insights.length < 4) {
    insights.push({
      type: "info",
      title: "Track consistently",
      body: "Log every expense — even small ones like trotro fare or data bundles — to get accurate budget predictions.",
    });
  }

  return insights.slice(0, 4);
}
