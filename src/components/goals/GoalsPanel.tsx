"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import {
  Check,
  ChevronDown,
  ChevronRight,
  Loader2,
  Plus,
  Target,
  Trash2,
} from "lucide-react";

import { createGoal, deleteGoal, toggleGoalComplete } from "@/lib/actions/goals";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { cn } from "@/lib/utils";

type Goal = {
  id: string;
  title: string;
  description: string | null;
  level: string;
  completed: boolean;
};

const LEVELS = [
  {
    id: "VISION",
    label: "Vision",
    emoji: "🔭",
    desc: "Where you're going in life",
    color: "text-violet-500",
    bg: "bg-violet-500/10",
    border: "border-violet-500/20",
    dot: "bg-violet-500",
  },
  {
    id: "ANNUAL",
    label: "Annual",
    emoji: "🗓️",
    desc: "This year's big wins",
    color: "text-blue-500",
    bg: "bg-blue-500/10",
    border: "border-blue-500/20",
    dot: "bg-blue-500",
  },
  {
    id: "QUARTERLY",
    label: "Quarterly",
    emoji: "📅",
    desc: "Next 90 days",
    color: "text-cyan-500",
    bg: "bg-cyan-500/10",
    border: "border-cyan-500/20",
    dot: "bg-cyan-500",
  },
  {
    id: "MONTHLY",
    label: "Monthly",
    emoji: "📆",
    desc: "This month",
    color: "text-emerald-500",
    bg: "bg-emerald-500/10",
    border: "border-emerald-500/20",
    dot: "bg-emerald-500",
  },
  {
    id: "WEEKLY",
    label: "Weekly",
    emoji: "🎯",
    desc: "This week",
    color: "text-warning",
    bg: "bg-warning/10",
    border: "border-warning/20",
    dot: "bg-warning",
  },
  {
    id: "DAILY",
    label: "Daily",
    emoji: "✅",
    desc: "Today's focus",
    color: "text-success",
    bg: "bg-success/10",
    border: "border-success/20",
    dot: "bg-success",
  },
];

export function GoalsPanel({ goals: initial }: { goals: Goal[] }) {
  const router = useRouter();
  const [goals, setGoals] = useState(initial);
  const [addOpen, setAddOpen] = useState(false);
  const [pending, startTransition] = useTransition();
  const [collapsed, setCollapsed] = useState<Record<string, boolean>>({});

  function toggleLevel(level: string) {
    setCollapsed((prev) => ({ ...prev, [level]: !prev[level] }));
  }

  async function handleToggle(id: string) {
    setGoals((prev) =>
      prev.map((g) => (g.id === id ? { ...g, completed: !g.completed } : g))
    );
    startTransition(async () => {
      const res = await toggleGoalComplete(id);
      if (res.error) {
        toast.error("Failed to update goal");
        router.refresh();
      } else {
        router.refresh();
      }
    });
  }

  async function handleDelete(id: string) {
    setGoals((prev) => prev.filter((g) => g.id !== id));
    startTransition(async () => {
      const res = await deleteGoal(id);
      if (res.error) {
        toast.error("Failed to delete goal");
        router.refresh();
      } else {
        toast.success(`Goal deleted`);
      }
    });
  }

  async function handleCreate(fd: FormData) {
    const res = await createGoal(fd);
    if (res.error) {
      toast.error(res.error);
    } else {
      toast.success("Goal added");
      setAddOpen(false);
      router.refresh();
    }
  }

  const totalGoals = goals.length;
  const doneGoals = goals.filter((g) => g.completed).length;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          {totalGoals > 0 && (
            <>
              <span className="text-sm text-muted-foreground">
                {doneGoals} / {totalGoals} complete
              </span>
              <div className="h-1.5 w-24 rounded-full bg-muted overflow-hidden">
                <div
                  className="h-full rounded-full bg-accent transition-all duration-500"
                  style={{ width: `${(doneGoals / totalGoals) * 100}%` }}
                />
              </div>
            </>
          )}
        </div>
        <Button size="sm" className="gap-2" onClick={() => setAddOpen(true)}>
          <Plus className="h-4 w-4" />
          Add goal
        </Button>
      </div>

      <div className="space-y-4">
        {LEVELS.map((level) => {
          const levelGoals = goals.filter((g) => g.level === level.id);
          if (levelGoals.length === 0) return null;

          const done = levelGoals.filter((g) => g.completed).length;
          const isCollapsed = collapsed[level.id];

          return (
            <div key={level.id} className={cn("rounded-2xl border", level.border)}>
              <button
                type="button"
                onClick={() => toggleLevel(level.id)}
                className="flex w-full items-center gap-3 px-4 py-3"
              >
                <span className="text-lg">{level.emoji}</span>
                <div className="flex-1 text-left">
                  <div className="flex items-center gap-2">
                    <span className={cn("text-sm font-semibold", level.color)}>
                      {level.label}
                    </span>
                    <span className="text-xs text-muted-foreground">{level.desc}</span>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <span className={cn("rounded-full px-2 py-0.5 text-[10px] font-semibold", level.bg, level.color)}>
                    {done}/{levelGoals.length}
                  </span>
                  {isCollapsed ? (
                    <ChevronRight className="h-4 w-4 text-muted-foreground" />
                  ) : (
                    <ChevronDown className="h-4 w-4 text-muted-foreground" />
                  )}
                </div>
              </button>

              {!isCollapsed && (
                <div className="border-t border-border/50 px-4 py-3 space-y-2">
                  {levelGoals.map((goal) => (
                    <GoalRow
                      key={goal.id}
                      goal={goal}
                      level={level}
                      onToggle={() => handleToggle(goal.id)}
                      onDelete={() => handleDelete(goal.id)}
                    />
                  ))}
                </div>
              )}
            </div>
          );
        })}

        {goals.length === 0 && (
          <div className="rounded-2xl border border-dashed border-border bg-muted/20 px-6 py-12 text-center">
            <Target className="mx-auto h-10 w-10 text-muted-foreground/40" />
            <p className="mt-3 text-sm font-medium text-muted-foreground">No goals yet</p>
            <p className="mt-1 text-xs text-muted-foreground/60">
              Start with a vision, then break it down to what you do this week.
            </p>
            <Button size="sm" className="mt-4 gap-2" onClick={() => setAddOpen(true)}>
              <Plus className="h-4 w-4" />
              Add first goal
            </Button>
          </div>
        )}
      </div>

      <AddGoalDialog
        open={addOpen}
        onClose={() => setAddOpen(false)}
        onSubmit={handleCreate}
        pending={pending}
      />
    </div>
  );
}

