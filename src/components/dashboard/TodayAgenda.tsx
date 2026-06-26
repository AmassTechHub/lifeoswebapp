import Link from "next/link";
import {
  AlarmClock,
  ArrowRight,
  Briefcase,
  CheckCircle2,
  GraduationCap,
  Sparkles,
} from "lucide-react";

import type { AgendaItem, AgendaKind } from "@/lib/data/today-agenda";
import { cn } from "@/lib/utils";

const kindMeta: Record<
  AgendaKind,
  { icon: React.ComponentType<{ className?: string }>; color: string; bg: string }
> = {
  task:     { icon: CheckCircle2, color: "text-accent",    bg: "bg-accent/10" },
  class:    { icon: GraduationCap,color: "text-emerald-400", bg: "bg-emerald-500/10" },
  deadline: { icon: AlarmClock,   color: "text-amber-400", bg: "bg-amber-500/10" },
  client:   { icon: Briefcase,    color: "text-violet-400", bg: "bg-violet-500/10" },
};

function AgendaRow({ item, danger = false }: { item: AgendaItem; danger?: boolean }) {
  const meta = kindMeta[item.kind];
  const Icon = meta.icon;

  return (
    <Link
      href={item.href}
      className="group flex items-center gap-3 rounded-xl border border-border/40 bg-card/50 px-3.5 py-2.5 transition-all hover:border-accent/25 hover:bg-accent/5 hover:shadow-sm"
    >
      {/* Kind icon */}
      <span
        className={cn(
          "flex h-7 w-7 shrink-0 items-center justify-center rounded-lg",
          danger ? "bg-rose-500/10" : meta.bg
        )}
      >
        <Icon
          className={cn(
            "h-3.5 w-3.5",
            danger ? "text-rose-400" : meta.color
          )}
        />
      </span>

      {/* Text */}
      <div className="min-w-0 flex-1">
        <p className="truncate text-[13px] font-medium text-foreground leading-snug">
          {item.title}
        </p>
        {item.sub && (
          <p className="truncate text-[11px] text-muted-foreground/60">{item.sub}</p>
        )}
      </div>

      {/* Time badge */}
      {item.time && (
        <span className="shrink-0 rounded-md bg-muted/60 px-1.5 py-0.5 text-[10px] font-semibold tabular-nums text-muted-foreground">
          {item.time}
        </span>
      )}

      <ArrowRight className="h-3.5 w-3.5 shrink-0 text-muted-foreground/20 transition-colors group-hover:text-accent/50" />
    </Link>
  );
}

export function TodayAgenda({
  overdue,
  today,
}: {
  overdue: AgendaItem[];
  today: AgendaItem[];
}) {
  return (
    <div className="space-y-3">
      {/* ── Overdue: the "don't forget" pile ──────────────────── */}
      {overdue.length > 0 && (
        <div className="rounded-xl border border-rose-500/25 bg-rose-500/5 p-3">
          <div className="mb-2 flex items-center gap-2">
            <AlarmClock className="h-3.5 w-3.5 text-rose-400" />
            <span className="text-[11px] font-semibold uppercase tracking-wide text-rose-400">
              Overdue · {overdue.length} item{overdue.length > 1 ? "s" : ""}
            </span>
          </div>
          <div className="space-y-1.5">
            {overdue.map((item) => (
              <AgendaRow key={item.id} item={item} danger />
            ))}
          </div>
        </div>
      )}

      {/* ── Today's items ──────────────────────────────────── */}
      <div className="rounded-xl border border-border/40 bg-card/40 p-3">
        <div className="mb-2.5 flex items-center justify-between">
          <span className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground/50">
            Up next
          </span>
          {today.length > 0 && (
            <span className="rounded-full bg-accent/10 px-2 py-0.5 text-[10px] font-semibold text-accent">
              {today.length}
            </span>
          )}
        </div>

        {today.length === 0 ? (
          <div className="flex flex-col items-center gap-2 py-7 text-center">
            <div className="flex h-10 w-10 items-center justify-center rounded-full bg-accent/10">
              <Sparkles className="h-5 w-5 text-accent/60" />
            </div>
            <p className="text-sm font-medium text-foreground">Nothing on your plate.</p>
            <Link
              href="/tasks"
              className="text-xs text-muted-foreground/60 hover:text-accent"
            >
              Add a task to get started →
            </Link>
          </div>
        ) : (
          <div className="space-y-1.5">
            {today.map((item) => (
              <AgendaRow key={item.id} item={item} />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
