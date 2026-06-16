"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Brain, Check, Flame, Loader2, Plus, Trash2, X } from "lucide-react";

import { createHabit, deleteHabit, toggleHabitToday } from "@/lib/actions/habits";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { cn } from "@/lib/utils";

type HabitRow = {
  id: string;
  name: string;
  color: string;
  logDates: boolean[];
};

function getStreak(logDates: boolean[]): number {
  let streak = 0;
  for (let i = logDates.length - 1; i >= 0; i--) {
    if (logDates[i]) streak++;
    else break;
  }
  return streak;
}

function getTotalDone(logDates: boolean[]): number {
  return logDates.filter(Boolean).length;
}

export function HabitsPanel({
  habits: initial,
  days,
}: {
  habits: HabitRow[];
  days: number;
}) {
  const router = useRouter();
  const [habits, setHabits] = useState(initial);
  const [addOpen, setAddOpen] = useState(false);
  const [pending, startTransition] = useTransition();
  const todayIndex = days - 1;

  async function handleToggle(habitId: string) {
    setHabits((prev) =>
      prev.map((h) => {
        if (h.id !== habitId) return h;
        const newDates = [...h.logDates];
        newDates[todayIndex] = !newDates[todayIndex];
        return { ...h, logDates: newDates };
      })
    );
    startTransition(async () => {
      const res = await toggleHabitToday(habitId);
      if (res.error) {
        toast.error("Failed to update habit");
        setHabits(initial);
      } else {
        router.refresh();
      }
    });
  }

  async function handleDelete(habitId: string, name: string) {
    setHabits((prev) => prev.filter((h) => h.id !== habitId));
    startTransition(async () => {
      const res = await deleteHabit(habitId);
      if (res.error) {
        toast.error("Failed to delete habit");
        router.refresh();
      } else {
        toast.success(`"${name}" removed`);
      }
    });
  }

  async function handleCreate(fd: FormData) {
    const res = await createHabit(fd);
    if (res.error) {
      toast.error(res.error);
    } else {
      toast.success("Habit added");
      setAddOpen(false);
      router.refresh();
    }
  }

  const [insights, setInsights] = useState<string | null>(null);
  const [insightLoading, setInsightLoading] = useState(false);
  const totalDoneToday = habits.filter((h) => h.logDates[todayIndex]).length;

  async function fetchInsights() {
    setInsightLoading(true);
    try {
      const res = await fetch("/api/ai/habit-insights", { method: "POST" });
      const data = await res.json();
      setInsights(data.insights ?? "No insights returned.");
    } catch {
      setInsights("Could not load insights. Try again.");
    } finally {
      setInsightLoading(false);
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-3">
          <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-warning/10">
            <Flame className="h-5 w-5 text-warning" />
          </div>
          <div>
            <p className="text-sm font-semibold text-foreground">
              {totalDoneToday} / {habits.length} done today
            </p>
            <p className="text-xs text-muted-foreground">
              {habits.length === 0 ? "Add your first habit" : "Keep the streak alive"}
            </p>
          </div>
        </div>
        <div className="flex gap-2">
          {habits.length > 0 && (
            <Button size="sm" variant="outline" className="gap-2" onClick={fetchInsights} disabled={insightLoading}>
              {insightLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Brain className="h-4 w-4" />}
              AI Insights
            </Button>
          )}
          <Button size="sm" className="gap-2" onClick={() => setAddOpen(true)}>
            <Plus className="h-4 w-4" />
            Add habit
          </Button>
        </div>
      </div>

      {/* AI Insights panel */}
      {insights && (
        <div className="relative rounded-xl border border-accent/30 bg-accent/5 p-4">
          <button
            onClick={() => setInsights(null)}
            className="absolute right-3 top-3 rounded-full p-0.5 text-muted-foreground/40 hover:text-muted-foreground"
          >
            <X className="h-4 w-4" />
          </button>
          <div className="flex items-start gap-3">
            <Brain className="mt-0.5 h-4 w-4 shrink-0 text-accent" />
            <p className="text-sm leading-relaxed text-foreground/90 whitespace-pre-wrap pr-4">{insights}</p>
          </div>
        </div>
      )}

      {habits.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-border bg-muted/20 px-6 py-12 text-center">
          <Flame className="mx-auto h-10 w-10 text-muted-foreground/40" />
          <p className="mt-3 text-sm font-medium text-muted-foreground">No habits yet</p>
          <p className="mt-1 text-xs text-muted-foreground/60">
            Morning devotion, DSA practice, gym. Build consistency one day at a time.
          </p>
          <Button size="sm" className="mt-4 gap-2" onClick={() => setAddOpen(true)}>
            <Plus className="h-4 w-4" />
            Add first habit
          </Button>
        </div>
      ) : (
        <div className="space-y-3">
          {habits.map((habit) => {
            const streak = getStreak(habit.logDates);
            const total = getTotalDone(habit.logDates);
            const doneToday = habit.logDates[todayIndex];

            return (
              <Card key={habit.id} className="border-border/70 bg-card/80 overflow-hidden">
                <CardContent className="p-4">
                  {/* Top row: check + name + delete */}
                  <div className="flex items-center gap-3">
                    <button
                      type="button"
                      onClick={() => handleToggle(habit.id)}
                      className={cn(
                        "flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border-2 transition-all duration-200",
                        doneToday
                          ? "border-transparent text-white shadow-md"
                          : "border-border bg-background hover:border-accent/50"
                      )}
                      style={doneToday ? { backgroundColor: habit.color } : {}}
                    >
                      {doneToday ? (
                        <Check className="h-4 w-4" />
                      ) : (
                        <div className="h-2.5 w-2.5 rounded-full" style={{ backgroundColor: habit.color }} />
                      )}
                    </button>

                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <p className="font-semibold text-sm">{habit.name}</p>
                        {streak > 0 && (
                          <span className="inline-flex items-center gap-0.5 rounded-full bg-warning/10 px-1.5 py-0.5 text-[10px] font-bold text-warning">
                            <Flame className="h-2.5 w-2.5" />
                            {streak}
                          </span>
                        )}
                      </div>
                      <p className="mt-0.5 text-[11px] text-muted-foreground">
                        {total}/{days} days · {streak > 0 ? `${streak}-day streak` : "No streak yet"}
                      </p>
                    </div>

                    <button
                      type="button"
                      onClick={() => handleDelete(habit.id, habit.name)}
                      className="rounded-lg p-1.5 text-muted-foreground/30 transition-colors hover:bg-danger/10 hover:text-danger"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </button>
                  </div>

                  {/* Heatmap: full 28-day grid */}
                  <HeatmapRow logDates={habit.logDates} color={habit.color} />
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}

      <AddHabitDialog
        open={addOpen}
        onClose={() => setAddOpen(false)}
        onSubmit={handleCreate}
        pending={pending}
      />
    </div>
  );
}

function HeatmapRow({ logDates, color }: { logDates: boolean[]; color: string }) {
  return (
    <div className="mt-3 flex items-center gap-0.5 overflow-x-auto pb-0.5">
      {logDates.map((done, i) => (
        <div
          key={i}
          className={cn(
            "h-2.5 w-2.5 shrink-0 rounded-sm transition-opacity",
            done ? "opacity-100" : "opacity-[0.08]"
          )}
          style={{ backgroundColor: color }}
          title={`Day ${i + 1}`}
        />
      ))}
    </div>
  );
}

function AddHabitDialog({
  open,
  onClose,
  onSubmit,
  pending,
}: {
  open: boolean;
  onClose: () => void;
  onSubmit: (fd: FormData) => Promise<void>;
  pending: boolean;
}) {
  return (
    <Dialog open={open} onOpenChange={(v) => !v && onClose()}>
      <DialogContent className="max-w-sm">
        <DialogHeader>
          <DialogTitle>New habit</DialogTitle>
        </DialogHeader>
        <form
          onSubmit={(e) => {
            e.preventDefault();
            onSubmit(new FormData(e.currentTarget));
          }}
          className="space-y-4"
        >
          <div className="space-y-1.5">
            <Label>Habit name</Label>
            <Input
              name="name"
              placeholder="Morning devotion, DSA practice, Gym..."
              required
              autoFocus
            />
          </div>
          <div className="space-y-1.5">
            <Label>Colour</Label>
            <div className="flex items-center gap-3">
              <Input
                name="color"
                type="color"
                defaultValue="#3b82f6"
                className="h-10 w-16 cursor-pointer rounded-lg border border-border p-1"
              />
              <span className="text-xs text-muted-foreground">Used for your heatmap and streak</span>
            </div>
          </div>
          <DialogFooter>
            <Button type="button" variant="ghost" onClick={onClose}>
              Cancel
            </Button>
            <Button type="submit" disabled={pending} className="gap-2">
              {pending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Plus className="h-4 w-4" />}
              Add habit
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
