"use client";

import { useEffect, useState } from "react";
import { GitBranch, Loader2 } from "lucide-react";

import { dashboardCardClass } from "@/components/dashboard/dashboard-styles";
import { cn } from "@/lib/utils";

type GraphNode = {
  id: string;
  type: "course" | "task" | "event";
  label: string;
  meta: Record<string, number>;
};

type GraphData = {
  nodes: GraphNode[];
  edges: { from: string; to: string; label: string }[];
};

export function KnowledgeGraphPanel() {
  const [data, setData] = useState<GraphData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("/api/knowledge/graph")
      .then((r) => r.json())
      .then((g) => setData(g))
      .finally(() => setLoading(false));
  }, []);

  const courses = data?.nodes.filter((n) => n.type === "course") ?? [];

  return (
    <div className={cn(dashboardCardClass(), "p-5")}>
      <div className="mb-4 flex items-center gap-2">
        <GitBranch className="h-5 w-5 text-accent" />
        <h2 className="text-sm font-semibold">Knowledge graph</h2>
      </div>
      {loading && (
        <p className="flex items-center gap-2 text-sm text-muted-foreground">
          <Loader2 className="h-4 w-4 animate-spin" />
          Mapping courses to tasks and classes…
        </p>
      )}
      {!loading && courses.length === 0 && (
        <p className="text-sm text-muted-foreground">
          Upload a timetable or add study courses to see connections.
        </p>
      )}
      {!loading && courses.length > 0 && (
        <ul className="space-y-3">
          {courses.map((course) => {
            const linked =
              data?.edges.filter((e) => e.from === course.id).length ?? 0;
            return (
              <li
                key={course.id}
                className="rounded-lg border border-border/60 bg-background/50 px-3 py-2"
              >
                <p className="text-sm font-medium">{course.label}</p>
                <p className="mt-1 text-xs text-muted-foreground">
                  {course.meta.notes ?? 0} notes · {course.meta.materials ?? 0}{" "}
                  materials · {course.meta.tasks ?? 0} tasks · {linked} links
                </p>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
