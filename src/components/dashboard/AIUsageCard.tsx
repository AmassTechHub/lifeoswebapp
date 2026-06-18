"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Bot, Sparkles, TrendingUp, Zap } from "lucide-react";

import { cn } from "@/lib/utils";

type UsageStats = {
  isPro: boolean;
  usedToday: number;
  limit: number | null;
  remaining: number | null;
  days: { date: string; count: number }[];
};

const AI_TOOLS = [
  { name: "Daily Brief", icon: Sparkles, href: "/dashboard", color: "#6366f1" },
  { name: "AI Coach", icon: Bot, href: "/coach", color: "#3b82f6" },
  { name: "Study Brain", icon: TrendingUp, href: "/learning", color: "#8b5cf6" },
  { name: "Finance Insights", icon: Zap, href: "/finance", color: "#f59e0b" },
];

function MiniBar({ value, max }: { value: number; max: number }) {
  const pct = max === 0 ? 0 : Math.min((value / max) * 100, 100);
  return (
    <div className="flex h-8 flex-1 items-end">
      <div
        className="w-full rounded-sm bg-accent/30 transition-all"
        style={{ height: `${Math.max(pct, 8)}%` }}
      />
    </div>
  );
}

export function AIUsageCard() {
  const [stats, setStats] = useState<UsageStats | null>(null);

  useEffect(() => {
    fetch("/api/ai/usage")
      .then((r) => r.json())
      .then((d: UsageStats) => setStats(d))
      .catch(() => null);
  }, []);

  const maxDay = stats ? Math.max(...stats.days.map((d) => d.count), 1) : 1;
  const pctUsed = stats?.limit ? Math.round((stats.usedToday / stats.limit) * 100) : 0;

  const resetLabel = (() => {
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    return `Resets ${tomorrow.toLocaleDateString("en-US", { month: "short", day: "numeric" })}`;
  })();

  return (
    <div className="overflow-hidden rounded-2xl border border-border/70 bg-card shadow-sm">
      {/* Header */}
      <div className="border-b border-border/50 px-5 py-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-accent/15">
              <Bot className="h-3.5 w-3.5 text-accent" />
            </div>
            <span className="text-sm font-semibold text-foreground">AI Usage</span>
          </div>
          {stats?.isPro ? (
            <span className="rounded-full bg-accent/15 px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-wider text-accent">
              Pro
            </span>
          ) : (
            <span className="rounded-full bg-muted/60 px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
              Free
            </span>
          )}
        </div>
      </div>

      {/* Metric tiles — Claude console style */}
      <div className="grid grid-cols-2 divide-x divide-border/50 border-b border-border/50">
        {/* Messages today */}
        <div className="px-5 py-4">
          <p className="text-[10px] font-semibold uppercase tracking-widest text-muted-foreground/70">
            Messages today
          </p>
          <p className="mt-1.5 text-2xl font-bold tabular-nums text-foreground">
            {stats ? stats.usedToday : "—"}
            {stats && !stats.isPro && (
              <span className="ml-1 text-sm font-normal text-muted-foreground">
                / {stats.limit}
              </span>
            )}
          </p>
          <p className="mt-0.5 text-[11px] text-muted-foreground">{resetLabel}</p>
        </div>

        {/* Remaining / tier */}
        <div className="px-5 py-4">
          <p className="text-[10px] font-semibold uppercase tracking-widest text-muted-foreground/70">
            {stats?.isPro ? "Tier" : "Remaining"}
          </p>
          <p className="mt-1.5 text-2xl font-bold tabular-nums text-foreground">
            {stats?.isPro ? "∞" : (stats ? stats.remaining : "—")}
          </p>
          <p className="mt-0.5 text-[11px] text-muted-foreground">
            {stats?.isPro ? "Unlimited · Sonnet 4.6" : "Free · Haiku 4.5"}
          </p>
        </div>
      </div>

      {/* Usage bar (free users) */}
      {!stats?.isPro && stats && (
        <div className="border-b border-border/50 px-5 py-3">
          <div className="flex items-center justify-between text-[10px] text-muted-foreground mb-1.5">
            <span>Daily quota</span>
            <span>{pctUsed}% used</span>
          </div>
          <div className="h-1.5 w-full overflow-hidden rounded-full bg-muted/50">
            <div
              className={cn(
                "h-full rounded-full transition-all",
                pctUsed >= 90 ? "bg-danger" : pctUsed >= 70 ? "bg-warning" : "bg-accent"
              )}
              style={{ width: `${pctUsed}%` }}
            />
          </div>
        </div>
      )}

      {/* 7-day activity chart — like Claude's Token Volume */}
      <div className="border-b border-border/50 px-5 py-4">
        <p className="mb-3 text-[10px] font-semibold uppercase tracking-widest text-muted-foreground/70">
          7-day activity
        </p>
        {stats && stats.days.every((d) => d.count === 0) ? (
          <p className="text-xs text-muted-foreground/50">No activity yet</p>
        ) : (
          <div className="flex h-10 items-end gap-1">
            {(stats?.days ?? Array(7).fill({ count: 0 })).map((day, i) => (
              <MiniBar key={i} value={day.count} max={maxDay} />
            ))}
          </div>
        )}
      </div>

      {/* AI tools — like Claude's Models section */}
      <div className="px-5 py-4">
        <p className="mb-3 text-[10px] font-semibold uppercase tracking-widest text-muted-foreground/70">
          AI tools
        </p>
        <div className="grid grid-cols-2 gap-2">
          {AI_TOOLS.map(({ name, icon: Icon, href, color }) => (
            <Link
              key={name}
              href={href}
              className="flex items-center gap-2 rounded-lg border border-border/50 bg-background/50 px-3 py-2 text-xs font-medium text-muted-foreground transition-colors hover:border-border hover:bg-muted/30 hover:text-foreground"
            >
              <Icon className="h-3.5 w-3.5 shrink-0" style={{ color }} />
              {name}
            </Link>
          ))}
        </div>

        {!stats?.isPro && (
          <div className="mt-3 flex items-center justify-between rounded-xl border border-accent/20 bg-accent/5 px-3 py-2.5">
            <div>
              <p className="text-xs font-semibold text-foreground">Upgrade to Pro</p>
              <p className="text-[10px] text-muted-foreground">Unlimited · Sonnet 4.6 · Priority</p>
            </div>
            <Link
              href="/billing"
              className="rounded-lg bg-accent/15 px-3 py-1.5 text-[11px] font-semibold text-accent hover:bg-accent/25 transition-colors"
            >
              Upgrade
            </Link>
          </div>
        )}
      </div>
    </div>
  );
}
