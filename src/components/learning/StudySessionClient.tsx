"use client";

import { useState, useCallback } from "react";
import Link from "next/link";
import { motion, AnimatePresence } from "framer-motion";
import {
  ArrowLeft,
  BookOpen,
  Check,
  ChevronRight,
  Loader2,
  RefreshCw,
  Sparkles,
  X,
} from "lucide-react";

import { cn } from "@/lib/utils";

type Card = {
  id: string;
  front: string;
  back: string;
  difficulty: number;
  reviewCount: number;
};

type Course = {
  id: string;
  name: string;
  code: string | null;
  color: string;
};

type Summary = {
  id: string;
  title: string;
  content: string;
} | null;

type Phase = "prepare" | "quiz" | "results";

export function StudySessionClient({
  course,
  dueCards,
  latestSummary,
  hasAiKey,
}: {
  course: Course;
  dueCards: Card[];
  latestSummary: Summary;
  hasAiKey: boolean;
}) {
  const [phase, setPhase] = useState<Phase>("prepare");
  const [summary, setSummary] = useState(latestSummary);
  const [generatingSummary, setGeneratingSummary] = useState(false);
  const [deck, setDeck] = useState<Card[]>(dueCards);
  const [idx, setIdx] = useState(0);
  const [flipped, setFlipped] = useState(false);
  const [correct, setCorrect] = useState<string[]>([]);
  const [missed, setMissed] = useState<Card[]>([]);
  const [sessionStart] = useState(() => Date.now());
  const [savingAnswer, setSavingAnswer] = useState(false);

  const currentCard = deck[idx];
  const totalCards = deck.length;
  const progress = totalCards > 0 ? ((idx) / totalCards) * 100 : 0;

  async function generateSummary() {
    setGeneratingSummary(true);
    try {
      const res = await fetch("/api/study/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ courseId: course.id, action: "summary" }),
      });
      const data = await res.json();
      if (res.ok && data.content) {
        setSummary({ id: data.noteId, title: "Summary", content: data.content });
      }
    } finally {
      setGeneratingSummary(false);
    }
  }

  const recordAnswer = useCallback(async (cardId: string, wasCorrect: boolean) => {
    setSavingAnswer(true);
    try {
      await fetch("/api/study/session/answer", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ cardId, correct: wasCorrect }),
      });
    } finally {
      setSavingAnswer(false);
    }
  }, []);

  async function handleAnswer(wasCorrect: boolean) {
    if (!currentCard || savingAnswer) return;
    await recordAnswer(currentCard.id, wasCorrect);

    if (wasCorrect) {
      setCorrect((prev) => [...prev, currentCard.id]);
    } else {
      setMissed((prev) => [...prev, currentCard]);
    }

    setFlipped(false);
    if (idx + 1 >= totalCards) {
      setPhase("results");
    } else {
      setIdx((i) => i + 1);
    }
  }

  function reviewMissed() {
    if (missed.length === 0) return;
    setDeck(missed);
    setIdx(0);
    setFlipped(false);
    setCorrect([]);
    setMissed([]);
    setPhase("quiz");
  }

  const durationMins = Math.round((Date.now() - sessionStart) / 60000);

  return (
    <div className="flex min-h-screen flex-col bg-background">
      {/* Top bar */}
      <div className="flex h-14 items-center justify-between border-b border-border/50 px-5">
        <Link
          href="/learning"
          className="flex items-center gap-1.5 text-sm text-muted-foreground transition-colors hover:text-foreground"
        >
          <ArrowLeft className="h-4 w-4" />
          Back to Learning
        </Link>
        <div className="flex items-center gap-2.5">
          <span
            className="h-2.5 w-2.5 rounded-full"
            style={{ backgroundColor: course.color }}
          />
          <span className="text-[13px] font-medium text-foreground">
            {course.name}
            {course.code && (
              <span className="ml-1.5 text-muted-foreground">{course.code}</span>
            )}
          </span>
        </div>
      </div>

      {/* Phase: prepare */}
      {phase === "prepare" && (
        <div className="mx-auto w-full max-w-2xl px-6 py-12">
          <p className="text-[11px] font-semibold uppercase tracking-widest text-muted-foreground/50">
            Study session
          </p>
          <h1 className="mt-2 text-3xl font-bold tracking-tight">{course.name}</h1>

          <div className="mt-8 grid gap-4 sm:grid-cols-2">
            {/* Cards due */}
            <div className="rounded-xl border border-border/60 bg-card/70 px-5 py-4">
              <p className="text-[11px] font-semibold uppercase tracking-widest text-muted-foreground/50">
                Cards due
              </p>
              <p className="mt-1 text-4xl font-bold text-foreground">{totalCards}</p>
              {totalCards === 0 && (
                <p className="mt-1 text-xs text-muted-foreground">
                  All caught up. Come back tomorrow for new reviews.
                </p>
              )}
            </div>

            {/* Summary status */}
            <div className="rounded-xl border border-border/60 bg-card/70 px-5 py-4">
              <p className="text-[11px] font-semibold uppercase tracking-widest text-muted-foreground/50">
                Summary
              </p>
              {summary ? (
                <p className="mt-1 text-sm font-medium text-success">Ready</p>
              ) : hasAiKey ? (
                <button
                  type="button"
                  onClick={generateSummary}
                  disabled={generatingSummary}
                  className="mt-2 flex items-center gap-1.5 text-sm font-medium text-accent hover:underline disabled:opacity-60"
                >
                  {generatingSummary ? (
                    <Loader2 className="h-3.5 w-3.5 animate-spin" />
                  ) : (
                    <Sparkles className="h-3.5 w-3.5" />
                  )}
                  {generatingSummary ? "Generating..." : "Generate with AI"}
                </button>
              ) : (
                <p className="mt-1 text-xs text-muted-foreground">
                  Add an OpenAI key in Settings to enable AI summaries.
                </p>
              )}
            </div>
          </div>

          {/* Summary preview */}
          {summary && (
            <div className="mt-6 max-h-72 overflow-y-auto rounded-xl border border-border/60 bg-card/50 px-5 py-4">
              <div className="flex items-center gap-2 mb-3">
                <BookOpen className="h-3.5 w-3.5 text-accent" />
                <p className="text-[11px] font-semibold uppercase tracking-widest text-muted-foreground/50">
                  Course summary
                </p>
              </div>
              <div className="prose prose-sm prose-neutral dark:prose-invert max-w-none text-sm leading-relaxed text-muted-foreground whitespace-pre-wrap">
                {summary.content}
              </div>
            </div>
          )}

          <div className="mt-8 flex gap-3">
            {totalCards > 0 && (
              <button
                type="button"
                onClick={() => setPhase("quiz")}
                className="flex items-center gap-2 rounded-xl bg-accent px-7 py-3 text-sm font-semibold text-white transition-opacity hover:opacity-90"
              >
                Start quiz
                <ChevronRight className="h-4 w-4" />
              </button>
            )}
            <Link
              href="/learning"
              className="flex items-center rounded-xl border border-border px-5 py-3 text-sm font-medium text-muted-foreground transition-colors hover:text-foreground"
            >
              Back
            </Link>
          </div>
        </div>
      )}

      {/* Phase: quiz */}
      {phase === "quiz" && currentCard && (
        <div className="mx-auto flex w-full max-w-xl flex-1 flex-col px-6 py-10">
          {/* Progress bar */}
          <div className="mb-8">
            <div className="flex items-center justify-between text-[12px] text-muted-foreground">
              <span>
                Card {idx + 1} of {totalCards}
              </span>
              <span>
                {correct.length} correct &middot; {missed.length} missed
              </span>
            </div>
            <div className="mt-2 h-1 w-full rounded-full bg-muted">
              <div
                className="h-1 rounded-full bg-accent transition-all duration-300"
                style={{ width: `${progress}%` }}
              />
            </div>
          </div>

          <AnimatePresence mode="wait">
            <motion.div
              key={`${currentCard.id}-${flipped}`}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -8 }}
              transition={{ duration: 0.18, ease: "easeOut" }}
              className="flex flex-1 flex-col"
            >
              {/* Card */}
              <button
                type="button"
                onClick={() => !flipped && setFlipped(true)}
                className={cn(
                  "flex min-h-56 flex-1 flex-col items-center justify-center rounded-2xl border-2 p-8 text-center transition-all",
                  flipped
                    ? "border-accent/40 bg-accent/5 cursor-default"
                    : "border-border bg-card/60 hover:border-accent/25 hover:bg-muted/30 cursor-pointer"
                )}
              >
                <p
                  className={cn(
                    "mb-3 text-[10px] font-semibold uppercase tracking-widest",
                    flipped ? "text-accent/70" : "text-muted-foreground/50"
                  )}
                >
                  {flipped ? "Answer" : "Question"}
                </p>
                <p className="text-lg font-medium text-foreground leading-relaxed">
                  {flipped ? currentCard.back : currentCard.front}
                </p>
                {!flipped && (
                  <p className="mt-5 text-xs text-muted-foreground/40">
                    Click to reveal answer
                  </p>
                )}
              </button>

              {/* Answer buttons */}
              <AnimatePresence>
                {flipped && (
                  <motion.div
                    initial={{ opacity: 0, y: 8 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.18, delay: 0.05 }}
                    className="mt-5 grid grid-cols-2 gap-3"
                  >
                    <button
                      type="button"
                      disabled={savingAnswer}
                      onClick={() => handleAnswer(false)}
                      className="flex items-center justify-center gap-2 rounded-xl border-2 border-danger/30 bg-danger/5 py-4 text-sm font-semibold text-danger transition-colors hover:bg-danger/10 disabled:opacity-50"
                    >
                      <X className="h-4 w-4" />
                      Missed it
                    </button>
                    <button
                      type="button"
                      disabled={savingAnswer}
                      onClick={() => handleAnswer(true)}
                      className="flex items-center justify-center gap-2 rounded-xl border-2 border-success/30 bg-success/5 py-4 text-sm font-semibold text-success transition-colors hover:bg-success/10 disabled:opacity-50"
                    >
                      <Check className="h-4 w-4" />
                      Got it
                    </button>
                  </motion.div>
                )}
              </AnimatePresence>
            </motion.div>
          </AnimatePresence>
        </div>
      )}

      {/* Phase: results */}
      {phase === "results" && (
        <div className="mx-auto w-full max-w-xl px-6 py-12">
          <p className="text-[11px] font-semibold uppercase tracking-widest text-accent">
            Session complete
          </p>
          <h1 className="mt-2 text-3xl font-bold tracking-tight">
            {correct.length} / {correct.length + missed.length} correct
          </h1>
          <p className="mt-1 text-sm text-muted-foreground">
            {durationMins < 1 ? "Under a minute" : `${durationMins} min`} &middot;{" "}
            {missed.length === 0
              ? "Perfect round."
              : `${missed.length} card${missed.length !== 1 ? "s" : ""} to review.`}
          </p>

          {/* Score bar */}
          <div className="mt-6 h-2 w-full rounded-full bg-muted">
            <div
              className="h-2 rounded-full bg-success transition-all duration-500"
              style={{
                width: `${correct.length + missed.length > 0 ? (correct.length / (correct.length + missed.length)) * 100 : 0}%`,
              }}
            />
          </div>

          {/* Missed cards */}
          {missed.length > 0 && (
            <div className="mt-8 space-y-2">
              <p className="text-[11px] font-semibold uppercase tracking-widest text-muted-foreground/50">
                Review these
              </p>
              {missed.map((c) => (
                <div
                  key={c.id}
                  className="rounded-xl border border-border/60 bg-card/60 px-4 py-3"
                >
                  <p className="text-sm font-medium text-foreground">{c.front}</p>
                  <p className="mt-0.5 text-xs text-muted-foreground">{c.back}</p>
                </div>
              ))}
            </div>
          )}

          <div className="mt-8 flex flex-wrap gap-3">
            {missed.length > 0 && (
              <button
                type="button"
                onClick={reviewMissed}
                className="flex items-center gap-2 rounded-xl bg-accent px-6 py-3 text-sm font-semibold text-white transition-opacity hover:opacity-90"
              >
                <RefreshCw className="h-4 w-4" />
                Review {missed.length} missed
              </button>
            )}
            <Link
              href="/learning"
              className="flex items-center rounded-xl border border-border px-5 py-3 text-sm font-medium text-muted-foreground transition-colors hover:text-foreground"
            >
              Back to Learning
            </Link>
          </div>
        </div>
      )}
    </div>
  );
}
