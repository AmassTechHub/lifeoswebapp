"use client";

import { useState, useCallback, useRef } from "react";
import Link from "next/link";
import { motion, AnimatePresence } from "framer-motion";
import {
  ArrowLeft,
  BookOpen,
  Check,
  ChevronRight,
  Loader2,
  MessageSquare,
  RefreshCw,
  SendHorizonal,
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

  // Concept chat
  const [chatInput, setChatInput] = useState("");
  const [chatHistory, setChatHistory] = useState<{ q: string; a: string; loading?: boolean }[]>([]);
  const chatEndRef = useRef<HTMLDivElement>(null);

  async function askConcept(e: React.FormEvent) {
    e.preventDefault();
    const q = chatInput.trim();
    if (!q || chatHistory.some((c) => c.loading)) return;
    setChatInput("");
    setChatHistory((prev) => [...prev, { q, a: "", loading: true }]);
    chatEndRef.current?.scrollIntoView({ behavior: "smooth" });

    try {
      const res = await fetch("/api/study/ask", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ courseId: course.id, question: q }),
      });
      const data = await res.json();
      setChatHistory((prev) =>
        prev.map((item) =>
          item.loading ? { q, a: data.reply ?? "No answer available.", loading: false } : item
        )
      );
    } catch {
      setChatHistory((prev) =>
        prev.map((item) =>
          item.loading ? { q, a: "Could not reach AI. Check your connection.", loading: false } : item
        )
      );
    }
    setTimeout(() => chatEndRef.current?.scrollIntoView({ behavior: "smooth" }), 100);
  }

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

          {/* Concept chat */}
          {hasAiKey && (
            <div className="mt-6 rounded-xl border border-border/60 bg-card/50 px-5 py-4">
              <div className="mb-3 flex items-center gap-2">
                <MessageSquare className="h-3.5 w-3.5 text-accent" />
                <p className="text-[11px] font-semibold uppercase tracking-widest text-muted-foreground/50">
                  Ask anything about this course
                </p>
              </div>

              {chatHistory.length > 0 && (
                <div className="mb-3 max-h-56 space-y-3 overflow-y-auto">
                  {chatHistory.map((item, i) => (
                    <div key={i} className="space-y-1">
                      <p className="text-[12px] font-semibold text-foreground">{item.q}</p>
                      {item.loading ? (
                        <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                          <Loader2 className="h-3 w-3 animate-spin" />
                          Thinking...
                        </div>
                      ) : (
                        <p className="text-[12px] leading-relaxed text-muted-foreground">
                          {item.a}
                        </p>
                      )}
                    </div>
                  ))}
                  <div ref={chatEndRef} />
                </div>
              )}

              <form onSubmit={askConcept} className="flex gap-2">
                <input
                  type="text"
                  value={chatInput}
                  onChange={(e) => setChatInput(e.target.value)}
                  placeholder="Explain binary trees. What is time complexity of quicksort?"
                  className="flex-1 rounded-lg border border-border bg-muted/50 px-3 py-2 text-[13px] text-foreground outline-none placeholder:text-muted-foreground/40 focus:border-accent focus:ring-1 focus:ring-accent/15"
                />
                <button
                  type="submit"
                  disabled={!chatInput.trim() || chatHistory.some((c) => c.loading)}
                  className="flex items-center gap-1.5 rounded-lg bg-accent px-3 py-2 text-[12px] font-semibold text-white transition-opacity disabled:opacity-40"
                >
                  <SendHorizonal className="h-3.5 w-3.5" />
                </button>
              </form>
            </div>
          )}

          <div className="mt-6 flex gap-3">
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
