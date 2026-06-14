"use client";

import Link from "next/link";
import { useEffect, useState, useTransition } from "react";
import { AlertTriangle, ArrowRight, CheckCircle2, Loader2 } from "lucide-react";

import { dashboardCardClass } from "@/components/dashboard/dashboard-styles";
import type { DashboardData } from "@/lib/data/dashboard";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

type AutomationPulseProps = {
  data: DashboardData;
};

export function AutomationPulse({ data }: AutomationPulseProps) {
  const [pending, startTransition] = useTransition();
  const [signals, setSignals] = useState<string[]>([]);
  const [actions, setActions] = useState<
    Array<{ type: string; label: string; payload: Record<string, string> }>
  >([]);
  const [result, setResult] = useState<string | null>(null);

  const hasDeadlines = data.deadlines.length > 0;
  const lowScore = data.dailyScore.average < 60;
  const noFocus = data.focusItems.length === 0 || data.focusItems[0]?.id === "setup";
  const negativeCash = data.finance.net < 0;

  const fallbackRisks = [
    hasDeadlines ? "Deadlines are approaching in the next 14 days." : null,
    lowScore ? "Daily score is below 60. Rebuild your day plan now." : null,
    noFocus ? "No concrete focus list detected for today." : null,
    negativeCash ? "Spending is higher than income this month." : null,
  ].filter(Boolean) as string[];

  useEffect(() => {
    let cancelled = false;
    async function loadPulse() {
      try {
        const res = await fetch("/api/coach/pulse");
        const data = await res.json();
        if (cancelled) return;
        setSignals(Array.isArray(data.signals) ? data.signals.map((s: { message: string }) => s.message) : []);
        setActions(Array.isArray(data.actions) ? data.actions : []);
      } catch {
        // Keep fallback behavior if pulse request fails.
      }
    }
    loadPulse();
    return () => {
      cancelled = true;
    };
  }, []);

  function runAction(action: { type: string; payload: Record<string, string> }) {
    startTransition(async () => {
      try {
        const res = await fetch("/api/coach/execute", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ actionType: action.type, payload: action.payload }),
        });
        const data = await res.json();
        setResult(data.result ?? data.error ?? "Action completed.");
      } catch {
        setResult("Could not run automation action.");
      }
    });
  }

  const risks = signals.length > 0 ? signals : fallbackRisks;
  const healthy = risks.length === 0;

  return (
    <Card className={dashboardCardClass()}>
      <CardHeader>
        <div className="flex items-center justify-between gap-3">
          <CardTitle>Automation Pulse</CardTitle>
          <span className="text-xs text-muted-foreground">
            {healthy ? "System stable" : "Needs attention"}
          </span>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {healthy ? (
          <div className="flex items-start gap-2 rounded-lg border border-success/30 bg-success/5 px-3 py-2 text-sm text-success">
            <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0" />
            <span>Great momentum. Keep executing your top focus and protect deep work time.</span>
          </div>
        ) : (
          <ul className="space-y-2">
            {risks.map((risk) => (
              <li
                key={risk}
                className="flex items-start gap-2 rounded-lg border border-warning/25 bg-warning/5 px-3 py-2 text-sm"
              >
                <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-warning" />
                <span>{risk}</span>
              </li>
            ))}
          </ul>
        )}

        <div className="grid gap-2 sm:grid-cols-2">
          <Link
            href="/planner"
            className="flex items-center justify-between rounded-lg border border-border/60 px-3 py-2 text-sm transition-colors hover:border-accent/30 hover:bg-accent/5"
          >
            Open Planner
            <ArrowRight className="h-4 w-4 text-muted-foreground" />
          </Link>
          <Link
            href="/coach"
            className="flex items-center justify-between rounded-lg border border-border/60 px-3 py-2 text-sm transition-colors hover:border-accent/30 hover:bg-accent/5"
          >
            Open AI Coach
            <ArrowRight className="h-4 w-4 text-muted-foreground" />
          </Link>
        </div>
        {actions.length > 0 && (
          <div className="rounded-lg border border-border/60 p-3">
            <p className="mb-2 text-xs font-semibold text-muted-foreground">Auto-fix actions</p>
            <div className="flex flex-wrap gap-2">
              {actions.map((action, index) => (
                <Button
                  key={`${action.type}-${index}`}
                  size="sm"
                  variant="secondary"
                  disabled={pending}
                  onClick={() => runAction(action)}
                >
                  {pending ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : action.label}
                </Button>
              ))}
            </div>
            {result && <p className="mt-2 text-xs text-muted-foreground">{result}</p>}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
