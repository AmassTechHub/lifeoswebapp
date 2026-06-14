"use client";

import { useEffect, useState } from "react";
import { BookOpen, Loader2 } from "lucide-react";

import { dashboardCardClass } from "@/components/dashboard/dashboard-styles";
import { cn } from "@/lib/utils";

type CourseActivity = {
  id: string;
  name: string;
  color: string;
  noteCount: number;
  materialCount: number;
  flashcardCount: number;
  dueCards: number;
  lastSession: { at: string; score: number | null } | null;
};

export function KnowledgeGraphPanel() {
  const [courses, setCourses] = useState<CourseActivity[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("/api/knowledge/graph")
      .then((r) => r.json())
      .then((data) => setCourses(data.courses ?? []))
      .finally(() => setLoading(false));
  }, []);

  return (
    <div className={cn(dashboardCardClass(), "p-5")}>
      <div className="mb-4 flex items-center gap-2">
        <BookOpen className="h-5 w-5 text-accent" />
        <h2 className="text-sm font-semibold">Learning activity</h2>
      </div>

      {loading && (
        <p className="flex items-center gap-2 text-sm text-muted-foreground">
          <Loader2 className="h-4 w-4 animate-spin" />
          Loading courses…
        </p>
      )}

      {!loading && courses.length === 0 && (
        <p className="text-sm text-muted-foreground">
          Add study courses in Learning to track your progress here.
        </p>
      )}

      {!loading && courses.length > 0 && (
        <ul className="space-y-3">
          {courses.map((course) => {
            const reviewed = course.flashcardCount - course.dueCards;
            const pct =
              course.flashcardCount > 0 ? (reviewed / course.flashcardCount) * 100 : 0;
            const lastStudied = course.lastSession
              ? new Date(course.lastSession.at).toLocaleDateString("en-US", {
                  month: "short",
                  day: "numeric",
                })
              : null;

            return (
              <li
                key={course.id}
                className="rounded-xl border border-border/60 bg-background/50 px-3 py-3"
              >
                <div className="flex items-center justify-between gap-2">
                  <div className="flex min-w-0 items-center gap-2">
                    <div
                      className="h-2 w-2 shrink-0 rounded-full"
                      style={{ backgroundColor: course.color }}
                    />
                    <p className="truncate text-sm font-semibold">{course.name}</p>
                  </div>
                  {course.dueCards > 0 && (
                    <span className="shrink-0 rounded-full bg-warning/10 px-1.5 py-0.5 text-[10px] font-bold text-warning">
                      {course.dueCards} due
                    </span>
                  )}
                  {course.dueCards === 0 && course.flashcardCount > 0 && (
                    <span className="shrink-0 rounded-full bg-success/10 px-1.5 py-0.5 text-[10px] font-bold text-success">
                      all caught up
                    </span>
                  )}
                </div>

                {course.flashcardCount > 0 && (
                  <div className="mt-2 h-1 w-full overflow-hidden rounded-full bg-muted">
                    <div
                      className="h-full rounded-full bg-accent transition-all duration-700"
                      style={{ width: `${pct}%` }}
                    />
                  </div>
                )}

                <p className="mt-1.5 text-[11px] text-muted-foreground">
                  {course.noteCount} notes · {course.materialCount} files ·{" "}
                  {course.flashcardCount} cards
                  {lastStudied ? ` · Studied ${lastStudied}` : " · Not studied yet"}
                  {course.lastSession?.score != null
                    ? ` (${course.lastSession.score}%)`
                    : ""}
                </p>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
