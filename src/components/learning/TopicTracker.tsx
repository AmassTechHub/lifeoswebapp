"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { BookOpen, Brain, CheckCircle2, Hammer, Loader2, Plus, Sparkles, Trash2, Zap } from "lucide-react";

import { createTopic, deleteTopic, updateTopicProgress } from "@/lib/actions/topics";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";

type Topic = {
  id: string;
  name: string;
  category: string;
  learned: boolean;
  practiced: boolean;
  built: boolean;
  confidence: number; // 0-5
};

// Pre-built category suggestions — users can type their own too
const CATEGORY_SUGGESTIONS = [
  "Programming", "Mathematics", "Science", "Language", "History",
  "Design", "Business", "Music", "Fitness", "Philosophy",
  "Engineering", "Medicine", "Finance", "Art", "General",
];

const CONFIDENCE_LABELS = ["Unknown", "Heard of it", "Know the basics", "Can explain it", "Can apply it", "Mastered"];
const CONFIDENCE_COLORS = [
  "text-muted-foreground/40",
  "text-rose-400",
  "text-orange-400",
  "text-yellow-400",
  "text-emerald-400",
  "text-accent",
];

function ConfidenceDots({ value, onChange }: { value: number; onChange: (v: number) => void }) {
  return (
    <div className="flex items-center gap-0.5">
      {Array.from({ length: 5 }).map((_, i) => (
        <button
          key={i}
          type="button"
          onClick={() => onChange(i + 1 === value ? 0 : i + 1)}
          title={CONFIDENCE_LABELS[i + 1]}
          className={cn(
            "h-2.5 w-2.5 rounded-full transition-all hover:scale-125",
            i < value
              ? CONFIDENCE_COLORS[value].replace("text-", "bg-")
              : "bg-muted/50 hover:bg-muted"
          )}
        />
      ))}
    </div>
  );
}

function TopicRow({ topic }: { topic: Topic }) {
  const router = useRouter();
  const [, startTransition] = useTransition();
  const [optimistic, setOptimistic] = useState(topic);

  function toggle(field: "learned" | "practiced" | "built") {
    const next = { ...optimistic, [field]: !optimistic[field] };
    setOptimistic(next);
    startTransition(async () => {
      await updateTopicProgress(topic.id, { [field]: next[field] });
      router.refresh();
    });
  }

  function setConfidence(v: number) {
    setOptimistic((o) => ({ ...o, confidence: v }));
    startTransition(async () => {
      await updateTopicProgress(topic.id, { confidence: v });
      router.refresh();
    });
  }

  function handleDelete() {
    startTransition(async () => {
      await deleteTopic(topic.id);
      toast.success(`"${topic.name}" removed`);
      router.refresh();
    });
  }

  const doneCount = [optimistic.learned, optimistic.practiced, optimistic.built].filter(Boolean).length;
  const allDone = doneCount === 3;

  return (
    <div
      className={cn(
        "group flex items-center gap-3 rounded-xl border px-3.5 py-3 transition-all",
        allDone
          ? "border-accent/25 bg-accent/5"
          : "border-border/50 bg-card/60 hover:border-border/80"
      )}
    >
      {/* Confidence dots */}
      <div className="shrink-0">
        <ConfidenceDots value={optimistic.confidence} onChange={setConfidence} />
        <p className={cn("mt-0.5 text-[9px] font-medium text-center", CONFIDENCE_COLORS[optimistic.confidence])}>
          {CONFIDENCE_LABELS[optimistic.confidence]}
        </p>
      </div>

      <div className="min-w-0 flex-1">
        <p className={cn("text-sm font-medium truncate", allDone && "text-muted-foreground/60 line-through")}>
          {topic.name}
        </p>
        <p className="text-[10px] text-muted-foreground/50">{topic.category}</p>
      </div>

      {/* L · P · B checkboxes */}
      <div className="flex shrink-0 items-center gap-1">
        {(["learned", "practiced", "built"] as const).map((field, fi) => {
          const icons = [BookOpen, Brain, Hammer];
          const Icon = icons[fi];
          const checked = optimistic[field];
          const labels = ["Learned", "Practiced", "Built something"];
          return (
            <button
              key={field}
              type="button"
              title={labels[fi]}
              onClick={() => toggle(field)}
              className={cn(
                "flex items-center justify-center h-7 w-7 rounded-lg transition-all",
                checked
                  ? "bg-accent/15 text-accent"
                  : "bg-muted/30 text-muted-foreground/30 hover:bg-muted/60 hover:text-muted-foreground"
              )}
            >
              <Icon className="h-3.5 w-3.5" />
            </button>
          );
        })}
      </div>

      {/* Delete — only visible on hover */}
      <button
        type="button"
        onClick={handleDelete}
        className="h-6 w-6 shrink-0 flex items-center justify-center rounded text-muted-foreground/20 opacity-0 transition-all group-hover:opacity-100 hover:text-danger"
      >
        <Trash2 className="h-3.5 w-3.5" />
      </button>
    </div>
  );
}