function GoalRow({
  goal,
  level,
  onToggle,
  onDelete,
}: {
  goal: Goal;
  level: (typeof LEVELS)[number];
  onToggle: () => void;
  onDelete: () => void;
}) {
  return (
    <div className="group flex items-start gap-3 rounded-xl px-3 py-2.5 transition-colors hover:bg-muted/40">
      <button
        type="button"
        onClick={onToggle}
        className={cn(
          "mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full border-2 transition-all",
          goal.completed
            ? `border-transparent ${level.bg}`
            : "border-border hover:border-accent"
        )}
      >
        {goal.completed && <Check className={cn("h-3 w-3", level.color)} />}
      </button>
      <div className="flex-1 min-w-0">
        <p className={cn("text-sm font-medium", goal.completed && "line-through text-muted-foreground")}>
          {goal.title}
        </p>
        {goal.description && (
          <p className="mt-0.5 text-xs text-muted-foreground line-clamp-2">{goal.description}</p>
        )}
      </div>
      <button
        type="button"
        onClick={onDelete}
        className="shrink-0 rounded-md p-1 text-transparent transition-all group-hover:text-muted-foreground/40 hover:text-danger! hover:bg-danger/10"
      >
        <Trash2 className="h-3.5 w-3.5" />
      </button>
    </div>
  );
}

function AddGoalDialog({
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
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>New goal</DialogTitle>
        </DialogHeader>
        <form
          onSubmit={(e) => {
            e.preventDefault();
            onSubmit(new FormData(e.currentTarget));
          }}
          className="space-y-4"
        >
          <div className="space-y-1.5">
            <Label>What are you working toward?</Label>
            <Input name="title" placeholder="e.g. Graduate with First Class honors" required autoFocus />
          </div>
          <div className="space-y-1.5">
            <Label>Level</Label>
            <select
              name="level"
              className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm focus:border-accent focus:outline-none focus:ring-2 focus:ring-accent/20"
              defaultValue="WEEKLY"
            >
              {LEVELS.map((l) => (
                <option key={l.id} value={l.id}>
                  {l.emoji} {l.label}: {l.desc}
                </option>
              ))}
            </select>
          </div>
          <div className="space-y-1.5">
            <Label>Details (optional)</Label>
            <Textarea name="description" placeholder="Why this matters, milestones, notes..." rows={3} />
          </div>
          <DialogFooter>
            <Button type="button" variant="ghost" onClick={onClose}>
              Cancel
            </Button>
            <Button type="submit" disabled={pending} className="gap-2">
              {pending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Plus className="h-4 w-4" />}
              Add goal
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
