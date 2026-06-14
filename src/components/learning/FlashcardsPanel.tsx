"use client";

import { useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { toast } from "sonner";
import { Layers, Loader2, Play, Plus, RotateCcw, Trash2 } from "lucide-react";

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
};

export function FlashcardsPanel({
  cards,
  courseId,
  courseName,
}: {
  cards: Flashcard[];
  courseId?: string;
  courseName?: string;
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [reviewIdx, setReviewIdx] = useState(0);
  const [flipped, setFlipped] = useState(false);
  const [shuffled, setShuffled] = useState(cards);

  const deck = useMemo(() => shuffled, [shuffled]);
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

  return (
    <div className="space-y-6">
      <Card className="border-border/70 bg-card/80">
        <CardHeader>
          <div className="flex items-center justify-between gap-2">
            <CardTitle className="flex items-center gap-2 text-base">
              <Layers className="h-4 w-4 text-accent" />
              Flashcards
              {courseName && (
                <span className="text-sm font-normal text-muted-foreground">
                  · {courseName}
                </span>
              )}
            </CardTitle>
            {courseId && deck.length > 0 && (
              <Link
                href={`/session/${courseId}`}
                className="flex items-center gap-1.5 rounded-lg bg-accent px-3 py-1.5 text-[12px] font-semibold text-white transition-opacity hover:opacity-90"
              >
                <Play className="h-3 w-3" />
                Study session
              </Link>
            )}
          </div>
        </CardHeader>
        <CardContent>
          {deck.length === 0 ? (
            <p className="text-sm text-muted-foreground">
              Add cards below, then flip through them to revise before exams.
            </p>
          ) : (
            <div className="space-y-4">
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
                <p className="mt-4 text-xs text-muted-foreground">Tap to flip</p>
              </button>
              <div className="flex flex-wrap items-center justify-between gap-2">
                <p className="text-xs text-muted-foreground">
                  {reviewIdx + 1} / {deck.length}
                </p>
                <div className="flex gap-2">
                  <Button type="button" variant="outline" size="sm" onClick={reshuffle}>
                    <RotateCcw className="mr-1 h-3.5 w-3.5" />
                    Shuffle
                  </Button>
                  <Button type="button" size="sm" onClick={nextCard}>
                    Next card
                  </Button>
                </div>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      <div className="grid gap-4 lg:grid-cols-2">
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
                {pending ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <Plus className="h-4 w-4" />
                )}
                Add card
              </Button>
            </form>
          </CardContent>
        </Card>

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
                  <div className="min-w-0">
                    <p className="truncate text-sm font-medium">{c.front}</p>
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
