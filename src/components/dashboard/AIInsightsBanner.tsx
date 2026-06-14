"use client";

import Link from "next/link";
import { useEffect, useState, useTransition } from "react";
import { Bot, Loader2, Sparkles } from "lucide-react";

import { dashboardCardClass } from "@/components/dashboard/dashboard-styles";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

type AIInsightsBannerProps = {
  contextSummary: string;
};

type SuggestedAction = {
  type:
    | "create_task"
    | "complete_task"
    | "schedule_block"
    | "run_daily_setup"
    | "rescue_overdue";
  label: string;
  payload: Record<string, string>;
};

type QueuedAction = {
  id: string;
  title: string;
  reason: string;
  action: {
    type: SuggestedAction["type"];
    payload: Record<string, string>;
  };
};

type EveningReminder = {
  level: "none" | "soft" | "medium" | "urgent";
  message: string;
};

async function askCoach(message: string) {
  const res = await fetch("/api/coach/chat", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ message, history: [] }),
  });
  return res.json();
}

const reminderStyles: Record<EveningReminder["level"], string> = {
  none: "",
  soft: "border-border/70 bg-muted/30 text-muted-foreground",
  medium: "border-warning/30 bg-warning/10 text-warning",
  urgent: "border-danger/40 bg-danger/10 text-danger",
};