export function TopicTracker({ topics: initial }: { topics: Topic[] }) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [filter, setFilter] = useState<string>("All");
  const [showForm, setShowForm] = useState(initial.length === 0);
  const [newCategory, setNewCategory] = useState("Programming");

  // Group by category
  const categories = ["All", ...Array.from(new Set(initial.map((t) => t.category))).sort()];
  const filtered = filter === "All" ? initial : initial.filter((t) => t.category === filter);

  // Stats
  const total = initial.length;
  const mastered = initial.filter((t) => t.learned && t.practiced && t.built).length;
  const inProgress = initial.filter(
    (t) => (t.learned || t.practiced || t.built) && !(t.learned && t.practiced && t.built)
  ).length;

  function handleCreate(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);
    fd.set("category", newCategory);
    startTransition(async () => {
      const res = await createTopic(fd);
      if (res?.error) { toast.error(res.error); return; }
      toast.success("Topic added");
      (e.target as HTMLFormElement).reset();
      router.refresh();
    });
  }

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex flex-col gap-3 rounded-2xl border border-accent/20 bg-accent/5 p-4 sm:flex-row sm:items-start">
        <div className="flex items-start gap-3 flex-1">
          <Sparkles className="mt-0.5 h-5 w-5 shrink-0 text-accent" />
          <div>
            <p className="font-semibold text-foreground">Self-learner Topic Tracker</p>
            <p className="mt-1 text-sm text-muted-foreground">
              Track topics you&apos;re learning independently. For each topic mark whether you&apos;ve
              <strong> learned</strong> it (understood theory), <strong>practiced</strong> it (solved problems / exercises),
              and <strong>built</strong> something with it. Rate your confidence 1–5.
            </p>
          </div>
        </div>
        <Button size="sm" variant="outline" className="shrink-0 gap-1.5" onClick={() => setShowForm((v) => !v)}>
          <Plus className="h-3.5 w-3.5" />
          Add topic
        </Button>
      </div>

      {/* Stats */}
      {total > 0 && (
        <div className="grid grid-cols-3 gap-3">
          {[
            { label: "Total", value: total, icon: BookOpen, color: "text-muted-foreground" },
            { label: "In progress", value: inProgress, icon: Zap, color: "text-amber-400" },
            { label: "Mastered", value: mastered, icon: CheckCircle2, color: "text-emerald-400" },
          ].map(({ label, value, icon: Icon, color }) => (
            <div key={label} className="rounded-xl border border-border/60 bg-card/80 p-3 text-center">
              <Icon className={cn("mx-auto h-4 w-4 mb-1", color)} />
              <p className="text-xl font-bold tabular-nums">{value}</p>
              <p className="text-[10px] text-muted-foreground">{label}</p>
            </div>
          ))}
        </div>
      )}

      {/* Add form */}
      {showForm && (
        <Card className="border-accent/20 bg-accent/5">
          <CardHeader className="pb-3">
            <CardTitle className="text-sm">Add a learning topic</CardTitle>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleCreate} className="space-y-3">
              <Input
                name="name"
                placeholder="e.g. Binary Search Trees, Spanish subjunctive, Calculus derivatives…"
                required
                autoFocus
              />
              <div className="space-y-2">
                <p className="text-xs text-muted-foreground">Category</p>
                <div className="flex flex-wrap gap-2">
                  {CATEGORY_SUGGESTIONS.map((cat) => (
                    <button
                      key={cat}
                      type="button"
                      onClick={() => setNewCategory(cat)}
                      className={cn(
                        "rounded-lg border px-2.5 py-1 text-xs font-medium transition-all",
                        newCategory === cat
                          ? "border-accent bg-accent/10 text-accent"
                          : "border-border/60 text-muted-foreground hover:border-border hover:text-foreground"
                      )}
                    >
                      {cat}
                    </button>
                  ))}
                </div>
                <Input
                  name="categoryCustom"
                  placeholder="Or type a custom category…"
                  className="h-8 text-sm"
                  value={newCategory}
                  onChange={(e) => setNewCategory(e.target.value)}
                />
              </div>
              <div className="flex gap-2">
                <Button type="submit" disabled={pending} size="sm" className="gap-1.5">
                  {pending ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Plus className="h-3.5 w-3.5" />}
                  Add topic
                </Button>
                {initial.length > 0 && (
                  <Button type="button" variant="ghost" size="sm" onClick={() => setShowForm(false)}>
                    Cancel
                  </Button>
                )}
              </div>
            </form>
          </CardContent>
        </Card>
      )}

      {/* Empty state */}
      {total === 0 && !showForm && (
        <div className="rounded-2xl border border-dashed border-border bg-muted/20 py-14 text-center">
          <BookOpen className="mx-auto h-10 w-10 text-muted-foreground/30" />
          <p className="mt-3 text-sm font-medium text-muted-foreground">No topics yet</p>
          <p className="mt-1 text-xs text-muted-foreground/60 max-w-sm mx-auto">
            Add topics you&apos;re self-studying — programming, languages, math, anything.
            Track your progress from &quot;heard of it&quot; to &quot;mastered&quot;.
          </p>
          <Button size="sm" className="mt-4 gap-2" onClick={() => setShowForm(true)}>
            <Plus className="h-4 w-4" /> Add first topic
          </Button>
        </div>
      )}

      {/* Category filter tabs */}
      {total > 0 && categories.length > 2 && (
        <div className="flex gap-1.5 overflow-x-auto pb-1">
          {categories.map((cat) => (
            <button
              key={cat}
              type="button"
              onClick={() => setFilter(cat)}
              className={cn(
                "shrink-0 rounded-lg px-3 py-1.5 text-xs font-medium transition-colors",
                filter === cat
                  ? "bg-accent text-white"
                  : "bg-muted/50 text-muted-foreground hover:text-foreground"
              )}
            >
              {cat}
              {cat !== "All" && (
                <span className="ml-1 opacity-60">
                  {initial.filter((t) => t.category === cat).length}
                </span>
              )}
            </button>
          ))}
        </div>
      )}

      {/* Topic list */}
      {filtered.length > 0 && (
        <div className="space-y-2">
          {/* Legend */}
          <div className="flex items-center gap-4 px-1 pb-1">
            <span className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground/40">
              {filtered.length} topic{filtered.length !== 1 ? "s" : ""}
            </span>
            <div className="ml-auto flex items-center gap-3 text-[10px] text-muted-foreground/50">
              <span className="flex items-center gap-1"><BookOpen className="h-3 w-3" /> Learned</span>
              <span className="flex items-center gap-1"><Brain className="h-3 w-3" /> Practiced</span>
              <span className="flex items-center gap-1"><Hammer className="h-3 w-3" /> Built</span>
            </div>
          </div>

          {/* Group by category if showing all */}
          {filter === "All" ? (
            Object.entries(
              filtered.reduce<Record<string, Topic[]>>((acc, t) => {
                (acc[t.category] ??= []).push(t);
                return acc;
              }, {})
            )
              .sort(([a], [b]) => a.localeCompare(b))
              .map(([cat, catTopics]) => (
                <div key={cat}>
                  <p className="mb-1.5 px-1 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground/40">
                    {cat}
                  </p>
                  <div className="space-y-1.5">
                    {catTopics.map((t) => <TopicRow key={t.id} topic={t} />)}
                  </div>
                </div>
              ))
          ) : (
            <div className="space-y-1.5">
              {filtered.map((t) => <TopicRow key={t.id} topic={t} />)}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
