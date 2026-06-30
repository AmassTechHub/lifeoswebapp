"use client";

import { useState } from "react";
import { BookOpen, GraduationCap } from "lucide-react";
import { cn } from "@/lib/utils";

type Mode = "courses" | "topics";

export function LearningModeSwitcher({
  hasCourses,
  hasTopics,
  studyHub,
  topicTracker,
}: {
  hasCourses: boolean;
  hasTopics: boolean;
  studyHub: React.ReactNode;
  topicTracker: React.ReactNode;
}) {
  // Default: if user has topics but no courses → show topics mode, else courses
  const defaultMode: Mode = !hasCourses && hasTopics ? "topics" : "courses";
  const [mode, setMode] = useState<Mode>(defaultMode);

  return (
    <div className="space-y-4">
      {/* Mode tab switcher */}
      <div className="flex gap-1 rounded-xl border border-border/60 bg-muted/30 p-1">
        <button
          type="button"
          onClick={() => setMode("courses")}
          className={cn(
            "flex flex-1 items-center justify-center gap-2 rounded-lg px-4 py-2 text-sm font-medium transition-all",
            mode === "courses"
              ? "bg-background text-foreground shadow-sm"
              : "text-muted-foreground hover:text-foreground"
          )}
        >
          <GraduationCap className="h-4 w-4" />
          <span>Courses</span>
          {mode === "courses" && hasCourses && (
            <span className="ml-1 hidden rounded-full bg-accent/15 px-1.5 py-0.5 text-[10px] font-bold text-accent sm:inline">
              Structured
            </span>
          )}
        </button>
        <button
          type="button"
          onClick={() => setMode("topics")}
          className={cn(
            "flex flex-1 items-center justify-center gap-2 rounded-lg px-4 py-2 text-sm font-medium transition-all",
            mode === "topics"
              ? "bg-background text-foreground shadow-sm"
              : "text-muted-foreground hover:text-foreground"
          )}
        >
          <BookOpen className="h-4 w-4" />
          <span>Topics</span>
        </button>
      </div>

      {/* Content */}
      {mode === "courses" ? studyHub : topicTracker}
    </div>
  );
}
