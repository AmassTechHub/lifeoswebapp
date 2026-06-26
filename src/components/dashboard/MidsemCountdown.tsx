"use client";

import Link from "next/link";
import { AlertTriangle, BookOpen, CalendarClock, GraduationCap, Sparkles, Target } from "lucide-react";
import { cn } from "@/lib/utils";

export type MidsemExam = {
  id: string;
  title: string;
  type: string;
  dueDate: Date | string;
  courseName: string | null;
  courseColor: string | null;
};

function daysUntil(date: Date | string): number {
  const due = new Date(date);
  const now = new Date();
  now.setHours(0, 0, 0, 0);
  due.setHours(0, 0, 0, 0);
  return Math.round((due.getTime() - now.getTime()) / 86_400_000);
}

function urgencyLevel(days: number): "critical" | "urgent" | "soon" | "ok" {
  if (days <= 1) return "critical";
  if (days <= 3) return "urgent";
  if (days <= 7) return "soon";
  return "ok";
}

const urgencyStyles = {
  critical: {
    card: "border-rose-500/40 bg-rose-500/5",
    days: "text-rose-400",
    badge: "bg-rose-500/15 text-rose-400 border-rose-500/30",
    bar: "bg-rose-500",
    glow: "from-rose-500/10",
    label: "CRITICAL",
  },
  urgent: {
    card: "border-amber-500/40 bg-amber-500/5",
    days: "text-amber-400",
    badge: "bg-amber-500/15 text-amber-400 border-amber-500/30",
    bar: "bg-amber-400",
    glow: "from-amber-500/10",
    label: "URGENT",
  },
  soon: {
    card: "border-accent/30 bg-accent/5",
    days: "text-accent",
    badge: "bg-accent/15 text-accent border-accent/30",
    bar: "bg-accent",
    glow: "from-accent/10",
    label: "SOON",
  },
  ok: {
    card: "border-border/40 bg-card/50",
    days: "text-foreground",
    badge: "bg-muted/60 text-muted-foreground border-border/40",
    bar: "bg-emerald-400",
    glow: "from-emerald-500/5",
    label: "UPCOMING",
  },
};

