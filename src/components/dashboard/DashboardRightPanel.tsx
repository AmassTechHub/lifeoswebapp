import Link from "next/link";
import {
  AlarmClock,
  CheckCircle2,
  Circle,
  DollarSign,
  Flame,
  Sparkles,
  Target,
  TrendingDown,
  TrendingUp,
} from "lucide-react";

import { prisma } from "@/lib/prisma";
import { startOfDay, endOfDay, startOfMonth } from "@/lib/date-utils";
import { formatMoney } from "@/lib/currency";
import { cn } from "@/lib/utils";

// ── Data loader ────────────────────────────────────────────────────────────
async function getRightPanelData(userId: string) {
  const now        = new Date();
  const todayStart = startOfDay(now);
  const todayEnd   = endOfDay(now);
  const monthStart = startOfMonth(now);
  const weekAhead  = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);

  const [habits, habitLogsToday, incomeAgg, expenseAgg, goals, deadlines, userPrefs] =
    await Promise.all([
      prisma.habit.findMany({ where: { userId }, orderBy: { createdAt: "asc" } }),

      prisma.habitLog.findMany({
        where: {
          habit: { userId },
          date: { gte: todayStart, lt: todayEnd },
          completed: true,
        },
        select: { habitId: true },
      }),

      prisma.income.aggregate({
        where: { userId, date: { gte: monthStart } },
        _sum: { amount: true },
      }),

      prisma.expense.aggregate({
        where: { userId, date: { gte: monthStart } },
        _sum: { amount: true },
      }),

      prisma.goal.findMany({
        where: { userId, completed: false },
        orderBy: [{ level: "asc" }, { createdAt: "desc" }],
        take: 4,
      }),

      prisma.deadline.findMany({
        where: {
          userId,
          completed: false,
          dueDate: { lte: weekAhead },
        },
        orderBy: { dueDate: "asc" },
        take: 5,
        include: { course: { select: { name: true } } },
      }),

      prisma.user.findUnique({
        where: { id: userId },
        select: { currency: true },
      }),
    ]);

  const doneIds = new Set(habitLogsToday.map((l) => l.habitId));
  const income  = incomeAgg._sum.amount ?? 0;
  const expense = expenseAgg._sum.amount ?? 0;

  return {
    habits:    habits.map((h) => ({ ...h, done: doneIds.has(h.id) })),
    habitsTotal: habits.length,
    habitsDone: doneIds.size,
    income,
    expense,
    net: income - expense,
    goals,
    deadlines,
    currency: userPrefs?.currency ?? "GHS",
  };
}

// ── Helpers ────────────────────────────────────────────────────────────────
function daysUntil(date: Date | string) {
  const due = new Date(date);
  const now = new Date();
  now.setHours(0, 0, 0, 0);
  due.setHours(0, 0, 0, 0);
  return Math.round((due.getTime() - now.getTime()) / 86_400_000);
}

// ── Sub-components ─────────────────────────────────────────────────────────
function SectionTitle({ children }: { children: React.ReactNode }) {
  return (
    <p className="mb-2 text-[10px] font-semibold uppercase tracking-[0.1em] text-muted-foreground/40">
      {children}
    </p>
  );
}

function EmptyHint({ href, label }: { href: string; label: string }) {
  return (
    <Link
      href={href}
      className="flex items-center gap-1.5 text-xs text-muted-foreground/50 hover:text-accent"
    >
      <Sparkles className="h-3 w-3" />
      {label}
    </Link>
  );
}

