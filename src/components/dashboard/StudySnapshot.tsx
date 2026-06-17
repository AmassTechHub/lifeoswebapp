import Link from "next/link";
import { GraduationCap } from "lucide-react";

import { dashboardCardClass } from "@/components/dashboard/dashboard-styles";
import type { DashboardData } from "@/lib/data/dashboard";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export function StudySnapshot({
  courses,
  recentNotes,
}: {
  courses: DashboardData["studyCourses"];
  recentNotes: DashboardData["recentNotes"];
}) {
  return (
    <Card className={dashboardCardClass()}>
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2">
            <GraduationCap className="h-5 w-5 text-accent" />
            Study
          </CardTitle>
          <Link href="/learning" className="text-xs font-medium text-accent hover:underline">
            Open hub
          </Link>
        </div>
      </CardHeader>
      <CardContent className="space-y-3">
        {courses.length === 0 ? (
          <p className="text-sm text-muted-foreground">
            Add a class like DSA to take notes, summaries, and upload slides.
          </p>
        ) : (
          <>
            <ul className="space-y-1.5">
              {courses.map((c) => (
                <li key={c.id}>
                  <Link
                    href="/learning"
                    className="flex items-center justify-between rounded-lg border border-border/50 bg-muted/10 px-3 py-2 text-sm transition-colors hover:border-accent/25 hover:bg-accent/5"
                  >
                    <span className="flex min-w-0 items-center gap-2 font-medium">
                      <span
                        className="h-2 w-2 shrink-0 rounded-full"
                        style={{ backgroundColor: c.color }}
                      />
                      <span className="truncate">{c.name}</span>
                    </span>
                    <span className="shrink-0 text-xs text-muted-foreground">
                      {c._count.notes} notes · {c._count.materials} files
                    </span>
                  </Link>
                </li>
              ))}
            </ul>
            {recentNotes.length > 0 && (
              <div className="border-t border-border/60 pt-3">
                <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                  Recent
                </p>
                {recentNotes.map((n) => (
                  <p key={n.id} className="truncate text-sm text-muted-foreground">
                    {n.title}
                    <span className="text-xs"> · {n.course.name}</span>
                  </p>
                ))}
              </div>
            )}
          </>
        )}
      </CardContent>
    </Card>
  );
}
