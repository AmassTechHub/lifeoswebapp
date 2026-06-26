import Link from "next/link";
import { Clock, PenLine } from "lucide-react";

import { formatTime } from "@/lib/date-utils";
import { cn } from "@/lib/utils";

type Block = {
  id: string;
  title: string;
  startAt: Date;
  category: string;
};

const typeStyles: Record<string, { bar: string; badge: string; label: string }> = {
  PERSONAL:  { bar: "bg-slate-400",    badge: "bg-slate-500/10 text-slate-400",    label: "Personal" },
  ACADEMICS: { bar: "bg-accent",       badge: "bg-accent/10 text-accent",          label: "Academics" },
  CLIENTS:   { bar: "bg-amber-400",    badge: "bg-amber-500/10 text-amber-400",    label: "Clients" },
  CODING:    { bar: "bg-violet-400",   badge: "bg-violet-500/10 text-violet-400",  label: "Coding" },
  CONTENT:   { bar: "bg-orange-400",   badge: "bg-orange-500/10 text-orange-400",  label: "Content" },
  CHURCH:    { bar: "bg-emerald-400",  badge: "bg-emerald-500/10 text-emerald-400",label: "Church" },
  OTHER:     { bar: "bg-muted-foreground/40", badge: "bg-muted text-muted-foreground", label: "Other" },
};

export function TodaysSchedule({ schedule }: { schedule: Block[] }) {
  return (
    <div className="rounded-xl border border-border/40 bg-card/40 p-3">
      {/* Header */}
      <div className="mb-2.5 flex items-center justify-between">
        <div className="flex items-center gap-1.5">
          <Clock className="h-3.5 w-3.5 text-muted-foreground/50" />
          <span className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground/50">
            Today&apos;s Schedule
          </span>
        </div>
        <Link
          href="/calendar"
          className="text-[10px] text-muted-foreground/40 hover:text-accent transition-colors"
        >
          View calendar →
        </Link>
      </div>

      {schedule.length === 0 ? (
        <div className="flex flex-col items-center gap-2 py-6 text-center">
          <p className="text-xs text-muted-foreground/50">No time blocks yet.</p>
          <Link
            href="/planner"
            className="inline-flex items-center gap-1 text-xs font-medium text-accent hover:underline"
          >
            <PenLine className="h-3 w-3" />
            Run daily setup
          </Link>
        </div>
      ) : (
        <div className="space-y-1.5">
          {schedule.map((block) => {
            const style = typeStyles[block.category] ?? typeStyles.OTHER;
            return (
              <div
                key={block.id}
                className="flex items-center gap-3 rounded-lg border border-border/30 bg-background/40 px-3 py-2.5 hover:border-accent/20 hover:bg-accent/5 transition-colors"
              >
                {/* Left color bar */}
                <div className={cn("h-8 w-1 shrink-0 rounded-full", style.bar)} />

                {/* Time */}
                <span className="w-12 shrink-0 text-[11px] font-semibold tabular-nums text-muted-foreground/60">
                  {formatTime(new Date(block.startAt))}
                </span>

                {/* Title */}
                <p className="min-w-0 flex-1 truncate text-[13px] font-medium text-foreground">
                  {block.title}
                </p>

                {/* Category badge — desktop only */}
                <span
                  className={cn(
                    "hidden shrink-0 rounded-md px-1.5 py-0.5 text-[10px] font-medium sm:inline-block",
                    style.badge
                  )}
                >
                  {style.label}
                </span>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
