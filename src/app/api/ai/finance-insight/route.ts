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
    select: { isPro: true, currency: true },
  });

  const currencyCode = userRecord?.currency ?? "GHS";
  const currencyLabel = currencyCode === "GHS" ? "GHS (Ghana Cedis)"
    : currencyCode === "NGN" ? "NGN (Nigerian Naira)"
    : currencyCode === "USD" ? "USD (US Dollars)"
    : currencyCode === "GBP" ? "GBP (British Pounds)"
    : currencyCode === "EUR" ? "EUR (Euros)"
    : currencyCode === "KES" ? "KES (Kenyan Shilling)"
    : currencyCode;

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
    currency: currencyLabel,
  };

  const system = `You are a personal finance advisor. Analyze the user's spending vs budget and return EXACTLY 4 insights as a JSON array (no markdown fences):
[
  {"type":"warning|tip|success|info","title":"short title","body":"1-2 sentence insight"},
  ...
]
Types: "warning" = overspending risk, "tip" = actionable advice, "success" = positive trend, "info" = neutral info.
Always use the currency: ${currencyCode}. Be specific with real numbers (amounts, percentages, days left).
Give actionable, personalized advice based on the actual numbers. Be direct like a smart friend, not a corporate advisor.`;

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

  return NextResponse.json({ insights: getDefaultInsights(budgets, spending, totalIncome, currencyCode) });
}

function getDefaultInsights(
  budgets: { name: string; monthlyLimit: number }[],
  spending: Record<string, number>,
  totalIncome: number,
  currency = "GHS"
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
      body: `You have ${saved.toFixed(2)} ${currency} remaining from your income. Consider putting half of it into a savings vehicle with your bank.`,
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
      title: "Save consistently",
      body: "Log every expense to get accurate budget predictions and stay ahead of your spending.",
    });
  }

  if (insights.length < 4) {
    insights.push({
      type: "info",
      title: "Track consistently",
      body: "Log every expense — even small ones — to get accurate budget predictions and spending trends.",
    });
  }

  return insights.slice(0, 4);
}