// ── Main component ─────────────────────────────────────────────────────────
export async function DashboardRightPanel({ userId }: { userId: string }) {
  const data = await getRightPanelData(userId);
  const habitPct =
    data.habitsTotal > 0 ? Math.round((data.habitsDone / data.habitsTotal) * 100) : 0;

  return (
    <aside className="space-y-5">

      {/* ── Habits ──────────────────────────────────────────────── */}
      <section>
        <Link href="/habits">
          <SectionTitle>Habits today</SectionTitle>
        </Link>
        {data.habits.length === 0 ? (
          <EmptyHint href="/habits" label="Set up your daily habits" />
        ) : (
          <div className="rounded-xl border border-border/50 bg-card/60 p-3 space-y-2">
            {/* Progress bar */}
            <div className="flex items-center justify-between text-xs">
              <span className="flex items-center gap-1.5 font-medium text-foreground">
                <Flame className="h-3.5 w-3.5 text-orange-400" />
                {data.habitsDone}/{data.habitsTotal} done
              </span>
              <span className="text-muted-foreground/60">{habitPct}%</span>
            </div>
            <div className="h-1.5 w-full rounded-full bg-muted/50">
              <div
                className="h-full rounded-full bg-orange-400 transition-all duration-500"
                style={{ width: `${habitPct}%` }}
              />
            </div>
            {/* Individual habits */}
            <div className="space-y-1 pt-0.5">
              {data.habits.map((h) => (
                <div key={h.id} className="flex items-center gap-2">
                  {h.done ? (
                    <CheckCircle2 className="h-3.5 w-3.5 shrink-0 text-emerald-400" />
                  ) : (
                    <Circle className="h-3.5 w-3.5 shrink-0 text-muted-foreground/30" />
                  )}
                  <span
                    className={cn(
                      "truncate text-xs",
                      h.done
                        ? "text-muted-foreground/50 line-through"
                        : "text-foreground/80"
                    )}
                  >
                    {h.name}
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}
      </section>

      {/* ── Finance snapshot ────────────────────────────────────── */}
      <section>
        <Link href="/finance">
          <SectionTitle>Finance · this month</SectionTitle>
        </Link>
        <div className="rounded-xl border border-border/50 bg-card/60 p-3 space-y-2">
          <div className="grid grid-cols-2 gap-2">
            <div className="rounded-lg bg-emerald-500/8 px-3 py-2">
              <p className="text-[10px] font-medium text-emerald-400/70">Income</p>
              <p className="text-sm font-bold text-emerald-400">
                {formatMoney(data.income, data.currency, { decimals: 0 })}
              </p>
            </div>
            <div className="rounded-lg bg-rose-500/8 px-3 py-2">
              <p className="text-[10px] font-medium text-rose-400/70">Spent</p>
              <p className="text-sm font-bold text-rose-400">
                {formatMoney(data.expense, data.currency, { decimals: 0 })}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-1.5 px-1 pt-0.5">
            {data.net >= 0 ? (
              <TrendingUp className="h-3.5 w-3.5 shrink-0 text-emerald-400" />
            ) : (
              <TrendingDown className="h-3.5 w-3.5 shrink-0 text-rose-400" />
            )}
            <span
              className={cn(
                "text-xs font-semibold",
                data.net >= 0 ? "text-emerald-400" : "text-rose-400"
              )}
            >
              {data.net >= 0 ? "+" : "-"}{formatMoney(Math.abs(data.net), data.currency, { decimals: 0 })} net
            </span>
            <Link
              href="/finance"
              className="ml-auto text-[10px] text-muted-foreground/40 hover:text-accent"
            >
              Details →
            </Link>
          </div>
        </div>
      </section>

      {/* ── Active goals ────────────────────────────────────────── */}
      <section>
        <Link href="/goals">
          <SectionTitle>Active goals</SectionTitle>
        </Link>
        {data.goals.length === 0 ? (
          <EmptyHint href="/goals" label="Add your first goal" />
        ) : (
          <div className="space-y-1.5">
            {data.goals.map((g) => (
              <Link
                key={g.id}
                href="/goals"
                className="flex items-start gap-2 rounded-lg border border-border/40 bg-card/50 px-3 py-2 transition-colors hover:border-accent/20 hover:bg-accent/5"
              >
                <Target className="mt-0.5 h-3.5 w-3.5 shrink-0 text-pink-400" />
                <div className="min-w-0 flex-1">
                  <p className="truncate text-xs font-medium text-foreground">{g.title}</p>
                  <p className="text-[10px] text-muted-foreground/50 capitalize">
                    {g.level.toLowerCase()}
                  </p>
                </div>
              </Link>
            ))}
          </div>
        )}
      </section>

      {/* ── Upcoming deadlines ──────────────────────────────────── */}
      <section>
        <Link href="/deadlines">
          <SectionTitle>Deadlines · next 7 days</SectionTitle>
        </Link>
        {data.deadlines.length === 0 ? (
          <div className="flex items-center gap-1.5 text-xs text-muted-foreground/50">
            <Sparkles className="h-3 w-3 text-emerald-400" />
            Clear this week 🎉
          </div>
        ) : (
          <div className="space-y-1.5">
            {data.deadlines.map((d) => {
              const days   = daysUntil(d.dueDate);
              const urgent = days <= 1;
              const soon   = days <= 3;
              return (
                <Link
                  key={d.id}
                  href="/deadlines"
                  className="flex items-center gap-2.5 rounded-lg border border-border/40 bg-card/50 px-3 py-2 transition-colors hover:border-accent/20 hover:bg-accent/5"
                >
                  <AlarmClock
                    className={cn(
                      "h-3.5 w-3.5 shrink-0",
                      urgent ? "text-rose-400" : soon ? "text-amber-400" : "text-muted-foreground/40"
                    )}
                  />
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-xs font-medium text-foreground">{d.title}</p>
                    {d.course && (
                      <p className="text-[10px] text-muted-foreground/50">{d.course.name}</p>
                    )}
                  </div>
                  <span
                    className={cn(
                      "shrink-0 rounded-md px-1.5 py-0.5 text-[10px] font-semibold tabular-nums",
                      urgent
                        ? "bg-rose-500/10 text-rose-400"
                        : soon
                          ? "bg-amber-500/10 text-amber-400"
                          : "bg-muted/60 text-muted-foreground/60"
                    )}
                  >
                    {days === 0 ? "today" : days === 1 ? "tmrw" : `${days}d`}
                  </span>
                </Link>
              );
            })}
          </div>
        )}
      </section>

    </aside>
  );
}
