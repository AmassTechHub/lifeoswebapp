import { NextResponse } from "next/server";
import { headers } from "next/headers";

import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { callClaude } from "@/lib/ai/claude";

export async function GET() {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const userId = session.user.id;
  const now = new Date();
  const thisMonthStart = new Date(now.getFullYear(), now.getMonth(), 1);
  const prevMonthStart = new Date(now.getFullYear(), now.getMonth() - 1, 1);
  const prevMonthEnd = new Date(now.getFullYear(), now.getMonth(), 0, 23, 59, 59);

  const [thisExpenses, prevExpenses, thisIncomes, budgets, savingsGoals] = await Promise.all([
    prisma.expense.findMany({
      where: { userId, date: { gte: thisMonthStart } },
      select: { amount: true, category: true, date: true },
    }),
    prisma.expense.findMany({
      where: { userId, date: { gte: prevMonthStart, lte: prevMonthEnd } },
      select: { amount: true, category: true },
    }),
    prisma.income.findMany({
      where: { userId, date: { gte: thisMonthStart } },
      select: { amount: true, source: true },
    }),
    prisma.budgetCategory.findMany({
      where: { userId, month: now.getMonth() + 1, year: now.getFullYear() },
      select: { name: true, monthlyLimit: true },
    }),
    prisma.savingsGoal.findMany({
      where: { userId, completed: false },
      select: { name: true, targetAmount: true, currentAmount: true },
      take: 3,
    }),
  ]);

  // Build category summaries
  const thisByCategory: Record<string, number> = {};
  for (const e of thisExpenses) {
    thisByCategory[e.category] = (thisByCategory[e.category] ?? 0) + e.amount;
  }
  const prevByCategory: Record<string, number> = {};
  for (const e of prevExpenses) {
    prevByCategory[e.category] = (prevByCategory[e.category] ?? 0) + e.amount;
  }

  const totalThisMonth = thisExpenses.reduce((s, e) => s + e.amount, 0);
  const totalPrevMonth = prevExpenses.reduce((s, e) => s + e.amount, 0);
  const totalIncome = thisIncomes.reduce((s, e) => s + e.amount, 0);

  const dayOfMonth = now.getDate();
  const daysInMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0).getDate();
  const projected = dayOfMonth > 0 ? (totalThisMonth / dayOfMonth) * daysInMonth : 0;

  const categoryRows = Object.entries(thisByCategory)
    .sort((a, b) => b[1] - a[1])
    .map(([cat, amt]) => {
      const prev = prevByCategory[cat] ?? 0;
      const change = prev > 0 ? Math.round(((amt - prev) / prev) * 100) : null;
      const budget = budgets.find((b) => b.name === cat);
      return {
        category: cat,
        spent: Math.round(amt * 100) / 100,
        lastMonth: Math.round(prev * 100) / 100,
        changePercent: change,
        budgetLimit: budget?.monthlyLimit ?? null,
        budgetUsedPct: budget ? Math.round((amt / budget.monthlyLimit) * 100) : null,
      };
    });

  const financialData = {
    period: now.toLocaleDateString("en-US", { month: "long", year: "numeric" }),
    dayOfMonth,
    daysInMonth,
    totalIncome: Math.round(totalIncome * 100) / 100,
    totalExpenses: Math.round(totalThisMonth * 100) / 100,
    net: Math.round((totalIncome - totalThisMonth) * 100) / 100,
    projectedMonthEnd: Math.round(projected * 100) / 100,
    prevMonthTotal: Math.round(totalPrevMonth * 100) / 100,
    spendingVsLastMonth:
      totalPrevMonth > 0
        ? Math.round(((totalThisMonth - totalPrevMonth) / totalPrevMonth) * 100)
        : null,
    categoryBreakdown: categoryRows,
    savingsGoals: savingsGoals.map((g) => ({
      name: g.name,
      target: g.targetAmount,
      saved: g.currentAmount,
      progressPct: g.targetAmount > 0 ? Math.round((g.currentAmount / g.targetAmount) * 100) : 0,
    })),
  };

  const userRecord = await prisma.user.findUnique({
    where: { id: userId },
    select: { openAiKey: true, isPro: true, currency: true },
  });

  const currencyCode = userRecord?.currency ?? "GHS";

  const apiKey = (userRecord?.openAiKey?.trim() || process.env.ANTHROPIC_API_KEY?.trim()) ?? "";
  if (!apiKey) {
    return NextResponse.json(
      { error: "AI not configured. Add your Claude API key in Settings → AI Coach." },
      { status: 503 },
    );
  }

  const system = `You are a sharp personal finance coach analyzing a user's spending data for ${financialData.period}.
Generate a concise, human-readable financial analysis. Be specific with real numbers. Use ${currencyCode} for all amounts.

Use this exact structure (use **bold** for each section header):

**This Month So Far**
2-3 sentences on income, spending, and net balance.

**Biggest Changes**
What increased or decreased vs last month. Be specific with actual amounts and percentages.

**Budget Alerts**
Only include if categories are ≥80% of budget or over limit. If no budgets set or all fine, write "All categories within budget."

**Smart Tip**
One concrete, personalized recommendation based on the actual numbers. Make it actionable and specific.

Rules:
- Total response under 220 words
- Never use vague language like "consider reviewing" — be direct
- If totalIncome is 0, note that no income was logged this month
- Write like a friend who's good with money, not a robot`;

  try {
    const raw = await callClaude({
      apiKey,
      system,
      messages: [
        {
          role: "user",
          content: `Analyse my finances:\n${JSON.stringify(financialData, null, 2)}`,
        },
      ],
      maxTokens: 600,
      isPro: userRecord?.isPro ?? false,
    });

    return NextResponse.json({ insights: raw, data: financialData });
  } catch {
    return NextResponse.json({ error: "AI request failed. Try again." }, { status: 500 });
  }
}
