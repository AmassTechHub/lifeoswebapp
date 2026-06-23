"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { toast } from "sonner";
import { AlertTriangle, CalendarClock, GraduationCap, Loader2, Sparkles } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { cn } from "@/lib/utils";

export type ExamItem = {
  id: string;
  title: string;
  type: string;
  dueDate: string | Date;
  courseName: string | null;
};

function daysUntil(date: string | Date): number {
  const due = new Date(date);
  const now = new Date();
  now.setHours(0, 0, 0, 0);
  due.setHours(0, 0, 0, 0);
  return Math.round((due.getTime() - now.getTime()) / 86_400_000);
}

export function ExamModePanel({ exams }: { exams: ExamItem[] }) {
  const router = useRouter();
  const [building, setBuilding] = useState(false);

  async function buildPlan() {
    setBuilding(true);
    try {
      const res = await fetch("/api/study/exam-plan", { method: "POST" });
      const data = await res.json();
      if (!res.ok || data.error) {
        toast.error(data.error ?? "Could not build exam plan");
        return;
      }
      if (data.reason === "no-course-exams") {
        toast.error("Link your exams to a course (in Deadlines) so I can schedule study blocks.");
        return;
      }
      if (!data.sessionsCreated) {
        toast.message("No free slots found to add study blocks. Try freeing up your calendar.");
        return;
      }
      toast.success(
        `Exam plan ready — ${data.sessionsCreated} study block${data.sessionsCreated === 1 ? "" : "s"} across ${data.examsCovered} course${data.examsCovered === 1 ? "" : "s"}.`
      );
      router.refresh();
    } catch {
      toast.error("Could not build exam plan");
    } finally {
      setBuilding(false);
    }
  }

  const sorted = [...exams].sort(
    (a, b) => new Date(a.dueDate).getTime() - new Date(b.dueDate).getTime()
  );

  return (
    <Card className="border-accent/30 bg-linear-to-br from-accent/5 to-accent-2/5">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between gap-3">
          <CardTitle className="flex items-center gap-2 text-base">
            <GraduationCap className="h-4 w-4 text-accent" />
            Exam mode
          </CardTitle>
          <Button size="sm" className="gap-1.5" onClick={buildPlan} disabled={building}>
            {building ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Sparkles className="h-3.5 w-3.5" />}
            Build my exam plan
          </Button>
        </div>
        <p className="text-xs text-muted-foreground">
          Schedules focused study blocks across your free time, weighted toward the nearest exams and ramping up as exam day approaches.
        </p>
      </CardHeader>
      <CardContent className="space-y-2">
        {sorted.map((exam) => {
          const days = daysUntil(exam.dueDate);
          const urgent = days <= 3;
          const soon = days <= 7;
          return (
            <div
              key={exam.id}
              className={cn(
                "flex items-center gap-3 rounded-lg border px-3 py-2",
                urgent
                  ? "border-danger/30 bg-danger/5"
                  : soon
                    ? "border-warning/30 bg-warning/5"
                    : "border-border/60 bg-background/40"
              )}
            >
              <div className="flex h-10 w-10 shrink-0 flex-col items-center justify-center rounded-lg bg-background/70 text-center">
                <span
                  className={cn(
                    "text-base font-black leading-none tabular-nums",
                    urgent ? "text-danger" : soon ? "text-warning" : "text-foreground"
                  )}
                >
                  {days}
                </span>
                <span className="text-[8px] font-semibold uppercase text-muted-foreground">
                  {days === 1 ? "day" : "days"}
                </span>
              </div>
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-1.5">
                  {urgent && <AlertTriangle className="h-3.5 w-3.5 shrink-0 text-danger" />}
                  <p className="truncate text-sm font-semibold">{exam.title}</p>
                </div>
                <p className="truncate text-xs text-muted-foreground">
                  {exam.type}
                  {exam.courseName ? ` · ${exam.courseName}` : ""} · {new Date(exam.dueDate).toLocaleDateString("en-US", { month: "short", day: "numeric" })}
                </p>
              </div>
            </div>
          );
        })}
        <Link
          href="/calendar"
          className="inline-flex items-center gap-1.5 pt-1 text-xs font-medium text-accent hover:underline"
        >
          <CalendarClock className="h-3.5 w-3.5" />
          View scheduled blocks on the calendar
        </Link>
      </CardContent>
    </Card>
  );
}
