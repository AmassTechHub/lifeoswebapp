"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import {
  AlertTriangle, BookOpen, Brain, CalendarCheck,
  CheckCircle2, ChevronRight, Layers, Loader2,
  Sparkles, Target, Upload, Zap,
} from "lucide-react";
import { cn } from "@/lib/utils";

type TaskType = "review" | "exam-prep" | "assignment" | "upload" | "study";
type Priority = "urgent" | "high" | "normal";

type PlanTask = {
  id: string;
  type: TaskType;
  priority: Priority;
  title: string;
  subtitle: string;
  courseId?: string;
  courseName?: string;
  courseColor?: string;
  count?: number;
  daysLeft?: number;
};

type Summary = {
  cardsdue: number;
  examsThisWeek: number;
  nearestExamDays: number | null;
  nearestExamTitle: string | null;
};

const TYPE_ICONS: Record<TaskType, React.ElementType> = {
  review: Layers,
  "exam-prep": Target,
  assignment: BookOpen,
  upload: Upload,
  study: Brain,
};

const PRIORITY_STYLES: Record<Priority, string> = {
  urgent: "border-rose-500/30 bg-rose-500/5",
  high:   "border-amber-500/30 bg-amber-500/5",
  normal: "border-border/50 bg-card/60",
};

const PRIORITY_BADGE: Record<Priority, string> = {
  urgent: "bg-rose-500/15 text-rose-400",
  high:   "bg-amber-500/15 text-amber-400",
  normal: "hidden",
};

function getGreeting(): string {
  const h = new Date().getHours();
  if (h < 12) return "Good morning";
  if (h < 17) return "Good afternoon";
  return "Good evening";
}

function getMotivation(summary: Summary): string {
  if (summary.nearestExamDays !== null && summary.nearestExamDays <= 3) {
    return `${summary.nearestExamTitle} is in ${summary.nearestExamDays === 0 ? "TODAY" : `${summary.nearestExamDays} day${summary.nearestExamDays === 1 ? "" : "s"}`}. Focus mode.`;
  }
  if (summary.cardsdue >= 20) return `${summary.cardsdue} flashcards are waiting. Clear them first — it only takes 15 minutes.`;
  if (summary.examsThisWeek > 0) return `${summary.examsThisWeek} exam${summary.examsThisWeek > 1 ? "s" : ""} this week. Consistent daily prep beats a last-minute cram every time.`;
  if (summary.cardsdue > 0) return `${summary.cardsdue} card${summary.cardsdue > 1 ? "s" : ""} due for review. Quick wins add up.`;
  return "Nothing urgent today. Great time to get ahead on a tough course.";
}

