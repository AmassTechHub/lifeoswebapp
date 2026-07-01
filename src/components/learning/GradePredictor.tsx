"use client";

import { useEffect, useState } from "react";
import { Brain, ChevronDown, ChevronUp, Loader2, Target, TrendingUp, Zap } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { cn } from "@/lib/utils";

type CoursePredictor = {
  courseId: string;
  courseName: string;
  courseColor: string;
  flashcardAccuracy: number | null; // 0-100
  cardsReviewed: number;
  totalCards: number;
  daysUntilExam: number | null;
  studySessionsLast7: number;
  predictedGrade: string;
  predictedScore: number;
  confidence: "high" | "medium" | "low";
  recommendation: string;
  needsAttention: boolean;
};

type PredictorData = {
  courses: CoursePredictor[];
  overallProjection: string;
};

const GRADE_COLOR: Record<string, string> = {
  A: "text-success", "B+": "text-accent", B: "text-accent",
  "C+": "text-warning", C: "text-warning", D: "text-orange-400",
  F: "text-danger",
};

const CONFIDENCE_LABEL: Record<string, string> = {
  high: "High confidence",
  medium: "Moderate confidence",
  low: "Low data — add more study sessions",
};

export function GradePredictor({ courseId }: { courseId?: string }) {
  const [data, setData] = useState<PredictorData | null>(null);
  const [loading, setLoading] = useState(true);
  const [expanded, setExpanded] = useState(false);

  useEffect(() => {
    fetch("/api/study/grade-predictor")
      .then(r => r.json())
      .then(d => setData(d))
      .catch(() => null)
      .finally(() => setLoading(false));
  }, []);

  if (loading) {
    return (
      <div className="flex items-center gap-2 rounded-xl border border-border/50 bg-card/60 px-4 py-3">
        <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
        <p className="text-sm text-muted-foreground">Calculating grade predictions…</p>
      </div>
    );
  }

  if (!data || data.courses.length === 0) return null;

  const filtered = courseId ? data.courses.filter(c => c.courseId === courseId) : data.courses;
  if (filtered.length === 0) return null;

  const attentionCourses = filtered.filter(c => c.needsAttention);

  return (
    <Card className="border-border/70 bg-card/80">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2 text-base">
            <Brain className="h-5 w-5 text-purple-500" />
            Grade Predictor
          </CardTitle>
          <button
            type="button"
            onClick={() => setExpanded(v => !v)}
            className="rounded-lg p-1.5 text-muted-foreground hover:bg-muted/50 hover:text-foreground"
          >
            {expanded ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
          </button>
        </div>

        {/* Summary row */}
        <div className="mt-2 flex flex-wrap items-center gap-2">
          {attentionCourses.length > 0 && (
            <div className="flex items-center gap-1.5 rounded-full border border-amber-500/30 bg-amber-500/10 px-2.5 py-1 text-[11px] font-semibold text-amber-400">
              <Zap className="h-3 w-3" />
              {attentionCourses.length} course{attentionCourses.length !== 1 ? "s" : ""} need attention
            </div>
          )}
          {data.overallProjection && (
            <div className="flex items-center gap-1.5 rounded-full border border-accent/20 bg-accent/5 px-2.5 py-1 text-[11px] font-medium text-accent">
              <TrendingUp className="h-3 w-3" />
              {data.overallProjection}
            </div>
          )}
        </div>
      </CardHeader>

      {expanded && (
        <CardContent className="space-y-3 pt-0">
          {filtered.map(c => (
            <div
              key={c.courseId}
              className={cn(
                "rounded-xl border p-3 space-y-2",
                c.needsAttention ? "border-amber-500/25 bg-amber-500/5" : "border-border/50 bg-muted/20"
              )}
            >
              <div className="flex items-center justify-between gap-2">
                <div className="flex items-center gap-2 min-w-0">
                  <span className="h-2.5 w-2.5 shrink-0 rounded-full" style={{ backgroundColor: c.courseColor }} />
                  <p className="truncate text-sm font-medium text-foreground">{c.courseName}</p>
                </div>
                <div className="flex shrink-0 items-center gap-2">
                  <span className={cn("text-lg font-bold", GRADE_COLOR[c.predictedGrade] ?? "text-foreground")}>
                    {c.predictedGrade}
                  </span>
                  <span className="text-xs text-muted-foreground">~{c.predictedScore}%</span>
                </div>
              </div>

              {/* Prediction bar */}
              <div className="space-y-1">
                <div className="h-2 w-full overflow-hidden rounded-full bg-muted/40">
                  <div
                    className={cn("h-full rounded-full transition-all",
                      c.predictedScore >= 70 ? "bg-success" :
                      c.predictedScore >= 60 ? "bg-accent" :
                      c.predictedScore >= 50 ? "bg-warning" : "bg-danger"
                    )}
                    style={{ width: `${Math.min(c.predictedScore, 100)}%` }}
                  />
                </div>
                <div className="flex justify-between text-[10px] text-muted-foreground/60">
                  <span>{CONFIDENCE_LABEL[c.confidence]}</span>
                  {c.daysUntilExam !== null && (
                    <span>{c.daysUntilExam === 0 ? "Exam today" : `Exam in ${c.daysUntilExam}d`}</span>
                  )}
                </div>
              </div>

              {/* Stats */}
              <div className="flex flex-wrap gap-3 text-[11px] text-muted-foreground">
                {c.flashcardAccuracy !== null && (
                  <span className="flex items-center gap-1">
                    <Target className="h-3 w-3" />
                    {c.flashcardAccuracy}% flashcard accuracy
                  </span>
                )}
                <span>{c.studySessionsLast7} session{c.studySessionsLast7 !== 1 ? "s" : ""} this week</span>
                <span>{c.cardsReviewed} cards reviewed</span>
              </div>

              {/* Recommendation */}
              <div className={cn(
                "flex items-start gap-1.5 rounded-lg px-2.5 py-2",
                c.needsAttention ? "bg-amber-500/10 text-amber-400" : "bg-accent/5 text-accent"
              )}>
                <Zap className="mt-0.5 h-3 w-3 shrink-0" />
                <p className="text-[11px]">{c.recommendation}</p>
              </div>
            </div>
          ))}
        </CardContent>
      )}
    </Card>
  );
}
