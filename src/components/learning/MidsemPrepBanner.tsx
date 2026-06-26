"use client";

import Link from "next/link";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import {
  AlertTriangle, BookOpen, CalendarClock,
  GraduationCap, Layers, Loader2, Sparkles,
} from "lucide-react";
import { cn } from "@/lib/utils";

export type MidsemExamItem = {
  id: string;
  title: string;
  type: string;
  dueDate: Date | string;
  courseName: string | null;
  courseColor: string | null;
  courseId: string | null;
};

function daysUntil(date: Date | string): number {
  const due = new Date(date);
  const now = new Date();
  now.setHours(0, 0, 0, 0);
  due.setHours(0, 0, 0, 0);
  return Math.round((due.getTime() - now.getTime()) / 86_400_000);
}

export function MidsemPrepBanner({
  exams,
  flashcardsDue,
  studyStreak,
}: {
  exams: MidsemExamItem[];
  flashcardsDue: number;
  studyStreak: number;
}) {
  const router = useRouter();
  const [building, setBuilding] = useState(false);

  const sorted = [...exams].sort(
    (a, b) => new Date(a.dueDate).getTime() - new Date(b.dueDate).getTime()
  );
  const nearest = sorted[0];
  const daysToNearest = daysUntil(nearest.dueDate);
  const urgent = daysToNearest <= 3;
  const soon = daysToNearest <= 7;

  async function buildExamPlan() {
    setBuilding(true);
    try {
      const res = await fetch("/api/study/exam-plan", { method: "POST" });
      const data = await res.json();
      if (!res.ok || data.error) { toast.error(data.error ?? "Could not build exam plan"); return; }
      if (data.reason === "no-course-exams") {
        toast.error("Link your exams to a course in Deadlines so I can schedule study blocks.");
        return;
      }
      toast.success(`Exam plan ready — ${data.sessionsCreated} study block${data.sessionsCreated === 1 ? "" : "s"} scheduled.`);
      router.refresh();
    } catch {
      toast.error("Could not build exam plan");
    } finally {
      setBuilding(false);
    }
  }

  return (
    <div className={cn(
      "rounded-2xl border p-4",
      urgent ? "border-rose-500/30 bg-rose-500/5"
        : soon ? "border-amber-500/30 bg-amber-500/5"
        : "border-accent/25 bg-accent/5"
    )}>
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div className="flex items-start gap-3">
          <GraduationCap className={cn(
            "mt-0.5 h-5 w-5 shrink-0",
            urgent ? "text-rose-400" : soon ? "text-amber-400" : "text-accent"
          )} />
          <div>
            <p className="font-semibold text-foreground">
              {urgent ? "⚡ Exam soon — focus mode" : soon ? "📚 Exam season" : "Upcoming exams"}
            </p>
            <p className="mt-0.5 text-sm text-muted-foreground">
              <span className={cn(
                "font-bold",
                urgent ? "text-rose-400" : soon ? "text-amber-400" : "text-accent"
              )}>
                {daysToNearest === 0 ? "Today" : daysToNearest === 1 ? "Tomorrow" : `${daysToNearest} days`}
              </span>
              {" "}until{" "}
              <span className="font-medium text-foreground">{nearest.title}</span>
              {nearest.courseName && <span className="text-muted-foreground/70"> · {nearest.courseName}</span>}
            </p>
            {sorted.length > 1 && (
              <p className="mt-0.5 text-xs text-muted-foreground/60">
                +{sorted.length - 1} more exam{sorted.length - 1 > 1 ? "s" : ""} coming up
              </p>
            )}
          </div>
        </div>

        <div className="flex flex-wrap gap-2 shrink-0">
          {flashcardsDue > 0 && (
            <Link
              href="/learning"
              className="flex items-center gap-1.5 rounded-lg border border-amber-500/30 bg-amber-500/10 px-3 py-1.5 text-xs font-semibold text-amber-400 transition-colors hover:bg-amber-500/20"
            >
              <Layers className="h-3.5 w-3.5" />
              {flashcardsDue} cards due
            </Link>
          )}
          {studyStreak > 0 && (
            <div className="flex items-center gap-1.5 rounded-lg border border-border/50 bg-background/50 px-3 py-1.5 text-xs font-semibold text-muted-foreground">
              🔥 {studyStreak}d streak
            </div>
          )}
          <button
            type="button"
            onClick={buildExamPlan}
            disabled={building}
            className={cn(
              "flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-semibold transition-colors",
              urgent
                ? "bg-rose-500 text-white hover:bg-rose-600"
                : "bg-accent text-white hover:opacity-90"
            )}
          >
            {building
              ? <Loader2 className="h-3.5 w-3.5 animate-spin" />
              : <CalendarClock className="h-3.5 w-3.5" />
            }
            Build study plan
          </button>
        </div>
      </div>

      {urgent && (
        <div className="mt-3 flex items-center gap-2 rounded-lg border border-rose-500/20 bg-rose-500/10 px-3 py-2">
          <AlertTriangle className="h-3.5 w-3.5 shrink-0 text-rose-400" />
          <p className="text-xs text-rose-400 font-medium">
            Prioritise active recall over re-reading. Use the Flashcards tab and the AI Tutor for targeted prep.
          </p>
        </div>
      )}
    </div>
  );
}
