"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Cpu, Loader2, Moon, Sun, Zap } from "lucide-react";

import { dashboardCardClass } from "@/components/dashboard/dashboard-styles";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

type LifeEngineMode = "morning" | "evening" | "weekly" | "full";

type LifeEnginePanelProps = {
  initialMessage?: string | null;
  autoRan?: boolean;
  pulseStatus?: "ok" | "warning" | "critical";
  compact?: boolean;
};

const statusStyles = {
  ok: "border-success/30 bg-success/5 text-success",
  warning: "border-warning/30 bg-warning/10 text-warning",
  critical: "border-danger/40 bg-danger/10 text-danger",
};

export function LifeEnginePanel({
  initialMessage,
  autoRan = false,
  pulseStatus = "ok",
  compact = false,
}: LifeEnginePanelProps) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [message, setMessage] = useState(initialMessage ?? "Life OS is ready.");
  const [score, setScore] = useState<number | null>(null);
  const [status, setStatus] = useState(pulseStatus);
  const [cycles, setCycles] = useState<string[]>([]);

  function runEngine(mode: LifeEngineMode) {
    startTransition(async () => {
      try {
        const res = await fetch("/api/engine/run", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ mode }),
        });
        const data = await res.json();
        if (!res.ok) {
          setMessage(data.error ?? "Engine run failed");
          return;
        }
        setMessage(data.message);
        setScore(data.dailyScore);
        setStatus(data.pulseStatus ?? "ok");
        setCycles(data.cycles ?? []);
        if (mode !== "full") return;
        toast.success("Full cycle complete");
        router.refresh();
      } catch {
        setMessage("Could not run Life OS engine.");
      }
    });
  }

  if (compact) {
    return (
      <div className="mb-5 flex flex-wrap items-center gap-3 rounded-xl border border-border/50 bg-card/60 px-4 py-2.5">
        <Cpu className="h-3.5 w-3.5 shrink-0 text-accent" />
        <span
          className={cn(
            "h-1.5 w-1.5 shrink-0 rounded-full",
            status === "ok" ? "bg-success" : status === "warning" ? "bg-warning" : "bg-danger"
          )}
        />
        <p className="flex-1 truncate text-[12px] text-muted-foreground">
          {message}
          {autoRan && !message?.includes("morning") && (
            <span className="ml-1 text-accent">Morning cycle ran.</span>
          )}
        </p>
        <div className="flex shrink-0 gap-1.5">
          <button
            onClick={() => runEngine("morning")}
            disabled={pending}
            className="flex items-center gap-1 rounded-md bg-muted px-2.5 py-1 text-[11px] font-medium text-muted-foreground transition-colors hover:bg-muted/80 hover:text-foreground disabled:opacity-40"
          >
            <Sun className="h-3 w-3" />
            Morning
          </button>
          <button
            onClick={() => runEngine("evening")}
            disabled={pending}
            className="flex items-center gap-1 rounded-md bg-muted px-2.5 py-1 text-[11px] font-medium text-muted-foreground transition-colors hover:bg-muted/80 hover:text-foreground disabled:opacity-40"
          >
            <Moon className="h-3 w-3" />
            Evening
          </button>
          <button
            onClick={() => runEngine("full")}
            disabled={pending}
            className="flex items-center gap-1 rounded-md bg-accent/10 px-2.5 py-1 text-[11px] font-medium text-accent transition-colors hover:bg-accent/20 disabled:opacity-40"
          >
            {pending ? <Loader2 className="h-3 w-3 animate-spin" /> : <Zap className="h-3 w-3" />}
            Run
          </button>
        </div>
      </div>
    );
  }

  return (
    <div
      className={cn(
        dashboardCardClass(true),
        "mb-8 bg-linear-to-r from-primary/20 via-card/90 to-accent/10 p-5 sm:p-6"
      )}
    >
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div className="flex items-start gap-3">
          <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-accent/15 text-accent">
            <Cpu className="h-5 w-5" />
          </div>
          <div>
            <p className="text-sm font-semibold tracking-tight">Life OS Engine</p>
            {autoRan && (
              <p className="mt-1 text-xs text-accent">Auto-started your morning cycle today.</p>
            )}
          </div>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button
            onClick={() => runEngine("morning")}
            disabled={pending}
            variant="secondary"
            size="sm"
            className="gap-1"
          >
            <Sun className="h-3.5 w-3.5" />
            Morning
          </Button>
          <Button
            onClick={() => runEngine("evening")}
            disabled={pending}
            variant="secondary"
            size="sm"
            className="gap-1"
          >
            <Moon className="h-3.5 w-3.5" />
            Evening
          </Button>
          <Button onClick={() => runEngine("full")} disabled={pending} className="gap-1">
            {pending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Zap className="h-4 w-4" />}
            Full cycle
          </Button>
        </div>
      </div>

      <div className={cn("mt-4 rounded-xl border px-4 py-3 text-sm", statusStyles[status])}>
        <p>{message}</p>
        {score !== null && (
          <p className="mt-1 text-xs opacity-90">Daily score after run: {score}</p>
        )}
        {cycles.length > 0 && (
          <ul className="mt-2 space-y-1 text-xs opacity-90">
            {cycles.map((c, i) => (
              <li key={i}>{c}</li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}
