"use client";

import { useEffect, useRef, useState } from "react";
import { Bell, BellOff, RefreshCw, X } from "lucide-react";

import { cn } from "@/lib/utils";
import type { NudgeType } from "@/app/api/coach/nudge/route";

const BORDER_BG: Record<NudgeType, string> = {
  task:     "border-warning/40 bg-warning/10 text-warning",
  habit:    "border-accent/40 bg-accent/10 text-accent",
  study:    "border-blue-500/40 bg-blue-500/10 text-blue-400",
  deadline: "border-danger/40 bg-danger/10 text-danger",
  event:    "border-purple-500/40 bg-purple-500/10 text-purple-400",
  rest:     "border-success/40 bg-success/10 text-success",
  ok:       "border-border/60 bg-muted/40 text-muted-foreground",
};

const SHOULD_PULSE: Record<NudgeType, boolean> = {
  task: true, habit: true, deadline: true, event: true,
  study: false, rest: false, ok: false,
};

export function ProductivityNudge() {
  const [nudge, setNudge] = useState<string | null>(null);
  const [type, setType] = useState<NudgeType>("ok");
  const [open, setOpen] = useState(false);
  const [dismissed, setDismissed] = useState(false);
  const [loading, setLoading] = useState(false);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  async function fetchNudge() {
    setLoading(true);
    try {
      const res = await fetch("/api/coach/nudge");
      if (res.ok) {
        const data = await res.json() as { nudge: string; type: NudgeType };
        setNudge(data.nudge);
        setType(data.type);
        setDismissed(false);
      }
    } catch {
      // silent
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    fetchNudge();
    intervalRef.current = setInterval(fetchNudge, 20 * 60 * 1000);
    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, []);

  if (dismissed || !nudge) return null;

  const pulse = SHOULD_PULSE[type];
  const colors = BORDER_BG[type];

  return (
    <div className="fixed bottom-32 right-6 z-40 flex flex-col items-end gap-2 lg:bottom-34 lg:right-8">
      {open && (
        <div className={cn(
          "mb-1 w-72 rounded-2xl border p-4 shadow-xl backdrop-blur-sm animate-in slide-in-from-bottom-2 fade-in duration-200",
          colors,
        )}>
          <div className="flex items-start gap-2">
            <p className="flex-1 text-sm leading-relaxed">{nudge}</p>
            <button
              onClick={() => setOpen(false)}
              className="mt-0.5 shrink-0 opacity-50 transition-opacity hover:opacity-100"
            >
              <X className="h-3.5 w-3.5" />
            </button>
          </div>
          <div className="mt-3 flex items-center gap-2">
            <button
              onClick={fetchNudge}
              disabled={loading}
              className="flex items-center gap-1.5 rounded-lg border border-current/30 px-2.5 py-1 text-[11px] font-medium opacity-70 transition-opacity hover:opacity-100"
            >
              <RefreshCw className={cn("h-3 w-3", loading && "animate-spin")} />
              Refresh
            </button>
            <button
              onClick={() => { setDismissed(true); setOpen(false); }}
              className="ml-auto flex items-center gap-1.5 rounded-lg border border-current/30 px-2.5 py-1 text-[11px] font-medium opacity-70 transition-opacity hover:opacity-100"
            >
              <BellOff className="h-3 w-3" />
              Dismiss
            </button>
          </div>
        </div>
      )}

      <button
        onClick={() => setOpen((v) => !v)}
        aria-label="Productivity nudge"
        className={cn(
          "flex h-9 w-9 items-center justify-center rounded-full border shadow-lg transition-all hover:scale-105",
          colors,
          pulse && !open && "animate-pulse",
        )}
      >
        <Bell className="h-4 w-4" />
      </button>
    </div>
  );
}