export function AIInsightsBanner({ contextSummary }: AIInsightsBannerProps) {
  const [pending, startTransition] = useTransition();
  const [quickQuestion, setQuickQuestion] = useState("What should I focus on this week?");
  const [actions, setActions] = useState<SuggestedAction[]>([]);
  const [actionQueue, setActionQueue] = useState<QueuedAction[]>([]);
  const [actionResult, setActionResult] = useState<string | null>(null);
  const [eveningReminder, setEveningReminder] = useState<EveningReminder>({
    level: "none",
    message: "",
  });
  const [confirmActionId, setConfirmActionId] = useState<string | null>(null);
  const [morningDone, setMorningDone] = useState(false);
  const [eveningDone, setEveningDone] = useState(false);
  const [morningStreak, setMorningStreak] = useState(0);
  const [eveningStreak, setEveningStreak] = useState(0);
  const [nextAction, setNextAction] = useState<QueuedAction | null>(null);
  const [response, setResponse] = useState<string>(
    "Loading your AI daily brief from live data..."
  );

  useEffect(() => {
    let cancelled = false;
    async function loadDashboardAI() {
      try {
        const [briefStatusRes, briefRes, routinesRes, nextActionRes] = await Promise.all([
          fetch("/api/coach/brief/status"),
          fetch("/api/coach/brief"),
          fetch("/api/coach/routines"),
          fetch("/api/coach/next-action"),
        ]);
        const briefStatus = await briefStatusRes.json();
        const brief = await briefRes.json();
        const routines = await routinesRes.json();
        const nextActionData = await nextActionRes.json();
        if (cancelled) return;

        setResponse(brief.brief ?? "No brief available yet.");
        setActions(Array.isArray(brief.actions) ? brief.actions : []);
        setMorningDone(Boolean(routines.morningDone));
        setEveningDone(Boolean(routines.eveningDone));
        setMorningStreak(Number(routines.morningStreak ?? 0));
        setEveningStreak(Number(routines.eveningStreak ?? 0));
        setEveningReminder(routines.eveningReminder ?? { level: "none", message: "" });
        setNextAction(nextActionData.nextAction ?? null);
        setActionQueue(Array.isArray(nextActionData.queue) ? nextActionData.queue : []);

        if (!briefStatus.delivered) {
          await fetch("/api/coach/brief/status", { method: "POST" });
        }
      } catch {
        if (!cancelled) {
          setResponse("Could not load daily brief. You can still ask AI below.");
        }
      }
    }
    loadDashboardAI();
    return () => {
      cancelled = true;
    };
  }, []);

  function runDailyBrief() {
    startTransition(async () => {
      try {
        const res = await fetch("/api/coach/brief");
        const data = await res.json();
        setResponse(data.brief ?? "AI did not return a brief. Try again.");
        setActions(Array.isArray(data.actions) ? data.actions : []);
        await fetch("/api/coach/brief/status", { method: "POST" });
      } catch {
        setResponse("AI did not return a brief. Try again.");
      }
    });
  }

  function runQuickQuestion() {
    startTransition(async () => {
      const prompt = [
        "You are my Life OS coach.",
        "Use this dashboard context first:",
        contextSummary,
        `User question: ${quickQuestion}`,
      ].join("\n");

      const data = await askCoach(prompt);
      setResponse(data.reply ?? data.error ?? "AI did not return a response. Try again.");
    });
  }

  function runWeeklyReview() {
    startTransition(async () => {
      try {
        const res = await fetch("/api/coach/weekly-review");
        const data = await res.json();
        setResponse(data.review ?? "Weekly review is not available yet.");
      } catch {
        setResponse("Weekly review failed. Try again.");
      }
    });
  }

  function runAdaptivePlan() {
    startTransition(async () => {
      try {
        const res = await fetch("/api/coach/adaptive-plan");
        const data = await res.json();
        setResponse(data.recommendations ?? "Adaptive recommendations are not available yet.");
      } catch {
        setResponse("Adaptive recommendations failed. Try again.");
      }
    });
  }

  function markRoutine(type: "morning" | "evening") {
    startTransition(async () => {
      try {
        const res = await fetch("/api/coach/routines", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ type }),
        });
        const data = await res.json();
        setActionResult(data.result ?? "Routine updated.");
        if (type === "morning") setMorningDone(true);
        if (type === "evening") {
          setEveningDone(true);
          setEveningReminder({ level: "none", message: "" });
        }
        setMorningStreak(Number(data.morningStreak ?? morningStreak));
        setEveningStreak(Number(data.eveningStreak ?? eveningStreak));
      } catch {
        setActionResult("Could not update routine.");
      }
    });
  }

  function runAction(action: { type: SuggestedAction["type"]; payload: Record<string, string> }) {
    startTransition(async () => {
      try {
        const res = await fetch("/api/coach/execute", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            actionType: action.type,
            payload: action.payload,
          }),
        });
        const data = await res.json();
        setActionResult(data.result ?? data.error ?? "Action completed.");
        setConfirmActionId(null);
      } catch {
        setActionResult("Could not run action. Try again.");
      }
    });
  }

  function requestConfirm(item: QueuedAction) {
    setConfirmActionId(item.id);
  }

  function runQueuedAction(item: QueuedAction) {
    runAction(item.action);
    setActionQueue((queue) => queue.filter((entry) => entry.id !== item.id));
    if (nextAction?.id === item.id) {
      setNextAction(actionQueue.find((entry) => entry.id !== item.id) ?? null);
    }
  }

  return (
    <div
      className={`${dashboardCardClass(true)} mb-8 bg-linear-to-r from-accent/10 via-card/80 to-primary/35 p-5 sm:p-6`}
    >
      <div className="flex flex-col gap-5">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div className="flex items-start gap-3">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-accent/15 text-accent">
              <Bot className="h-5 w-5" />
            </div>
            <div>
              <p className="text-sm font-semibold">AI Coach is active on dashboard</p>
              <p className="mt-1 max-w-2xl text-sm leading-relaxed text-muted-foreground">
                Your brief, routines, and ranked action queue update from live Life OS data.
              </p>
            </div>
          </div>
          <Button
            size="sm"
            variant="outline"
            className="shrink-0 border-accent/30 text-accent hover:bg-accent/10"
            asChild
          >
            <Link href="/coach">Open full AI Coach</Link>
          </Button>
        </div>

        {eveningReminder.level !== "none" && (
          <div
            className={cn(
              "rounded-xl border px-4 py-3 text-sm",
              reminderStyles[eveningReminder.level]
            )}
          >
            {eveningReminder.message}
          </div>
        )}

        <div className="grid gap-3 lg:grid-cols-[1fr_auto_auto_auto_auto]">
          <input
            value={quickQuestion}
            onChange={(e) => setQuickQuestion(e.target.value)}
            className="rounded-xl border border-border/70 bg-background/70 px-4 py-2.5 text-sm outline-none transition focus:border-accent/40"
            placeholder="Ask AI about your priorities, study plan, finance, or deadlines"
          />
          <Button type="button" variant="secondary" onClick={runQuickQuestion} disabled={pending}>
            {pending ? <Loader2 className="h-4 w-4 animate-spin" /> : "Ask AI"}
          </Button>
          <Button type="button" onClick={runDailyBrief} disabled={pending} className="gap-2">
            {pending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Sparkles className="h-4 w-4" />}
            Generate brief
          </Button>
          <Button type="button" variant="outline" onClick={runWeeklyReview} disabled={pending}>
            Weekly review
          </Button>
          <Button type="button" variant="outline" onClick={runAdaptivePlan} disabled={pending}>
            Adaptive plan
          </Button>
        </div>

        <div className="rounded-xl border border-accent/15 bg-background/65 p-4">
          <p className="mb-2 text-[11px] font-semibold uppercase tracking-wide text-accent">
            AI output
          </p>
          <p className="whitespace-pre-wrap text-sm leading-relaxed text-foreground">{response}</p>
        </div>

        {actions.length > 0 && (
          <div className="rounded-xl border border-border/70 bg-background/65 p-4">
            <p className="mb-3 text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
              Suggested actions
            </p>
            <div className="flex flex-wrap gap-2">
              {actions.map((action, index) => (
                <Button
                  key={`${action.type}-${index}`}
                  type="button"
                  variant="secondary"
                  size="sm"
                  disabled={pending}
                  onClick={() => runAction(action)}
                >
                  {action.label}
                </Button>
              ))}
            </div>
          </div>
        )}

        {nextAction && (
          <div className="rounded-xl border border-border/70 bg-background/65 p-4">
            <p className="mb-2 text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
              Next best action
            </p>
            <p className="text-sm font-medium">{nextAction.title}</p>
            <p className="mt-1 text-xs text-muted-foreground">{nextAction.reason}</p>
            {confirmActionId === nextAction.id ? (
              <div className="mt-3 flex flex-wrap gap-2">
                <Button
                  type="button"
                  size="sm"
                  disabled={pending}
                  onClick={() => runQueuedAction(nextAction)}
                >
                  Confirm
                </Button>
                <Button
                  type="button"
                  size="sm"
                  variant="outline"
                  onClick={() => setConfirmActionId(null)}
                >
                  Cancel
                </Button>
              </div>
            ) : (
              <Button
                type="button"
                size="sm"
                className="mt-3"
                disabled={pending}
                onClick={() => requestConfirm(nextAction)}
              >
                Execute next action
              </Button>
            )}
          </div>
        )}

        {actionQueue.length > 1 && (
          <div className="rounded-xl border border-border/70 bg-background/65 p-4">
            <p className="mb-3 text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
              Action queue
            </p>
            <ul className="space-y-2">
              {actionQueue.slice(1).map((item) => (
                <li
                  key={item.id}
                  className="flex flex-wrap items-center justify-between gap-2 rounded-lg border border-border/60 px-3 py-2"
                >
                  <div>
                    <p className="text-sm font-medium">{item.title}</p>
                    <p className="text-xs text-muted-foreground">{item.reason}</p>
                  </div>
                  {confirmActionId === item.id ? (
                    <div className="flex gap-2">
                      <Button
                        type="button"
                        size="sm"
                        disabled={pending}
                        onClick={() => runQueuedAction(item)}
                      >
                        Confirm
                      </Button>
                      <Button
                        type="button"
                        size="sm"
                        variant="outline"
                        onClick={() => setConfirmActionId(null)}
                      >
                        Cancel
                      </Button>
                    </div>
                  ) : (
                    <Button
                      type="button"
                      size="sm"
                      variant="outline"
                      disabled={pending}
                      onClick={() => requestConfirm(item)}
                    >
                      Run
                    </Button>
                  )}
                </li>
              ))}
            </ul>
          </div>
        )}

        {actionResult && (
          <p className="text-xs text-muted-foreground">{actionResult}</p>
        )}

        <div className="rounded-xl border border-border/70 bg-background/65 p-4">
          <p className="mb-3 text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
            Daily routines
          </p>
          <div className="flex flex-wrap gap-2">
            <Button
              type="button"
              size="sm"
              variant={morningDone ? "secondary" : "outline"}
              disabled={pending || morningDone}
              onClick={() => markRoutine("morning")}
            >
              {morningDone ? "Morning complete" : "Mark morning done"}
            </Button>
            <Button
              type="button"
              size="sm"
              variant={eveningDone ? "secondary" : "outline"}
              disabled={pending || eveningDone}
              onClick={() => markRoutine("evening")}
            >
              {eveningDone ? "Evening complete" : "Mark evening done"}
            </Button>
          </div>
          <p className="mt-2 text-xs text-muted-foreground">
            Streaks: morning {morningStreak} day(s), evening {eveningStreak} day(s)
          </p>
        </div>
      </div>
    </div>
  );
}
