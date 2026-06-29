"use client";

import Link from "next/link";
import {
  AlertTriangle, BookOpen, Brain, CheckCircle2,
  Layers, Target, TrendingUp, Zap,
} from "lucide-react";
import { cn } from "@/lib/utils";

type Flashcard = {
  id: string;
  courseId: string | null;
  difficulty: number; // 0=new, 1=easy, 2=medium, 3=hard
  reviewCount: number;
  front: string;
};

type Course = {
  id: string;
  name: string;
  color: string;
  _count: { notes: number; materials: number };
};

type Deadline = {
  id: string;
  title: string;
  dueDate: Date | string;
  courseId: string | null;
  type: string;
};

type StreakData = {
  current: number;
  totalSessions: number;
  totalMinutes: number;
};

function daysUntil(date: Date | string): number {
  const due = new Date(date);
  const now = new Date();
  now.setHours(0, 0, 0, 0);
  due.setHours(0, 0, 0, 0);
  return Math.round((due.getTime() - now.getTime()) / 86_400_000);
}

function getReadinessScore(
  course: Course,
  flashcards: Flashcard[],
  deadlines: Deadline[]
): { score: number; label: string; color: string; bgColor: string } {
  const courseFlashcards = flashcards.filter((f) => f.courseId === course.id);
  const totalCards = courseFlashcards.length;
  const masteredCards = courseFlashcards.filter((f) => f.difficulty === 1 && f.reviewCount >= 2).length;
  const hasNotes = course._count.notes > 0;
  const hasMaterials = course._count.materials > 0;

  const nearestExam = deadlines
    .filter((d) => d.courseId === course.id && ["EXAM", "QUIZ"].includes(d.type))
    .sort((a, b) => new Date(a.dueDate).getTime() - new Date(b.dueDate).getTime())[0];

  // Calculate readiness 0–100
  let score = 0;
  if (hasNotes) score += 20;
  if (hasMaterials) score += 20;
  if (totalCards > 0) score += 20;
  if (totalCards > 0) score += Math.min(30, Math.round((masteredCards / totalCards) * 30));
  if (nearestExam) {
    const days = daysUntil(nearestExam.dueDate);
    // More prepared = earlier you started, not just raw count
    if (score >= 60 && days > 3) score += 10;
  }

  score = Math.min(100, score);

  if (score >= 80) return { score, label: "Ready", color: "text-success", bgColor: "bg-success/10" };
  if (score >= 60) return { score, label: "Good", color: "text-accent", bgColor: "bg-accent/10" };
  if (score >= 40) return { score, label: "Needs work", color: "text-warning", bgColor: "bg-warning/10" };
  return { score, label: "Not started", color: "text-muted-foreground", bgColor: "bg-muted/30" };
}

function getWeakSpots(flashcards: Flashcard[], courseId?: string): string[] {
  const relevant = courseId
    ? flashcards.filter((f) => f.courseId === courseId)
    : flashcards;

  // Cards rated "hard" (difficulty 3) or never reviewed that have been seen
  return relevant
    .filter((f) => (f.difficulty === 3 && f.reviewCount > 0) || (f.difficulty === 2 && f.reviewCount >= 3))
    .sort((a, b) => b.difficulty - a.difficulty)
    .slice(0, 5)
    .map((f) => f.front);
}

