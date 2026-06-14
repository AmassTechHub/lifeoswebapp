"use client";

import { useTransition } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Calendar, Loader2, Sparkles, Target } from "lucide-react";
import Link from "next/link";

import { runDailySetup } from "@/lib/actions/automation";
import { formatTime } from "@/lib/date-utils";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { cn } from "@/lib/utils";

type PlannerData = {
  events: {
    id: string;
    title: string;
    startAt: Date;
    endAt: Date;
    category: string;
    source: string;
  }[];
  snapshot: {
    score: number;
    breakdown: string;
    focusJson: string;
  } | null;
  habits: { id: string; name: string; doneToday: boolean }[];
  tasks: { id: string; title: string; category: string; dueDate: Date | null }[];
  date: Date;
};

export function PlannerPanel({ data }: { data: PlannerData }) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();

  const focus = data.snapshot
    ? (JSON.parse(data.snapshot.focusJson) as { id: string; title: string }[])
    : [];

  return (
    <div className="space-y-6">
      <div className="rounded-2xl border border-accent/25 bg-accent/5 p-5">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-start gap-3">
            <Sparkles className="mt-0.5 h-6 w-6 text-accent" />
            <div>
              <p className="font-semibold text-foreground">Daily Setup (automated)</p>
              <p className="mt-1 max-w-xl text-sm text-muted-foreground">
                Life OS reads your tasks, habits, clients, content pipeline, and study
                courses, then builds today&apos;s schedule, focus list, and daily score.
              </p>
            </div>
          </div>
          <Button
            disabled={pending}
            className="gap-2 shrink-0"
            onClick={() =>
              startTransition(async () => {
                await runDailySetup();
                toast.success("Daily setup complete");
                router.refresh();
              })
            }
          >
            {pending ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Sparkles className="h-4 w-4" />
            )}
            Run daily setup
          </Button>
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        <Card className="border-border/70 bg-card/80 lg:col-span-2">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <Calendar className="h-4 w-4 text-accent" />
              Today&apos;s plan
            </CardTitle>
          </CardHeader>
          <CardContent>
            {data.events.length === 0 ? (
              <p className="text-sm text-muted-foreground">
                No blocks yet. Hit <strong>Run daily setup</strong> to auto-build your day.
              </p>
            ) : (
              <div className="space-y-2">
                {data.events.map((e) => (
                  <div
                    key={e.id}
                    className="flex items-center gap-3 rounded-lg border border-border/60 px-4 py-3"
                  >
                    <span className="w-20 shrink-0 text-xs text-muted-foreground">
                      {formatTime(new Date(e.startAt))}
                    </span>
                    <p className="min-w-0 flex-1 text-sm font-medium">{e.title}</p>
                    <span
                      className={cn(
                        "shrink-0 rounded px-1.5 py-0.5 text-[10px] font-medium",
                        e.source === "SYSTEM"
                          ? "bg-accent/15 text-accent"
                          : e.source === "TIMETABLE"
                            ? "bg-muted text-muted-foreground"
                            : "bg-secondary/40 text-muted-foreground"
                      )}
                    >
                      {e.source}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        <div className="space-y-4">
          <Card className="border-border/70 bg-card/80">
            <CardHeader className="pb-2">
              <CardTitle className="flex items-center gap-2 text-base">
                <Target className="h-4 w-4 text-accent" />
                Focus
              </CardTitle>
            </CardHeader>
            <CardContent>
              {focus.length === 0 ? (
                <p className="text-sm text-muted-foreground">Run daily setup for priorities.</p>
              ) : (
                <ol className="list-decimal space-y-2 pl-4 text-sm">
                  {focus.map((f) => (
                    <li key={f.id}>{f.title}</li>
                  ))}
                </ol>
              )}
              {data.snapshot && (
                <p className="mt-4 text-center text-2xl font-bold text-accent">
                  Score: {data.snapshot.score}
                </p>
              )}
            </CardContent>
          </Card>

          <Card className="border-border/70 bg-card/80">
            <CardHeader className="pb-2">
              <CardTitle className="text-base">Habits today</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              {data.habits.length === 0 ? (
                <p className="text-sm text-muted-foreground">
                  <Link href="/habits" className="text-accent hover:underline">
                    Add habits
                  </Link>
                </p>
              ) : (
                data.habits.map((h) => (
                  <p
                    key={h.id}
                    className={cn(
                      "text-sm",
                      h.doneToday ? "text-success" : "text-muted-foreground"
                    )}
                  >
                    {h.doneToday ? "✓" : "○"} {h.name}
                  </p>
                ))
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
