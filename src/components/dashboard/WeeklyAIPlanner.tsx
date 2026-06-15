"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Bot, Check, Loader2, RefreshCw, Sparkles, Wand2 } from "lucide-react";

import { createTask } from "@/lib/actions/tasks";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { cn } from "@/lib/utils";

type GeneratedTask = {
  title: string;
  category: "ACADEMICS" | "CODING" | "CONTENT" | "CLIENTS" | "PERSONAL";
  day: string;
  priority: "high" | "medium" | "low";
  why: string;
};

const PRIORITY_STYLE = {
  high: "bg-danger/10 text-danger border-danger/20",
  medium: "bg-warning/10 text-warning border-warning/20",
  low: "bg-muted/50 text-muted-foreground border-border/50",
};

const CATEGORY_COLOR: Record<string, string> = {
  ACADEMICS: "text-accent", CODING: "text-success", CONTENT: "text-warning",
  CLIENTS: "text-orange-400", PERSONAL: "text-muted-foreground",
};

export function WeeklyAIPlanner() {
  const router = useRouter();
  const [tasks, setTasks] = useState<GeneratedTask[]>([]);
  const [selected, setSelected] = useState<Set<number>>(new Set());
  const [loading, setLoading] = useState(false);
  const [added, setAdded] = useState(false);
  const [pending, startTransition] = useTransition();

  async function generate() {
    setLoading(true);
    setAdded(false);
    setSelected(new Set());
    try {
      const res = await fetch("/api/ai/weekly-plan", { method: "POST" });
      const data = await res.json() as { tasks?: GeneratedTask[]; error?: string };
      if (data.error && !data.tasks?.length) { toast.error(data.error); return; }
      setTasks(data.tasks ?? []);
      setSelected(new Set(data.tasks?.map((_, i) => i) ?? []));
    } catch {
      toast.error("Could not generate plan");
    } finally {
      setLoading(false);
    }
  }

  async function addToTasks() {
    const toAdd = tasks.filter((_, i) => selected.has(i));
    startTransition(async () => {
      for (const t of toAdd) {
        const fd = new FormData();
        fd.append("title", t.title);
        fd.append("category", t.category);
        fd.append("status", "PLANNED");
        await createTask(fd);
      }
      toast.success(`Added ${toAdd.length} task${toAdd.length !== 1 ? "s" : ""} to your list`);
      setAdded(true);
      router.refresh();
    });
  }

  function toggleSelect(i: number) {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(i)) next.delete(i);
      else next.add(i);
      return next;
    });
  }

  return (
    <Card className="border-border/70 bg-card/80">
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2 text-base">
            <Wand2 className="h-4 w-4 text-accent" />
            AI Weekly Planner
          </CardTitle>
          <Button
            size="sm"
            variant={tasks.length ? "outline" : "default"}
            className="h-8 gap-1.5 text-xs"
            onClick={generate}
            disabled={loading}
          >
            {loading ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : tasks.length ? <RefreshCw className="h-3.5 w-3.5" /> : <Sparkles className="h-3.5 w-3.5" />}
            {loading ? "Generating…" : tasks.length ? "Regenerate" : "Generate plan"}
          </Button>
        </div>
      </CardHeader>
      <CardContent>
        {!tasks.length && !loading && (
          <div className="py-8 text-center">
            <Bot className="mx-auto h-10 w-10 text-muted-foreground/30" />
            <p className="mt-2 text-sm text-muted-foreground">Claude will read your goals, courses, and tasks to build a realistic week plan for you.</p>
            <Button className="mt-4 gap-2" onClick={generate}>
              <Sparkles className="h-4 w-4" />
              Generate this week&apos;s plan
            </Button>
          </div>
        )}

        {tasks.length > 0 && (
          <div className="space-y-2">
            {tasks.map((t, i) => (
              <button
                key={i}
                type="button"
                onClick={() => toggleSelect(i)}
                className={cn(
                  "group w-full rounded-xl border p-3 text-left transition-all",
                  selected.has(i) ? "border-accent/40 bg-accent/5" : "border-border/40 bg-background/30 opacity-60"
                )}
              >
                <div className="flex items-start gap-3">
                  <div className={cn("mt-0.5 flex h-4 w-4 shrink-0 items-center justify-center rounded border transition-colors",
                    selected.has(i) ? "border-accent bg-accent text-white" : "border-muted-foreground/30")}>
                    {selected.has(i) && <Check className="h-2.5 w-2.5" />}
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <p className="text-sm font-medium text-foreground">{t.title}</p>
                      <span className={cn("rounded-full border px-1.5 py-0.5 text-[10px] font-semibold capitalize", PRIORITY_STYLE[t.priority])}>
                        {t.priority}
                      </span>
                    </div>
                    <div className="mt-0.5 flex items-center gap-2">
                      <span className="text-[11px] text-muted-foreground">{t.day}</span>
                      <span className="text-muted-foreground/30">·</span>
                      <span className={cn("text-[11px] font-medium", CATEGORY_COLOR[t.category])}>{t.category}</span>
                    </div>
                    <p className="mt-0.5 text-[11px] text-muted-foreground/70">{t.why}</p>
                  </div>
                </div>
              </button>
            ))}

            {!added && (
              <div className="flex items-center justify-between pt-2">
                <p className="text-xs text-muted-foreground">{selected.size} of {tasks.length} selected</p>
                <Button
                  size="sm"
                  onClick={addToTasks}
                  disabled={pending || selected.size === 0}
                  className="gap-1.5"
                >
                  {pending ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Check className="h-3.5 w-3.5" />}
                  Add to tasks
                </Button>
              </div>
            )}
            {added && (
              <p className="pt-1 text-center text-xs text-success">Tasks added to your list</p>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