export function MidsemCountdown({ exams }: { exams: MidsemExam[] }) {
  if (exams.length === 0) return null;

  const sorted = [...exams].sort(
    (a, b) => new Date(a.dueDate).getTime() - new Date(b.dueDate).getTime()
  );

  const nearest = sorted[0];
  const daysToNearest = daysUntil(nearest.dueDate);
  const level = urgencyLevel(daysToNearest);
  const styles = urgencyStyles[level];

  // Progress: map days away to a "study urgency" progress bar
  // 0 days = 100%, 14+ days = 0%
  const urgencyPct = Math.max(0, Math.min(100, ((14 - Math.max(0, daysToNearest)) / 14) * 100));

  return (
    <div className={cn("rounded-2xl border p-4 bg-gradient-to-br to-transparent", styles.card, styles.glow)}>
      {/* Header */}
      <div className="mb-3 flex items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-background/70">
            <GraduationCap className="h-4 w-4 text-accent" />
          </div>
          <div>
            <p className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground/50">
              Exam countdown
            </p>
            <p className="text-xs font-semibold text-foreground">
              {exams.length} exam{exams.length !== 1 ? "s" : ""} approaching
            </p>
          </div>
        </div>
        <span className={cn("rounded-md border px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide", styles.badge)}>
          {styles.label}
        </span>
      </div>

      {/* Nearest exam highlight */}
      <div className="mb-3 rounded-xl border border-border/50 bg-background/50 px-4 py-3">
        <div className="flex items-center gap-3">
          <div className="text-center">
            <p className={cn("text-3xl font-black tabular-nums leading-none", styles.days)}>
              {daysToNearest}
            </p>
            <p className="text-[9px] font-bold uppercase tracking-wider text-muted-foreground/50">
              {daysToNearest === 1 ? "day" : "days"}
            </p>
          </div>
          <div className="h-10 w-px bg-border/50" />
          <div className="min-w-0 flex-1">
            <p className="font-semibold text-foreground truncate text-sm">{nearest.title}</p>
            <div className="flex items-center gap-1.5 mt-0.5">
              {nearest.courseName && (
                <>
                  {nearest.courseColor && (
                    <span
                      className="h-2 w-2 rounded-full shrink-0"
                      style={{ backgroundColor: nearest.courseColor }}
                    />
                  )}
                  <p className="text-xs text-muted-foreground truncate">{nearest.courseName}</p>
                </>
              )}
              <span className="text-xs text-muted-foreground/40">·</span>
              <p className="text-xs text-muted-foreground">
                {new Date(nearest.dueDate).toLocaleDateString("en-US", { month: "short", day: "numeric" })}
              </p>
            </div>
          </div>
          {daysToNearest <= 3 && (
            <AlertTriangle className="h-4 w-4 shrink-0 text-amber-400" />
          )}
        </div>

        {/* Urgency bar */}
        <div className="mt-3">
          <div className="mb-1 flex items-center justify-between">
            <span className="text-[10px] text-muted-foreground/50">Urgency level</span>
            <span className="text-[10px] font-semibold text-muted-foreground/70">{Math.round(urgencyPct)}%</span>
          </div>
          <div className="h-1.5 w-full rounded-full bg-muted/40">
            <div
              className={cn("h-full rounded-full transition-all duration-700", styles.bar)}
              style={{ width: `${urgencyPct}%` }}
            />
          </div>
        </div>
      </div>

      {/* All upcoming exams list */}
      {sorted.length > 1 && (
        <div className="space-y-1.5 mb-3">
          {sorted.slice(1, 4).map((exam) => {
            const days = daysUntil(exam.dueDate);
            const lvl = urgencyLevel(days);
            const s = urgencyStyles[lvl];
            return (
              <div
                key={exam.id}
                className="flex items-center gap-2.5 rounded-lg border border-border/30 bg-background/30 px-3 py-2"
              >
                {exam.courseColor && (
                  <span
                    className="h-2 w-2 rounded-full shrink-0"
                    style={{ backgroundColor: exam.courseColor }}
                  />
                )}
                <p className="min-w-0 flex-1 truncate text-xs font-medium text-foreground">{exam.title}</p>
                {exam.courseName && (
                  <p className="shrink-0 text-[10px] text-muted-foreground/50 hidden sm:block">{exam.courseName}</p>
                )}
                <span className={cn("shrink-0 rounded px-1.5 py-0.5 text-[10px] font-bold tabular-nums", s.days)}>
                  {days}d
                </span>
              </div>
            );
          })}
        </div>
      )}

      {/* Actions */}
      <div className="flex flex-wrap gap-2">
        <Link
          href="/learning"
          className="flex items-center gap-1.5 rounded-lg bg-accent px-3 py-1.5 text-xs font-semibold text-white transition-opacity hover:opacity-90"
        >
          <BookOpen className="h-3.5 w-3.5" />
          Study hub
        </Link>
        <Link
          href="/deadlines"
          className="flex items-center gap-1.5 rounded-lg border border-border/60 bg-muted/50 px-3 py-1.5 text-xs font-semibold text-muted-foreground transition-colors hover:text-foreground"
        >
          <Target className="h-3.5 w-3.5" />
          All deadlines
        </Link>
        <Link
          href="/calendar"
          className="flex items-center gap-1.5 rounded-lg border border-border/60 bg-muted/50 px-3 py-1.5 text-xs font-semibold text-muted-foreground transition-colors hover:text-foreground"
        >
          <CalendarClock className="h-3.5 w-3.5" />
          Schedule
        </Link>
      </div>
    </div>
  );
}

export function MidsemEmptyState() {
  return (
    <div className="flex items-center gap-2 rounded-xl border border-emerald-500/20 bg-emerald-500/5 px-4 py-3">
      <Sparkles className="h-4 w-4 shrink-0 text-emerald-400" />
      <p className="text-xs font-medium text-emerald-400">No exams in the next 14 days — you&apos;re clear! 🎉</p>
    </div>
  );
}
