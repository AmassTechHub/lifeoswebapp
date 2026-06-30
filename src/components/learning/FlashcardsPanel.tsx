"use client";

import { useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { toast } from "sonner";
import {
  AlertCircle, CheckCircle2, GraduationCap, Layers,
  Loader2, Play, Plus, RotateCcw, Trash2, Trophy,
} from "lucide-react";

import { createFlashcard, deleteFlashcard } from "@/lib/actions/flashcards";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { cn } from "@/lib/utils";

type Flashcard = {
  id: string;
  front: string;
  back: string;
  courseId: string | null;
  difficulty: number;
  reviewCount: number;
  nextReviewAt: Date | string | null;
};

function isDue(card: Flashcard): boolean {
  if (!card.nextReviewAt) return true;
  return new Date(card.nextReviewAt as string) <= new Date();
}

const DIFFICULTY_LABELS = ["New", "Easy", "Medium", "Hard"];
const DIFFICULTY_COLORS = ["text-muted-foreground", "text-success", "text-warning", "text-danger"];

// SM-2 quality buttons shown after flipping in review mode
const QUALITY_BUTTONS = [
  { quality: 1, label: "Again",  sub: "< 1 day",  cls: "border-danger/40  bg-danger/10  text-danger  hover:bg-danger/20" },
  { quality: 3, label: "Hard",   sub: "~2 days",  cls: "border-orange-500/40 bg-orange-500/10 text-orange-400 hover:bg-orange-500/20" },
  { quality: 4, label: "Good",   sub: "~4 days",  cls: "border-accent/40  bg-accent/10   text-accent  hover:bg-accent/20" },
  { quality: 5, label: "Easy",   sub: "~7+ days", cls: "border-success/40 bg-success/10  text-success hover:bg-success/20" },
];

export function FlashcardsPanel({
  cards,
  courseId,
  courseName,
  onRequestExamPrep,
}: {
  cards: Flashcard[];
  courseId?: string;
  courseName?: string;
  onRequestExamPrep?: () => void;
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [mode, setMode] = useState<"all" | "due">("all");
  const [reviewIdx, setReviewIdx] = useState(0);
  const [flipped, setFlipped] = useState(false);
  const [shuffled, setShuffled] = useState(cards);
  const [reviewing, setReviewing] = useState(false);
  const [sessionStats, setSessionStats] = useState({ again: 0, hard: 0, good: 0, easy: 0, total: 0 });
  const [sessionDone, setSessionDone] = useState(false);

  const dueCards = useMemo(() => cards.filter(isDue), [cards]);
  const deck = mode === "due" ? dueCards : shuffled;
  const current = deck[reviewIdx];

  function reshuffle() {
    setShuffled([...cards].sort(() => Math.random() - 0.5));
    setReviewIdx(0);
    setFlipped(false);
    setSessionDone(false);
    setSessionStats({ again: 0, hard: 0, good: 0, easy: 0, total: 0 });
  }

  function nextCard() {
    setFlipped(false);
    const next = reviewIdx + 1;
    if (mode === "due" && next >= deck.length) {
      setSessionDone(true);
    } else {
      setReviewIdx(next % Math.max(deck.length, 1));
    }
  }

  async function handleReview(quality: number) {
    if (!current || reviewing) return;
    setReviewing(true);
    try {
      await fetch("/api/flashcards/review", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: current.id, quality }),
      });

      const label = quality <= 1 ? "again" : quality === 3 ? "hard" : quality === 4 ? "good" : "easy";
      setSessionStats((s) => ({ ...s, [label]: s[label as keyof typeof s] + 1, total: s.total + 1 }));

      if (quality <= 2) {
        toast("Scheduled for tomorrow", { icon: "🔁" });
      } else {
        const xp = quality === 5 ? 3 : 2;
        toast.success(`+${xp} XP`);
      }
      router.refresh();
    } catch {
      toast.error("Could not save review");
    } finally {
      setReviewing(false);
      nextCard();
    }
  }

  // Session complete screen
  if (mode === "due" && sessionDone) {
    const { again, hard, good, easy, total } = sessionStats;
    const pct = total > 0 ? Math.round(((good + easy) / total) * 100) : 0;
    return (
      <div className="space-y-6">
        <Card className="border-border/70 bg-card/80">
          <CardContent className="flex flex-col items-center gap-4 py-10 text-center">
            <Trophy className={cn("h-12 w-12", pct >= 80 ? "text-yellow-400" : pct >= 60 ? "text-accent" : "text-muted-foreground/40")} />
            <div>
              <p className="text-xl font-bold">{pct >= 80 ? "Excellent session!" : pct >= 60 ? "Good work!" : "Keep practising"}</p>
              <p className="mt-1 text-sm text-muted-foreground">{total} cards reviewed · {pct}% recalled well</p>
            </div>
            <div className="grid w-full max-w-xs grid-cols-4 gap-2 text-center">
              {[
                { label: "Again", val: again, color: "text-danger" },
                { label: "Hard",  val: hard,  color: "text-orange-400" },
                { label: "Good",  val: good,  color: "text-accent" },
                { label: "Easy",  val: easy,  color: "text-success" },
              ].map(({ label, val, color }) => (
                <div key={label} className="rounded-xl border border-border/50 bg-muted/30 py-2">
                  <p className={cn("text-lg font-bold", color)}>{val}</p>
                  <p className="text-[10px] text-muted-foreground">{label}</p>
                </div>
              ))}
            </div>
            {again > 0 && (
              <p className="text-xs text-muted-foreground">
                {again} card{again !== 1 ? "s" : ""} marked "Again" will appear again tomorrow.
              </p>
            )}
            <Button onClick={() => { setSessionDone(false); setReviewIdx(0); setFlipped(false); setSessionStats({ again: 0, hard: 0, good: 0, easy: 0, total: 0 }); }}>
              <RotateCcw className="mr-1.5 h-4 w-4" /> Review again
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <Card className="border-border/70 bg-card/80">
        <CardHeader>
          <div className="flex flex-wrap items-center justify-between gap-2">
            <CardTitle className="flex items-center gap-2 text-base">
              <Layers className="h-4 w-4 text-accent" />
              Flashcards
              {courseName && (
                <span className="text-sm font-normal text-muted-foreground">· {courseName}</span>
              )}
            </CardTitle>
            <div className="flex flex-wrap items-center gap-2">
              <div className="flex rounded-lg border border-border/60 bg-muted/30 p-0.5">
                <button
                  type="button"
                  onClick={() => { setMode("all"); setReviewIdx(0); setFlipped(false); }}
                  className={cn(
                    "rounded-md px-3 py-1 text-xs font-medium transition-all",
                    mode === "all" ? "bg-card text-foreground shadow-sm" : "text-muted-foreground hover:text-foreground"
                  )}
                >
                  All ({cards.length})
                </button>
                <button
                  type="button"
                  onClick={() => { setMode("due"); setReviewIdx(0); setFlipped(false); setSessionDone(false); setSessionStats({ again: 0, hard: 0, good: 0, easy: 0, total: 0 }); }}
                  className={cn(
                    "flex items-center gap-1 rounded-md px-3 py-1 text-xs font-medium transition-all",
                    mode === "due" ? "bg-card text-foreground shadow-sm" : "text-muted-foreground hover:text-foreground"
                  )}
                >
                  Review
                  {dueCards.length > 0 && (
                    <span className="rounded-full bg-warning/25 px-1.5 text-[10px] font-bold text-warning">
                      {dueCards.length}
                    </span>
                  )}
                </button>
              </div>
              {courseId && deck.length > 0 && (
                <Link
                  href={`/session/${courseId}`}
                  className="flex items-center gap-1.5 rounded-lg bg-accent px-3 py-1.5 text-[12px] font-semibold text-white transition-opacity hover:opacity-90"
                >
                  <Play className="h-3 w-3" />
                  Session
                </Link>
              )}
              {onRequestExamPrep && cards.length > 0 && (
                <button
                  type="button"
                  onClick={onRequestExamPrep}
                  className="flex items-center gap-1.5 rounded-lg border border-rose-500/30 bg-rose-500/10 px-3 py-1.5 text-[12px] font-semibold text-rose-500 transition-colors hover:bg-rose-500/20"
                >
                  <GraduationCap className="h-3 w-3" />
                  Exam Quiz
                </button>
              )}
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {mode === "due" && dueCards.length === 0 ? (
            <div className="flex flex-col items-center gap-2 py-8 text-center">
              <CheckCircle2 className="h-8 w-8 text-success/50" />
              <p className="font-medium text-foreground">All caught up!</p>
              <p className="text-sm text-muted-foreground">No cards due today. Come back tomorrow.</p>
            </div>
          ) : deck.length === 0 ? (
            <p className="text-sm text-muted-foreground">Add cards below, then review them before exams.</p>
          ) : (
            <div className="space-y-4">
              {/* Progress bar */}
              {mode === "due" && (
                <div className="space-y-1">
                  <div className="flex justify-between text-xs text-muted-foreground">
                    <span>{reviewIdx} / {deck.length} reviewed</span>
                    {sessionStats.total > 0 && (
                      <span className="text-success">
                        {Math.round(((sessionStats.good + sessionStats.easy) / sessionStats.total) * 100)}% recalled
                      </span>
                    )}
                  </div>
                  <div className="h-1.5 w-full overflow-hidden rounded-full bg-muted/40">
                    <div
                      className="h-full rounded-full bg-accent transition-all duration-300"
                      style={{ width: `${deck.length > 0 ? (reviewIdx / deck.length) * 100 : 0}%` }}
                    />
                  </div>
                </div>
              )}

              {/* Flashcard */}
              <button
                type="button"
                onClick={() => setFlipped((f) => !f)}
                className={cn(
                  "flex min-h-44 w-full flex-col items-center justify-center rounded-2xl border-2 border-dashed p-6 text-center transition-all",
                  flipped ? "border-accent/40 bg-accent/10" : "border-border bg-muted/30 hover:border-accent/30"
                )}
              >
                <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                  {flipped ? "Answer" : "Question"}
                </p>
                <p className="mt-3 text-base font-medium text-foreground sm:text-lg">
                  {flipped ? current?.back : current?.front}
                </p>
                {!flipped && (
                  <p className="mt-4 text-xs text-muted-foreground">Tap to reveal answer</p>
                )}
                {current && current.reviewCount > 0 && (
                  <p className={cn("mt-2 text-[10px] font-semibold", DIFFICULTY_COLORS[current.difficulty])}>
                    {DIFFICULTY_LABELS[current.difficulty]} · {current.reviewCount}× reviewed
                  </p>
                )}
              </button>

              {/* SM-2 quality buttons (shown after flip in review mode) */}
              {mode === "due" && flipped ? (
                <div className="space-y-2">
                  <p className="text-center text-xs text-muted-foreground">How well did you recall this?</p>
                  <div className="grid grid-cols-4 gap-2">
                    {QUALITY_BUTTONS.map(({ quality, label, sub, cls }) => (
                      <button
                        key={quality}
                        type="button"
                        disabled={reviewing}
                        onClick={() => handleReview(quality)}
                        className={cn(
                          "flex flex-col items-center gap-0.5 rounded-xl border px-2 py-2.5 text-xs font-semibold transition-all disabled:opacity-50",
                          cls
                        )}
                      >
                        {reviewing ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : label}
                        <span className="text-[9px] font-normal opacity-70">{sub}</span>
                      </button>
                    ))}
                  </div>
                  <p className="text-center text-[10px] text-muted-foreground/50">
                    SM-2 spaced repetition · next interval calculated by your rating
                  </p>
                </div>
              ) : (
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <p className="text-xs text-muted-foreground">
                    {reviewIdx + 1} / {deck.length}
                  </p>
                  <div className="flex gap-2">
                    {mode === "all" && (
                      <Button type="button" variant="outline" size="sm" onClick={reshuffle}>
                        <RotateCcw className="mr-1 h-3.5 w-3.5" />
                        Shuffle
                      </Button>
                    )}
                    <Button type="button" size="sm" onClick={nextCard}>
                      {mode === "due" ? "Skip" : "Next card"}
                    </Button>
                  </div>
                </div>
              )}

              {/* SM-2 explanation callout */}
              {mode === "due" && !flipped && reviewIdx === 0 && dueCards.length > 0 && (
                <div className="flex items-start gap-2 rounded-xl border border-accent/20 bg-accent/5 px-3 py-2.5">
                  <AlertCircle className="mt-0.5 h-3.5 w-3.5 shrink-0 text-accent" />
                  <p className="text-xs text-muted-foreground">
                    <span className="font-semibold text-foreground">SM-2 spaced repetition:</span> After revealing the answer, rate how well you recalled it. Cards you find hard come back sooner. Easy cards are spaced further apart so you spend time where it matters.
                  </p>
                </div>
              )}
            </div>
          )}
        </CardContent>
      </Card>

      <div className="grid gap-4 lg:grid-cols-2">
        {/* Add card form */}
        <Card className="border-border/70 bg-card/80">
          <CardHeader>
            <CardTitle className="text-base">New flashcard</CardTitle>
          </CardHeader>
          <CardContent>
            <form
              onSubmit={(e) => {
                e.preventDefault();
                const fd = new FormData(e.currentTarget);
                if (courseId) fd.set("courseId", courseId);
                startTransition(async () => {
                  await createFlashcard(fd);
                  (e.target as HTMLFormElement).reset();
                  toast.success("Card added");
                  router.refresh();
                });
              }}
              className="space-y-3"
            >
              <div>
                <Label className="text-xs">Front (question)</Label>
                <Input name="front" className="mt-1" required placeholder="What is a BST?" />
              </div>
              <div>
                <Label className="text-xs">Back (answer)</Label>
                <Textarea name="back" className="mt-1" required rows={3} placeholder="Binary search tree, ordered nodes..." />
              </div>
              <Button type="submit" disabled={pending} className="w-full gap-1">
                {pending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Plus className="h-4 w-4" />}
                Add card
              </Button>
            </form>
          </CardContent>
        </Card>

        {/* Deck list */}
        <Card className="border-border/70 bg-card/80">
          <CardHeader>
            <CardTitle className="text-base">Your deck ({cards.length})</CardTitle>
          </CardHeader>
          <CardContent className="max-h-64 space-y-2 overflow-y-auto">
            {cards.length === 0 ? (
              <p className="text-sm text-muted-foreground">No cards yet.</p>
            ) : (
              cards.map((c) => (
                <div
                  key={c.id}
                  className="flex items-start justify-between gap-2 rounded-lg border border-border/60 px-3 py-2"
                >
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                      <p className="truncate text-sm font-medium">{c.front}</p>
                      {c.reviewCount > 0 && (
                        <span className={cn("shrink-0 text-[10px] font-semibold", DIFFICULTY_COLORS[c.difficulty])}>
                          {DIFFICULTY_LABELS[c.difficulty]}
                        </span>
                      )}
                    </div>
                    <p className="truncate text-xs text-muted-foreground">{c.back}</p>
                  </div>
                  <button
                    type="button"
                    className="shrink-0 text-muted-foreground hover:text-danger"
                    onClick={() =>
                      startTransition(async () => {
                        await deleteFlashcard(c.id);
                        toast.success("Card removed");
                        router.refresh();
                      })
                    }
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>
              ))
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}


type Flashcard = {
  id: string;
  front: string;
  back: string;
  courseId: string | null;
  difficulty: number;
  reviewCount: number;
  nextReviewAt: Date | string | null;
};

function isDue(card: Flashcard): boolean {
  if (!card.nextReviewAt) return true; // never reviewed
  return new Date(card.nextReviewAt as string) <= new Date();
}

const DIFFICULTY_LABELS = ["New", "Easy", "Medium", "Hard"];
const DIFFICULTY_COLORS = ["text-muted-foreground", "text-success", "text-warning", "text-danger"];

export function FlashcardsPanel({
  cards,
  courseId,
  courseName,
  onRequestExamPrep,
}: {
  cards: Flashcard[];
  courseId?: string;
  courseName?: string;
  onRequestExamPrep?: () => void;
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [mode, setMode] = useState<"all" | "due">("all");
  const [reviewIdx, setReviewIdx] = useState(0);
  const [flipped, setFlipped] = useState(false);
  const [shuffled, setShuffled] = useState(cards);
  const [reviewing, setReviewing] = useState(false);

  const dueCards = useMemo(() => cards.filter(isDue), [cards]);
  const deck = mode === "due" ? dueCards : shuffled;
  const current = deck[reviewIdx];

  function reshuffle() {
    setShuffled([...cards].sort(() => Math.random() - 0.5));
    setReviewIdx(0);
    setFlipped(false);
  }

  function nextCard() {
    setFlipped(false);
    setReviewIdx((i) => (i + 1) % Math.max(deck.length, 1));
  }

  async function handleReview(correct: boolean) {
    if (!current || reviewing) return;
    setReviewing(true);
    try {
      await fetch("/api/flashcards/review", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: current.id, correct }),
      });
      toast.success(correct ? "Marked correct +2 XP" : "Marked for review tomorrow");
      router.refresh();
    } catch {
      toast.error("Could not save review");
    } finally {
      setReviewing(false);
      nextCard();
    }
  }

  return (
    <div className="space-y-6">
      <Card className="border-border/70 bg-card/80">
        <CardHeader>
          <div className="flex flex-wrap items-center justify-between gap-2">
            <CardTitle className="flex items-center gap-2 text-base">
              <Layers className="h-4 w-4 text-accent" />
              Flashcards
              {courseName && (
                <span className="text-sm font-normal text-muted-foreground">· {courseName}</span>
              )}
            </CardTitle>
            <div className="flex items-center gap-2">
              {/* Mode toggle */}
              <div className="flex rounded-lg border border-border/60 bg-muted/30 p-0.5">
                <button
                  type="button"
                  onClick={() => { setMode("all"); setReviewIdx(0); setFlipped(false); }}
                  className={cn(
                    "rounded-md px-3 py-1 text-xs font-medium transition-all",
                    mode === "all" ? "bg-card text-foreground shadow-sm" : "text-muted-foreground hover:text-foreground"
                  )}
                >
                  All ({cards.length})
                </button>
                <button
                  type="button"
                  onClick={() => { setMode("due"); setReviewIdx(0); setFlipped(false); }}
                  className={cn(
                    "flex items-center gap-1 rounded-md px-3 py-1 text-xs font-medium transition-all",
                    mode === "due" ? "bg-card text-foreground shadow-sm" : "text-muted-foreground hover:text-foreground"
                  )}
                >
                  Due today
                  {dueCards.length > 0 && (
                    <span className="rounded-full bg-warning/25 px-1.5 text-[10px] font-bold text-warning">
                      {dueCards.length}
                    </span>
                  )}
                </button>
              </div>
              {courseId && deck.length > 0 && (
                <Link
                  href={`/session/${courseId}`}
                  className="flex items-center gap-1.5 rounded-lg bg-accent px-3 py-1.5 text-[12px] font-semibold text-white transition-opacity hover:opacity-90"
                >
                  <Play className="h-3 w-3" />
                  Session
                </Link>
              )}
              {onRequestExamPrep && cards.length > 0 && (
                <button
                  type="button"
                  onClick={onRequestExamPrep}
                  className="flex items-center gap-1.5 rounded-lg border border-rose-500/30 bg-rose-500/10 px-3 py-1.5 text-[12px] font-semibold text-rose-500 transition-colors hover:bg-rose-500/20"
                >
                  <GraduationCap className="h-3 w-3" />
                  Exam Prep Quiz
                </button>
              )}
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {mode === "due" && dueCards.length === 0 ? (
            <div className="flex flex-col items-center gap-2 py-8 text-center">
              <CheckCircle2 className="h-8 w-8 text-success/50" />
              <p className="font-medium text-foreground">All caught up!</p>
              <p className="text-sm text-muted-foreground">No cards are due for review today. Come back tomorrow.</p>
            </div>
          ) : deck.length === 0 ? (
            <p className="text-sm text-muted-foreground">
              Add cards below, then flip through them to revise before exams.
            </p>
          ) : (
            <div className="space-y-4">
              {/* Card */}
              <button
                type="button"
                onClick={() => setFlipped((f) => !f)}
                className={cn(
                  "flex min-h-40 w-full flex-col items-center justify-center rounded-2xl border-2 border-dashed p-6 text-center transition-all",
                  flipped
                    ? "border-accent/40 bg-accent/10"
                    : "border-border bg-muted/30 hover:border-accent/30"
                )}
              >
                <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                  {flipped ? "Answer" : "Question"}
                </p>
                <p className="mt-3 text-lg font-medium text-foreground">
                  {flipped ? current?.back : current?.front}
                </p>
                {!flipped && (
                  <p className="mt-4 text-xs text-muted-foreground">Tap to reveal answer</p>
                )}
                {current && mode === "all" && current.reviewCount > 0 && (
                  <p className={cn("mt-2 text-[10px] font-semibold", DIFFICULTY_COLORS[current.difficulty])}>
                    {DIFFICULTY_LABELS[current.difficulty]} · reviewed {current.reviewCount}×
                  </p>
                )}
              </button>

              {/* Controls */}
              {mode === "due" && flipped ? (
                /* Spaced repetition buttons */
                <div className="flex gap-2">
                  <Button
                    type="button"
                    variant="outline"
                    className="flex-1 gap-1.5 border-danger/40 text-danger hover:bg-danger/10"
                    onClick={() => handleReview(false)}
                    disabled={reviewing}
                  >
                    <XCircle className="h-4 w-4" />
                    Incorrect
                  </Button>
                  <Button
                    type="button"
                    className="flex-1 gap-1.5 bg-success text-white hover:bg-success/90"
                    onClick={() => handleReview(true)}
                    disabled={reviewing}
                  >
                    <CheckCircle2 className="h-4 w-4" />
                    Correct
                  </Button>
                </div>
              ) : (
                /* Standard controls */
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <p className="text-xs text-muted-foreground">
                    {reviewIdx + 1} / {deck.length}
                  </p>
                  <div className="flex gap-2">
                    {mode === "all" && (
                      <Button type="button" variant="outline" size="sm" onClick={reshuffle}>
                        <RotateCcw className="mr-1 h-3.5 w-3.5" />
                        Shuffle
                      </Button>
                    )}
                    <Button type="button" size="sm" onClick={nextCard}>
                      {mode === "due" ? "Skip" : "Next card"}
                    </Button>
                  </div>
                </div>
              )}
            </div>
          )}
        </CardContent>
      </Card>

      <div className="grid gap-4 lg:grid-cols-2">
        {/* Add card form */}
        <Card className="border-border/70 bg-card/80">
          <CardHeader>
            <CardTitle className="text-base">New flashcard</CardTitle>
          </CardHeader>
          <CardContent>
            <form
              onSubmit={(e) => {
                e.preventDefault();
                const fd = new FormData(e.currentTarget);
                if (courseId) fd.set("courseId", courseId);
                startTransition(async () => {
                  await createFlashcard(fd);
                  (e.target as HTMLFormElement).reset();
                  toast.success("Card added");
                  router.refresh();
                });
              }}
              className="space-y-3"
            >
              <div>
                <Label className="text-xs">Front (question)</Label>
                <Input name="front" className="mt-1" required placeholder="What is a BST?" />
              </div>
              <div>
                <Label className="text-xs">Back (answer)</Label>
                <Textarea
                  name="back"
                  className="mt-1"
                  required
                  rows={3}
                  placeholder="Binary search tree, ordered nodes..."
                />
              </div>
              <Button type="submit" disabled={pending} className="w-full gap-1">
                {pending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Plus className="h-4 w-4" />}
                Add card
              </Button>
            </form>
          </CardContent>
        </Card>

        {/* Deck list */}
        <Card className="border-border/70 bg-card/80">
          <CardHeader>
            <CardTitle className="text-base">Your deck ({cards.length})</CardTitle>
          </CardHeader>
          <CardContent className="max-h-64 space-y-2 overflow-y-auto">
            {cards.length === 0 ? (
              <p className="text-sm text-muted-foreground">No cards yet.</p>
            ) : (
              cards.map((c) => (
                <div
                  key={c.id}
                  className="flex items-start justify-between gap-2 rounded-lg border border-border/60 px-3 py-2"
                >
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                      <p className="truncate text-sm font-medium">{c.front}</p>
                      {c.reviewCount > 0 && (
                        <span className={cn("shrink-0 text-[10px] font-semibold", DIFFICULTY_COLORS[c.difficulty])}>
                          {DIFFICULTY_LABELS[c.difficulty]}
                        </span>
                      )}
                    </div>
                    <p className="truncate text-xs text-muted-foreground">{c.back}</p>
                  </div>
                  <button
                    type="button"
                    className="shrink-0 text-muted-foreground hover:text-danger"
                    onClick={() =>
                      startTransition(async () => {
                        await deleteFlashcard(c.id);
                        toast.success("Card removed");
                        router.refresh();
                      })
                    }
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>
              ))
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
