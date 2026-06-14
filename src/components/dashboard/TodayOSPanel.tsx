"use client";

import { useState, useTransition } from "react";
import Link from "next/link";
import { Calendar, CheckCircle2, Focus, Loader2, Sparkles } from "lucide-react";

import { dashboardCardClass } from "@/components/dashboard/dashboard-styles";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

type FocusItem = { id: string; title: string; category?: string };
type ScheduleBlock = { id: string; title: string; startAt: string; endAt: string };

type NextAction = {
  title: string;
  action: { type: string; payload: Record<string, string> };
};

type TodayOSPanelProps = {
  focusItems: FocusItem[];
  schedule: ScheduleBlock[];
  nextAction?: NextAction | null;
  dailyScore: number;
  cycles?: { morning?: string; evening?: string; weekly?: string };
};

export function TodayOSPanel({
  focusItems,
  schedule,
  nextAction,
  dailyScore,
  cycles = {},
}: TodayOSPanelProps) {
  const [pending, startTransition] = useTransition();
  const [actionMsg, setActionMsg] = useState<string | null>(null);

  function confirmNextAction() {
    if (!nextAction?.action) return;
    startTransition(async () => {
      const res = await fetch("/api/coach/execute", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          actionType: nextAction.action.type,
          payload: nextAction.action.payload,
        }),
      });
      const data = await res.json();
      setActionMsg(data.result ?? data.error ?? "Done");
    });
  }

  return (
    <section className={cn(dashboardCardClass(true), "mb-8 p-5 sm:p-6")}>
      <div className="mb-4 flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <p className="text-xs font-semibold uppercase tracking-wider text-accent">
            Today OS
          </p>
          <h2 className="text-lg font-semibold tracking-tight">
            Your day in one place
          </h2>
        </div>
        <div className="flex items-center gap-2 text-sm">
          <span className="rounded-full bg-primary/15 px-3 py-1 font-medium">
            Score {dailyScore}
          </span>
          <Link href="/focus" className="text-accent hover:underline">
            Open focus →
          </Link>
        </div>
      </div>

      {(cycles.morning || cycles.evening || cycles.weekly) && (
        <div className="mb-4 grid gap-2 text-xs text-muted-foreground sm:grid-cols-3">
          {cycles.morning && <p>☀️ {cycles.morning}</p>}
          {cycles.evening && <p>🌙 {cycles.evening}</p>}
          {cycles.weekly && <p>📅 {cycles.weekly}</p>}
        </div>
      )}

      {nextAction && (
        <div className="mb-4 flex flex-col gap-2 rounded-xl border border-accent/30 bg-accent/5 p-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-start gap-2">
            <Sparkles className="mt-0.5 h-4 w-4 shrink-0 text-accent" />
            <div>
              <p className="text-xs font-medium text-accent">Next best action</p>
              <p className="text-sm font-medium">{nextAction.title}</p>
            </div>
          </div>
          <Button size="sm" onClick={confirmNextAction} disabled={pending}>
            {pending ? <Loader2 className="h-4 w-4 animate-spin" /> : "Do it"}
          </Button>
        </div>
      )}
      {actionMsg && <p className="mb-4 text-xs text-muted-foreground">{actionMsg}</p>}

      <div className="grid gap-4 md:grid-cols-2">
        <div>
          <p className="mb-2 flex items-center gap-1 text-xs font-semibold uppercase text-muted-foreground">
            <Focus className="h-3.5 w-3.5" />
            Focus ({focusItems.length})
          </p>
          <ul className="space-y-2">
            {focusItems.length === 0 && (
              <li className="text-sm text-muted-foreground">Run Life OS engine to plan focus.</li>
            )}
            {focusItems.slice(0, 5).map((item) => (
              <li
                key={item.id}
                className="flex items-center gap-2 rounded-lg border border-border/50 px-3 py-2 text-sm"
              >
                <CheckCircle2 className="h-4 w-4 shrink-0 text-muted-foreground" />
                {item.title}
              </li>
            ))}
          </ul>
        </div>
        <div>
          <p className="mb-2 flex items-center gap-1 text-xs font-semibold uppercase text-muted-foreground">
            <Calendar className="h-3.5 w-3.5" />
            Schedule ({schedule.length})
          </p>
          <ul className="space-y-2">
            {schedule.length === 0 && (
              <li className="text-sm text-muted-foreground">No blocks today yet.</li>
            )}
            {schedule.slice(0, 5).map((block) => (
              <li
                key={block.id}
                className="rounded-lg border border-border/50 px-3 py-2 text-sm"
              >
                <span className="font-medium">{block.title}</span>
                <span className="mt-0.5 block text-xs text-muted-foreground">
                  {new Date(block.startAt).toLocaleTimeString([], {
                    hour: "2-digit",
                    minute: "2-digit",
                  })}
                  {" – "}
                  {new Date(block.endAt).toLocaleTimeString([], {
                    hour: "2-digit",
                    minute: "2-digit",
                  })}
                </span>
              </li>
            ))}
          </ul>
        </div>
      </div>
    </section>
  );
}