export function CourseIntelligence({
  courses,
  flashcards,
  streak,
  deadlines,
  selectedCourseId,
}: {
  courses: Course[];
  flashcards: Flashcard[];
  streak: StreakData;
  deadlines: Deadline[];
  selectedCourseId?: string;
}) {
  const selectedCourse = courses.find((c) => c.id === selectedCourseId) ?? courses[0];
  if (!selectedCourse) return null;

  const readiness = getReadinessScore(selectedCourse, flashcards, deadlines);
  const weakSpots = getWeakSpots(flashcards, selectedCourse.id);
  const courseFlashcards = flashcards.filter((f) => f.courseId === selectedCourse.id);
  const dueCards = courseFlashcards.filter((f) => !f.reviewCount || f.difficulty >= 2);

  // Nearest exam for this course
  const nearestExam = deadlines
    .filter((d) => d.courseId === selectedCourse.id && ["EXAM", "QUIZ"].includes(d.type))
    .sort((a, b) => new Date(a.dueDate).getTime() - new Date(b.dueDate).getTime())[0];

  const daysToExam = nearestExam ? daysUntil(nearestExam.dueDate) : null;

  // What to do next — smart recommendation
  let nextAction = "";
  let nextHref = "/learning";
  if (course._count.materials === 0 && course._count.notes === 0) {
    nextAction = "Upload your lecture slides to unlock AI study tools";
    nextHref = "/learning";
  } else if (courseFlashcards.length === 0) {
    nextAction = "Generate flashcards from your slides to start spaced repetition";
  } else if (dueCards.length > 0) {
    nextAction = `Review ${dueCards.length} flashcard${dueCards.length !== 1 ? "s" : ""} due for practice`;
  } else if (weakSpots.length > 0) {
    nextAction = `Focus on your weak spots — you're struggling with ${weakSpots.length} topic${weakSpots.length !== 1 ? "s" : ""}`;
  } else if (daysToExam !== null && daysToExam <= 7) {
    nextAction = `Exam in ${daysToExam} days — run the Exam Prep Quiz now`;
  } else {
    nextAction = "Use the AI Tutor → Teach Me mode to review this course";
  }

  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const course = selectedCourse;

  return (
    <div className="rounded-xl border border-border/50 bg-card/60 p-4 space-y-3">
      {/* Header row */}
      <div className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <div
            className="h-3 w-3 rounded-full"
            style={{ backgroundColor: selectedCourse.color }}
          />
          <p className="text-sm font-semibold text-foreground">{selectedCourse.name}</p>
        </div>
        <div className={cn("flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-bold", readiness.bgColor, readiness.color)}>
          <TrendingUp className="h-3 w-3" />
          {readiness.label} · {readiness.score}%
        </div>
      </div>

      {/* Readiness bar */}
      <div className="space-y-1">
        <div className="h-2 w-full rounded-full bg-muted/40 overflow-hidden">
          <div
            className={cn("h-full rounded-full transition-all duration-700", {
              "bg-success": readiness.score >= 80,
              "bg-accent": readiness.score >= 60 && readiness.score < 80,
              "bg-warning": readiness.score >= 40 && readiness.score < 60,
              "bg-muted-foreground/30": readiness.score < 40,
            })}
            style={{ width: `${readiness.score}%` }}
          />
        </div>
        <div className="flex items-center justify-between text-[10px] text-muted-foreground/60">
          <span>{selectedCourse._count.notes} notes · {selectedCourse._count.materials} files · {courseFlashcards.length} cards</span>
          {streak.current > 0 && <span>🔥 {streak.current}d streak</span>}
        </div>
      </div>

      {/* Exam countdown */}
      {daysToExam !== null && (
        <div className={cn(
          "flex items-center gap-2 rounded-lg border px-3 py-2",
          daysToExam <= 3 ? "border-rose-500/30 bg-rose-500/5" :
          daysToExam <= 7 ? "border-amber-500/30 bg-amber-500/5" :
          "border-border/40 bg-muted/20"
        )}>
          <Target className={cn("h-4 w-4 shrink-0",
            daysToExam <= 3 ? "text-rose-400" :
            daysToExam <= 7 ? "text-amber-400" :
            "text-muted-foreground"
          )} />
          <p className="text-xs text-foreground">
            <span className="font-semibold">{nearestExam!.title}</span>
            <span className="text-muted-foreground ml-1">
              {daysToExam === 0 ? "· TODAY" :
               daysToExam === 1 ? "· tomorrow" :
               `· ${daysToExam} days`}
            </span>
          </p>
        </div>
      )}

      {/* Weak spots */}
      {weakSpots.length > 0 && (
        <div className="rounded-lg border border-amber-500/20 bg-amber-500/5 p-3">
          <div className="flex items-center gap-1.5 mb-2">
            <AlertTriangle className="h-3.5 w-3.5 text-amber-400" />
            <p className="text-xs font-semibold text-amber-400">Weak spots — review these</p>
          </div>
          <div className="space-y-1">
            {weakSpots.slice(0, 3).map((w, i) => (
              <p key={i} className="text-xs text-muted-foreground truncate">
                · {w}
              </p>
            ))}
            {weakSpots.length > 3 && (
              <p className="text-[10px] text-muted-foreground/50">+{weakSpots.length - 3} more</p>
            )}
          </div>
        </div>
      )}

      {/* Smart next action */}
      <div className="flex items-start gap-2 rounded-lg border border-accent/20 bg-accent/5 px-3 py-2.5">
        <Zap className="mt-0.5 h-3.5 w-3.5 shrink-0 text-accent" />
        <p className="text-xs text-foreground">{nextAction}</p>
      </div>

      {/* Stats row */}
      <div className="grid grid-cols-3 gap-2">
        <div className="rounded-lg border border-border/40 bg-background/40 p-2 text-center">
          <BookOpen className="mx-auto h-3.5 w-3.5 text-muted-foreground/50 mb-1" />
          <p className="text-sm font-bold tabular-nums">{selectedCourse._count.notes}</p>
          <p className="text-[10px] text-muted-foreground">notes</p>
        </div>
        <div className="rounded-lg border border-border/40 bg-background/40 p-2 text-center">
          <Layers className="mx-auto h-3.5 w-3.5 text-muted-foreground/50 mb-1" />
          <p className="text-sm font-bold tabular-nums">{courseFlashcards.length}</p>
          <p className="text-[10px] text-muted-foreground">cards</p>
        </div>
        <div className="rounded-lg border border-border/40 bg-background/40 p-2 text-center">
          <Brain className="mx-auto h-3.5 w-3.5 text-muted-foreground/50 mb-1" />
          <p className={cn("text-sm font-bold tabular-nums", dueCards.length > 0 ? "text-amber-400" : "text-success")}>
            {dueCards.length}
          </p>
          <p className="text-[10px] text-muted-foreground">to review</p>
        </div>
      </div>

      {/* All courses quick-switch */}
      {courses.length > 1 && (
        <div className="border-t border-border/40 pt-2.5">
          <p className="mb-1.5 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground/50">
            All courses
          </p>
          <div className="flex flex-wrap gap-1.5">
            {courses.map((c) => {
              const r = getReadinessScore(c, flashcards, deadlines);
              return (
                <div
                  key={c.id}
                  className="flex items-center gap-1.5 rounded-lg border border-border/40 bg-muted/20 px-2 py-1"
                >
                  <span className="h-2 w-2 rounded-full" style={{ backgroundColor: c.color }} />
                  <span className="text-[10px] font-medium text-muted-foreground truncate max-w-[80px]">{c.name}</span>
                  {r.score >= 60 ? (
                    <CheckCircle2 className="h-3 w-3 text-success shrink-0" />
                  ) : (
                    <span className={cn("text-[9px] font-bold", r.color)}>{r.score}%</span>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
