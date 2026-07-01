"use client";

import { useState } from "react";
import { toast } from "sonner";
import { BarChart2, ChevronDown, ChevronUp, Loader2, RefreshCw, Sparkles, X } from "lucide-react";
import { cn } from "@/lib/utils";

export function WeeklyStudyReport() {
  const [report, setReport] = useState<string | null>(null);
  const [stats, setStats] = useState<{ totalMins7: number; sessions: number; accuracy: number | null } | null>(null);
  const [loading, setLoading] = useState(false);
  const [expanded, setExpanded] = useState(true);
  const [dismissed, setDismissed] = useState(false);

  async function generate() {
    setLoading(true);
    try {
      const res = await fetch("/api/study/weekly-report", { method: "POST" });
      const data = await res.json();
      if (!res.ok) { toast.error(data.error ?? "Could not generate report"); return; }
      setReport(data.report);
      setStats(data.stats);
    } catch {
      toast.error("Report failed. Try again.");
    } finally {
      setLoading(false);
    }
  }

  if (dismissed) return null;

  return (
    <div className="rounded-2xl border border-accent/20 bg-accent/5 p-4">
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-start gap-3">
          <BarChart2 className="mt-0.5 h-5 w-5 shrink-0 text-accent" />
          <div>
            <p className="font-semibold text-foreground">Weekly Study Report</p>
            <p className="mt-0.5 text-xs text-muted-foreground">
              AI analysis of your past 7 days — what went well, what needs work, and your priority for this week.
            </p>
          </div>
        </div>
        <div className="flex shrink-0 items-center gap-1">
          {report && (
            <button type="button" onClick={() => setExpanded(v => !v)}
              className="rounded-lg p-1.5 text-muted-foreground hover:bg-muted/50">
              {expanded ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
            </button>
          )}
          <button type="button" onClick={() => setDismissed(true)}
            className="rounded-lg p-1.5 text-muted-foreground/40 hover:text-muted-foreground">
            <X className="h-4 w-4" />
          </button>
        </div>
      </div>

      {!report && (
        <button
          type="button"
          onClick={generate}
          disabled={loading}
          className="mt-3 flex items-center gap-2 rounded-xl bg-accent px-4 py-2 text-sm font-semibold text-white transition-opacity disabled:opacity-60 hover:opacity-90"
        >
          {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Sparkles className="h-4 w-4" />}
          {loading ? "Analysing your week…" : "Generate weekly report"}
        </button>
      )}

      {report && expanded && (
        <div className="mt-4 space-y-3">
          {stats && (
            <div className="flex flex-wrap gap-3">
              {[
                { label: "Study time", value: stats.totalMins7 >= 60 ? `${Math.floor(stats.totalMins7 / 60)}h ${stats.totalMins7 % 60}m` : `${stats.totalMins7}m` },
                { label: "Sessions", value: String(stats.sessions) },
                { label: "Accuracy", value: stats.accuracy !== null ? `${stats.accuracy}%` : "—" },
              ].map(({ label, value }) => (
                <div key={label} className="rounded-lg border border-accent/15 bg-accent/5 px-3 py-1.5 text-center">
                  <p className="text-sm font-bold text-foreground">{value}</p>
                  <p className="text-[10px] text-muted-foreground">{label}</p>
                </div>
              ))}
            </div>
          )}
          <div className="rounded-xl border border-border/60 bg-background/50 p-4 text-sm leading-relaxed text-foreground whitespace-pre-wrap">
            {report}
          </div>
          <button
            type="button"
            onClick={generate}
            disabled={loading}
            className="flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground"
          >
            <RefreshCw className={cn("h-3 w-3", loading && "animate-spin")} />
            Regenerate
          </button>
        </div>
      )}
    </div>
  );
}
