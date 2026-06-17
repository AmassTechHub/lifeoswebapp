"use client";

import { AlertTriangle, CalendarClock, CheckCircle2 } from "lucide-react";

import { Card, CardContent } from "@/components/ui/card";
import { cn } from "@/lib/utils";

type Deadline = {
  id: string;
  title: string;
  type: string;
  dueDate: Date | string;
  completed: boolean;
};

function daysUntil(date: Date | string): number {
  const due = new Date(date);
  const now = new Date();
  now.setHours(0, 0, 0, 0);
  due.setHours(0, 0, 0, 0);
  return Math.ceil((due.getTime() - now.getTime()) / 86_400_000);
}

function suggestedHoursPerDay(days: number): string {
  if (days <= 0) return "—";
  const hours = Math.min(Math.ceil(10 / days), 4);
  return `${hours}h/day`;
}

export function ExamCountdown({
  deadlines,
  courseName,
}: {
  deadlines: Deadline[];
  courseName: string;
}) {
  const upcoming = deadlines.filter((d) => !d.completed && daysUntil(d.dueDate) >= 0);

  if (upcoming.length === 0) {
    return (
      <div className="flex flex-col items-center gap-3 rounded-2xl border border-dashed border-border/60 py-10 text-center">
        <CheckCircle2 className="h-8 w-8 text-success/50" />
        <p className="text-sm font-medium text-muted-foreground">
          No upcoming deadlines for {courseName}
        </p>
        <p className="text-xs text-muted-foreground/60">
          Add deadlines in the Deadlines section to track exam countdowns.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      <p className="text-xs font-semibold uppercase tracking-widest text-muted-foreground/50">
        {upcoming.length} upcoming deadline{upcoming.length !== 1 ? "s" : ""}
      </p>
      {upcoming.map((d) => {
        const days = daysUntil(d.dueDate);
        const urgent = days <= 3;
        const soon = days <= 7;
        return (
          <Card
            key={d.id}
            className={cn(
              "border transition-colors",
              urgent ? "border-danger/30 bg-danger/5" : soon ? "border-warning/30 bg-warning/5" : "border-border/60 bg-card/80"
            )}
          >
            <CardContent className="flex items-start gap-4 pt-4">
              <div className="flex h-12 w-12 shrink-0 flex-col items-center justify-center rounded-xl bg-background/60 text-center shadow-sm">
                <p
                  className={cn(
                    "text-xl font-black tabular-nums",
                    urgent ? "text-danger" : soon ? "text-warning" : "text-foreground"
                  )}
                >
                  {days}
                </p>
                <p className="text-[9px] font-semibold uppercase text-muted-foreground">
                  {days === 1 ? "day" : "days"}
                </p>
              </div>
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2">
                  {urgent && <AlertTriangle className="h-3.5 w-3.5 shrink-0 text-danger" />}
                  <p className="truncate font-semibold text-foreground">{d.title}</p>
                </div>
                <p className="mt-0.5 text-xs text-muted-foreground">
                  {d.type} · due {new Date(d.dueDate).toLocaleDateString("en-US", { month: "short", day: "numeric" })}
                </p>
                <div className="mt-2 flex items-center gap-1.5">
                  <CalendarClock className="h-3 w-3 text-accent" />
                  <p className="text-xs text-accent">
                    Study suggestion: {suggestedHoursPerDay(days)}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        );
      })}
    </div>
  );
}