export function DailyStudyPlan({ userName }: { userName?: string }) {
  const router = useRouter();
  const [tasks, setTasks] = useState<PlanTask[]>([]);
  const [summary, setSummary] = useState<Summary | null>(null);
  const [loading, setLoading] = useState(true);
  const [completed, setCompleted] = useState<Set<string>>(new Set());

  useEffect(() => {
    fetch("/api/study/daily-plan")
      .then((r) => r.json())
      .then((d) => {
        setTasks(d.tasks ?? []);
        setSummary(d.summary ?? null);
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  function markDone(id: string) {
    setCompleted((prev) => new Set([...prev, id]));
  }

  const remaining = tasks.filter((t) => !completed.has(t.id));
  const allDone = tasks.length > 0 && remaining.length === 0;

  if (loading) {
    return (
      <div className="flex items-center gap-2 rounded-2xl border border-border/50 bg-card/60 px-4 py-3">
        <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
        <p className="text-sm text-muted-foreground">Building your study plan…</p>
      </div>
    );
  }

  if (!summary && tasks.length === 0) return null;

  return (
    <div className="rounded-2xl border border-accent/20 bg-gradient-to-br from-accent/5 to-transparent p-4 space-y-4">
      {/* Header */}
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-start gap-3">
          <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-accent/15">
            <Sparkles className="h-5 w-5 text-accent" />
          </div>
          <div>
            <p className="font-semibold text-foreground">
              {getGreeting()}{userName ? `, ${userName.split(" ")[0]}` : ""}
            </p>
            {summary && (
              <p className="mt-0.5 text-sm text-muted-foreground">
                {getMotivation(summary)}
              </p>
            )}
          </div>
        </div>

        {/* Stats pills */}
        {summary && (
          <div className="flex shrink-0 flex-wrap justify-end gap-1.5">
            {summary.cardsdue > 0 && (
              <div className="flex items-center gap-1 rounded-full border border-amber-500/30 bg-amber-500/10 px-2.5 py-1 text-[11px] font-semibold text-amber-400">
                <Layers className="h-3 w-3" />
                {summary.cardsdue} due
              </div>
            )}
            {summary.examsThisWeek > 0 && (
              <div className="flex items-center gap-1 rounded-full border border-rose-500/30 bg-rose-500/10 px-2.5 py-1 text-[11px] font-semibold text-rose-400">
                <Target className="h-3 w-3" />
                {summary.examsThisWeek} exam{summary.examsThisWeek > 1 ? "s" : ""}
              </div>
            )}
          </div>
        )}
      </div>

      {/* All done state */}
      {allDone ? (
        <div className="flex items-center gap-3 rounded-xl border border-success/30 bg-success/10 px-4 py-3">
          <CheckCircle2 className="h-5 w-5 text-success" />
          <div>
            <p className="text-sm font-semibold text-foreground">Today&apos;s plan complete 🎉</p>
            <p className="text-xs text-muted-foreground">Consistent days like this are what get A&apos;s.</p>
          </div>
        </div>
      ) : (
        <div className="space-y-2">
          <div className="flex items-center justify-between px-0.5">
            <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground/60">
              Today&apos;s focus — {remaining.length} task{remaining.length !== 1 ? "s" : ""}
            </p>
            {tasks.length > 0 && (
              <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                <div className="h-1.5 w-20 overflow-hidden rounded-full bg-muted/40">
                  <div
                    className="h-full rounded-full bg-accent transition-all"
                    style={{ width: `${((tasks.length - remaining.length) / tasks.length) * 100}%` }}
                  />
                </div>
                <span>{tasks.length - remaining.length}/{tasks.length}</span>
              </div>
            )}
          </div>

          {remaining.slice(0, 5).map((task) => {
            const Icon = TYPE_ICONS[task.type];
            return (
              <div
                key={task.id}
                className={cn(
                  "flex items-center gap-3 rounded-xl border px-3.5 py-3 transition-all",
                  PRIORITY_STYLES[task.priority]
                )}
              >
                {/* Color dot for course */}
                <div
                  className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-background/50"
                  style={{ borderLeft: task.courseColor ? `3px solid ${task.courseColor}` : undefined }}
                >
                  <Icon className="h-4 w-4 text-muted-foreground" />
                </div>

                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2">
                    <p className="truncate text-sm font-medium text-foreground">{task.title}</p>
                    {task.priority !== "normal" && (
                      <span className={cn("shrink-0 rounded-full px-1.5 py-0.5 text-[9px] font-bold uppercase", PRIORITY_BADGE[task.priority])}>
                        {task.priority === "urgent" ? "urgent" : "today"}
                      </span>
                    )}
                  </div>
                  <p className="truncate text-xs text-muted-foreground">{task.subtitle}</p>
                </div>

                {/* Action */}
                <div className="flex shrink-0 items-center gap-1.5">
                  {task.type === "review" && task.courseId && (
                    <button
                      type="button"
                      onClick={() => { markDone(task.id); router.push(`/learning`); }}
                      className="flex items-center gap-1 rounded-lg bg-accent px-2.5 py-1.5 text-[11px] font-semibold text-white transition-opacity hover:opacity-90"
                    >
                      <Zap className="h-3 w-3" />
                      Review
                    </button>
                  )}
                  {task.type === "exam-prep" && (
                    <button
                      type="button"
                      onClick={() => { markDone(task.id); router.push(`/learning`); }}
                      className="flex items-center gap-1 rounded-lg border border-rose-500/30 bg-rose-500/10 px-2.5 py-1.5 text-[11px] font-semibold text-rose-400 transition-colors hover:bg-rose-500/20"
                    >
                      <Target className="h-3 w-3" />
                      Prep
                    </button>
                  )}
                  {(task.type === "assignment" || task.type === "upload" || task.type === "study") && (
                    <button
                      type="button"
                      onClick={() => { markDone(task.id); router.push(`/learning`); }}
                      className="flex items-center gap-1 rounded-lg border border-border/60 bg-muted/40 px-2.5 py-1.5 text-[11px] font-medium text-muted-foreground transition-colors hover:text-foreground"
                    >
                      <ChevronRight className="h-3 w-3" />
                      Go
                    </button>
                  )}
                  <button
                    type="button"
                    onClick={() => markDone(task.id)}
                    className="rounded-lg p-1.5 text-muted-foreground/40 transition-colors hover:text-success"
                    title="Mark done"
                  >
                    <CheckCircle2 className="h-4 w-4" />
                  </button>
                </div>
              </div>
            );
          })}

          {remaining.length === 0 && tasks.length === 0 && (
            <div className="flex items-center gap-2 rounded-xl border border-border/40 bg-muted/20 px-4 py-3">
              <CalendarCheck className="h-4 w-4 text-muted-foreground/50" />
              <p className="text-sm text-muted-foreground">
                No urgent tasks today. Upload slides or add an exam deadline to get personalised daily plans.
              </p>
            </div>
          )}

          {/* Urgent warning */}
          {summary?.nearestExamDays !== null && summary?.nearestExamDays !== undefined && summary.nearestExamDays <= 2 && (
            <div className="flex items-start gap-2 rounded-xl border border-rose-500/20 bg-rose-500/5 px-3 py-2.5">
              <AlertTriangle className="mt-0.5 h-3.5 w-3.5 shrink-0 text-rose-400" />
              <p className="text-xs text-rose-400">
                <span className="font-semibold">Exam mode:</span> Prioritise AI Tutor → Exam Prep Quiz and flashcard review over reading new material.
              </p>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
