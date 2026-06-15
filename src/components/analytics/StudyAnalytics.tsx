"use client";

import { BookOpen, Brain, Clock, Target, TrendingUp } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { cn } from "@/lib/utils";

type DailyEntry = { date: string; secs: number };
type CourseBreakdown = {
  id: string;
  name: string;
  code: string | null;
  color: string;
  flashcardCount: number;
  noteCount: number;
  reviewed: number;
  correct: number;
  accuracy: number | null;
  durationSecs: number;
  sessions: number;
};

type Props = {
  totalSessions: number;
  totalTimeSecs: number;
  totalReviewed: number;
  overallAccuracy: number | null;
  daily: DailyEntry[];
  courses: CourseBreakdown[];
};

function fmtTime(secs: number): string {
  if (secs < 60) return `${secs}s`;
  const m = Math.floor(secs / 60);
  if (m < 60) return `${m}m`;
  const h = Math.floor(m / 60);
  const rem = m % 60;
  return rem > 0 ? `${h}h ${rem}m` : `${h}h`;
}

function accuracyColor(acc: number): string {
  if (acc >= 80) return "bg-success";
  if (acc >= 60) return "bg-accent";
  if (acc >= 40) return "bg-warning";
  return "bg-danger";
}

export function StudyAnalytics({
  totalSessions,
  totalTimeSecs,
  totalReviewed,
  overallAccuracy,
  daily,
  courses,
}: Props) {
  const maxDailySecs = Math.max(...daily.map((d) => d.secs), 1);
  // Show only last 14 days in chart (keeps it readable)
  const chartDays = daily.slice(-14);

  return (
    <div className="space-y-6">
      {/* Summary stats */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        {[
          { label: "Sessions (30d)", value: String(totalSessions), icon: Target, color: "text-accent" },
          { label: "Study time", value: fmtTime(totalTimeSecs), icon: Clock, color: "text-blue-500" },
          { label: "Cards reviewed", value: String(totalReviewed), icon: Brain, color: "text-purple-500" },
          { label: "Accuracy", value: overallAccuracy != null ? `${overallAccuracy}%` : "—", icon: TrendingUp, color: overallAccuracy != null && overallAccuracy >= 70 ? "text-success" : "text-warning" },
        ].map(({ label, value, icon: Icon, color }) => (
          <div key={label} className="rounded-xl border border-border/70 bg-card/80 p-4">
            <Icon className={cn("h-4 w-4 mb-2", color)} />
            <p className="text-2xl font-bold tabular-nums">{value}</p>
            <p className="text-xs text-muted-foreground">{label}</p>
          </div>
        ))}
      </div>

      {/* Daily study chart */}
      <Card className="border-border/70 bg-card/80">
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2 text-sm">
            <Clock className="h-4 w-4 text-accent" />
            Study time — last 14 days
          </CardTitle>
        </CardHeader>
        <CardContent>
          {daily.every((d) => d.secs === 0) ? (
            <p className="py-4 text-center text-sm text-muted-foreground">No study sessions recorded yet. Start a flashcard session to see data here.</p>
          ) : (
            <div className="flex h-28 items-end gap-1">
              {chartDays.map((day) => {
                const heightPct = (day.secs / maxDailySecs) * 100;
                return (
                  <div key={day.date} className="group relative flex flex-1 flex-col items-center">
                    <div
                      className="w-full rounded-t-sm bg-accent/60 transition-all hover:bg-accent"
                      style={{ height: `${Math.max(heightPct, 2)}%` }}
                    />
                    {/* Tooltip */}
                    {day.secs > 0 && (
                      <div className="pointer-events-none absolute -top-8 hidden rounded-md border border-border/70 bg-popover px-2 py-1 text-xs shadow-md group-hover:block">
                        {fmtTime(day.secs)}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
          {/* Date labels — show first and last */}
          {chartDays.length > 0 && (
            <div className="mt-1 flex justify-between text-[10px] text-muted-foreground">
              <span>{chartDays[0]?.date}</span>
              <span>{chartDays[chartDays.length - 1]?.date}</span>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Per-course breakdown */}
      <Card className="border-border/70 bg-card/80">
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2 text-sm">
            <BookOpen className="h-4 w-4 text-accent" />
            Course breakdown
          </CardTitle>
        </CardHeader>
        <CardContent>
          {courses.length === 0 ? (
            <p className="py-4 text-center text-sm text-muted-foreground">
              No study sessions yet. Complete flashcard reviews in the Learning tab to see course stats.
            </p>
          ) : (
            <div className="space-y-4">
              {courses
                .sort((a, b) => b.sessions - a.sessions)
                .map((c) => (
                  <div key={c.id} className="space-y-2">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <span
                          className="inline-block h-2.5 w-2.5 rounded-full"
                          style={{ backgroundColor: c.color }}
                        />
                        <span className="text-sm font-medium">
                          {c.code ? `${c.code}` : c.name}
                        </span>
                        {c.code && (
                          <span className="text-xs text-muted-foreground">{c.name}</span>
                        )}
                      </div>
                      <div className="flex items-center gap-3 text-xs text-muted-foreground">
                        <span>{c.sessions} session{c.sessions !== 1 ? "s" : ""}</span>
                        <span>{fmtTime(c.durationSecs)}</span>
                        {c.accuracy != null && (
                          <span className={cn(
                            "font-semibold",
                            c.accuracy >= 80 ? "text-success" : c.accuracy >= 60 ? "text-accent" : c.accuracy >= 40 ? "text-warning" : "text-danger"
                          )}>
                            {c.accuracy}%
                          </span>
                        )}
                      </div>
                    </div>
                    {c.accuracy != null && (
                      <div className="h-2 w-full overflow-hidden rounded-full bg-muted/50">
                        <div
                          className={cn("h-full rounded-full transition-all duration-700", accuracyColor(c.accuracy))}
                          style={{ width: `${c.accuracy}%` }}
                        />
                      </div>
                    )}
                    <p className="text-xs text-muted-foreground">
                      {c.flashcardCount} flashcards · {c.noteCount} notes
                      {c.reviewed > 0 && ` · ${c.reviewed} cards reviewed`}
                    </p>
                  </div>
                ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
