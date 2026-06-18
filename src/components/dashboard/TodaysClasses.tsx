import Link from "next/link";
import { GraduationCap, MapPin } from "lucide-react";

import { dashboardCardClass } from "@/components/dashboard/dashboard-styles";
import type { CourseToday } from "@/lib/study/today";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

function formatTime(t: string): string {
  const [h, m] = t.split(":").map(Number);
  const period = h >= 12 ? "PM" : "AM";
  const hour12 = h % 12 === 0 ? 12 : h % 12;
  return `${hour12}:${String(m).padStart(2, "0")} ${period}`;
}

export function TodaysClasses({ courses, flashcardsDue }: { courses: CourseToday[]; flashcardsDue: number }) {
  const today = new Date().toLocaleDateString("en-US", { weekday: "long" });

  return (
    <Card className={dashboardCardClass()}>
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2">
            <GraduationCap className="h-5 w-5 text-accent" />
            Classes Today
          </CardTitle>
          <span className="text-xs text-muted-foreground">{today}</span>
        </div>
      </CardHeader>
      <CardContent className="space-y-2">
        {courses.length === 0 ? (
          <p className="text-sm text-muted-foreground">No classes scheduled today.</p>
        ) : (
          courses.map((c, i) => (
            <div
              key={`${c.id}-${i}`}
              className="flex items-center gap-3 rounded-lg border border-border/50 bg-muted/10 px-3 py-2.5 transition-colors hover:border-accent/25 hover:bg-accent/5"
            >
              <span className="h-2 w-2 shrink-0 rounded-full" style={{ backgroundColor: c.color }} />
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-medium">{c.code ? `${c.code} — ${c.name}` : c.name}</p>
                {c.venue && (
                  <p className="flex items-center gap-1 text-xs text-muted-foreground">
                    <MapPin className="h-3 w-3" />
                    {c.venue}
                  </p>
                )}
              </div>
              <span className="shrink-0 text-xs font-medium text-muted-foreground">
                {formatTime(c.startTime)}–{formatTime(c.endTime)}
              </span>
            </div>
          ))
        )}

        {flashcardsDue > 0 && (
          <Link
            href="/learning"
            className="flex items-center justify-between rounded-lg border border-warning/20 bg-warning/5 px-3 py-2.5 text-sm transition-colors hover:bg-warning/10"
          >
            <span className="font-medium text-warning">Review time</span>
            <span className="text-xs text-warning/80">{flashcardsDue} flashcard{flashcardsDue === 1 ? "" : "s"} due</span>
          </Link>
        )}
      </CardContent>
    </Card>
  );
}
