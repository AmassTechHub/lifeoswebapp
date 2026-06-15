"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import {
  AlertCircle,
  BookOpen,
  CheckCircle2,
  Circle,
  Clock,
  Loader2,
  Pencil,
  Plus,
  Trash2,
  X,
} from "lucide-react";

import { createDeadline, updateDeadline, toggleDeadline, deleteDeadline } from "@/lib/actions/deadlines";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { cn } from "@/lib/utils";

type Course = { id: string; name: string; code: string | null; color: string };
type Deadline = {
  id: string;
  title: string;
  type: string;
  courseId: string | null;
  course: Course | null;
  dueDate: Date;
  completed: boolean;
  notes: string | null;
};

const DEADLINE_TYPES = ["ASSIGNMENT", "EXAM", "PROJECT", "QUIZ", "LAB", "OTHER"];
const TYPE_LABELS: Record<string, string> = {
  ASSIGNMENT: "Assignment",
  EXAM: "Exam",
  PROJECT: "Project",
  QUIZ: "Quiz",
  LAB: "Lab",
  OTHER: "Other",
};
const TYPE_COLORS: Record<string, string> = {
  ASSIGNMENT: "bg-blue-500/10 text-blue-500 border-blue-500/20",
  EXAM: "bg-red-500/10 text-red-500 border-red-500/20",
  PROJECT: "bg-purple-500/10 text-purple-500 border-purple-500/20",
  QUIZ: "bg-orange-500/10 text-orange-500 border-orange-500/20",
  LAB: "bg-green-500/10 text-green-500 border-green-500/20",
  OTHER: "bg-muted/50 text-muted-foreground border-border",
};

function startOfDay(d: Date): Date {
  const r = new Date(d);
  r.setHours(0, 0, 0, 0);
  return r;
}

function isPast(date: Date): boolean {
  return date < new Date();
}

function isSameDay(a: Date, b: Date): boolean {
  return startOfDay(a).getTime() === startOfDay(b).getTime();
}

function diffDays(future: Date, from: Date): number {
  return Math.ceil((startOfDay(future).getTime() - startOfDay(from).getTime()) / 86400000);
}

function fmtRelative(date: Date): string {
  const days = diffDays(date, new Date());
  if (days === 0) return "today";
  if (days === 1) return "tomorrow";
  if (days < 7) return `in ${days} days`;
  if (days < 30) return `in ${Math.round(days / 7)} week${Math.round(days / 7) > 1 ? "s" : ""}`;
  return `in ${Math.round(days / 30)} month${Math.round(days / 30) > 1 ? "s" : ""}`;
}

function fmtDateDisplay(date: Date): string {
  return date.toLocaleDateString("en", { month: "short", day: "numeric", year: "numeric" });
}

function urgencyLabel(dueDate: Date, completed: boolean): { label: string; color: string } {
  if (completed) return { label: "Done", color: "text-success" };
  const now = new Date();
  if (startOfDay(dueDate) < startOfDay(now)) return { label: "Overdue", color: "text-danger" };
  if (isSameDay(dueDate, now)) return { label: "Today", color: "text-warning" };
  const days = diffDays(dueDate, now);
  if (days === 1) return { label: "Tomorrow", color: "text-warning" };
  if (days <= 3) return { label: `${days}d left`, color: "text-warning" };
  return { label: fmtRelative(dueDate), color: "text-muted-foreground" };
}

function toDateInputValue(date: Date): string {
  return new Date(date).toISOString().slice(0, 10);
}

export function DeadlineTracker({
  deadlines: initial,
  courses,
}: {
  deadlines: Deadline[];
  courses: Course[];
}) {
  const router = useRouter();
  const [deadlines, setDeadlines] = useState(initial);
  const [dialog, setDialog] = useState<"add" | "edit" | null>(null);
  const [editing, setEditing] = useState<Deadline | null>(null);
  const [filter, setFilter] = useState<"upcoming" | "completed" | "all">("upcoming");
  const [pending, startTransition] = useTransition();

  function openEdit(d: Deadline) { setEditing(d); setDialog("edit"); }
  function closeDialog() { setDialog(null); setEditing(null); }

  async function handleCreate(fd: FormData) {
    startTransition(async () => {
      const res = await createDeadline(fd);
      if (res?.error) { toast.error(res.error); return; }
      toast.success("Deadline added");
      closeDialog();
      router.refresh();
    });
  }

  async function handleUpdate(fd: FormData) {
    if (!editing) return;
    startTransition(async () => {
      const res = await updateDeadline(editing.id, fd);
      if (res?.error) { toast.error(res.error); return; }
      toast.success("Deadline updated");
      closeDialog();
      router.refresh();
    });
  }

  async function handleToggle(id: string) {
    setDeadlines((prev) =>
      prev.map((d) => (d.id === id ? { ...d, completed: !d.completed } : d))
    );
    startTransition(async () => {
      await toggleDeadline(id);
      router.refresh();
    });
  }

  async function handleDelete(id: string, title: string) {
    setDeadlines((prev) => prev.filter((d) => d.id !== id));
    startTransition(async () => {
      await deleteDeadline(id);
      toast.success(`"${title}" removed`);
      router.refresh();
    });
  }

  const filtered = deadlines.filter((d) => {
    if (filter === "upcoming") return !d.completed;
    if (filter === "completed") return d.completed;
    return true;
  });

  const overdue = deadlines.filter((d) => !d.completed && isPast(d.dueDate));
  const upcoming = deadlines.filter((d) => !d.completed && !isPast(d.dueDate));
  const done = deadlines.filter((d) => d.completed);

  return (
    <div className="space-y-6">
      {/* Stats */}
      <div className="grid grid-cols-3 gap-3">
        {[
          { label: "Overdue", count: overdue.length, icon: AlertCircle, color: "text-danger" },
          { label: "Upcoming", count: upcoming.length, icon: Clock, color: "text-warning" },
          { label: "Completed", count: done.length, icon: CheckCircle2, color: "text-success" },
        ].map(({ label, count, icon: Icon, color }) => (
          <div key={label} className="rounded-xl border border-border/70 bg-card/80 p-4 text-center">
            <Icon className={cn("mx-auto h-5 w-5 mb-1", color)} />
            <p className="text-2xl font-bold tabular-nums">{count}</p>
            <p className="text-xs text-muted-foreground">{label}</p>
          </div>
        ))}
      </div>

      {/* Filter + Add */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex gap-1 rounded-lg border border-border/70 bg-muted/30 p-1">
          {(["upcoming", "completed", "all"] as const).map((f) => (
            <button
              key={f}
              onClick={() => setFilter(f)}
              className={cn(
                "rounded-md px-3 py-1.5 text-xs font-medium capitalize transition-colors",
                filter === f
                  ? "bg-accent text-accent-foreground shadow-sm"
                  : "text-muted-foreground hover:text-foreground"
              )}
            >
              {f}
            </button>
          ))}
        </div>
        <Button className="gap-2" onClick={() => setDialog("add")}>
          <Plus className="h-4 w-4" />
          Add deadline
        </Button>
      </div>

      {/* Deadline list */}
      {filtered.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-border bg-muted/20 px-6 py-14 text-center">
          <BookOpen className="mx-auto h-10 w-10 text-muted-foreground/30" />
          <p className="mt-3 text-sm font-medium text-muted-foreground">
            {filter === "completed" ? "No completed deadlines yet" : "No upcoming deadlines"}
          </p>
          {filter !== "completed" && (
            <Button size="sm" className="mt-4 gap-2" onClick={() => setDialog("add")}>
              <Plus className="h-4 w-4" />
              Add your first deadline
            </Button>
          )}
        </div>
      ) : (
        <div className="space-y-2">
          {filtered.map((d) => {
            const due = new Date(d.dueDate);
            const urgency = urgencyLabel(due, d.completed);
            return (
              <div
                key={d.id}
                className={cn(
                  "group flex items-start gap-3 rounded-xl border px-4 py-3.5 transition-colors",
                  d.completed
                    ? "border-border/40 bg-muted/20 opacity-60"
                    : isPast(due)
                    ? "border-danger/30 bg-danger/5"
                    : "border-border/70 bg-card/80 hover:bg-muted/20"
                )}
              >
                {/* Toggle */}
                <button
                  onClick={() => handleToggle(d.id)}
                  className="mt-0.5 shrink-0 text-muted-foreground/40 transition-colors hover:text-success"
                >
                  {d.completed ? (
                    <CheckCircle2 className="h-5 w-5 text-success" />
                  ) : (
                    <Circle className="h-5 w-5" />
                  )}
                </button>

                {/* Content */}
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-1.5">
                    <p className={cn("text-sm font-medium", d.completed && "line-through text-muted-foreground")}>
                      {d.title}
                    </p>
                    <span className={cn("rounded border px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-wide", TYPE_COLORS[d.type])}>
                      {TYPE_LABELS[d.type] ?? d.type}
                    </span>
                  </div>
                  <div className="mt-0.5 flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
                    {d.course && (
                      <span
                        className="flex items-center gap-1"
                        style={{ color: d.course.color }}
                      >
                        <span
                          className="inline-block h-1.5 w-1.5 rounded-full"
                          style={{ backgroundColor: d.course.color }}
                        />
                        {d.course.code ?? d.course.name}
                      </span>
                    )}
                    <span>{fmtDateDisplay(new Date(d.dueDate))}</span>
                    {d.notes && <span className="truncate max-w-50">{d.notes}</span>}
                  </div>
                </div>

                {/* Right: urgency + actions */}
                <div className="flex shrink-0 items-center gap-2">
                  <span className={cn("text-xs font-medium", urgency.color)}>{urgency.label}</span>
                  <div className="flex opacity-0 transition-opacity group-hover:opacity-100">
                    <button
                      onClick={() => openEdit(d)}
                      className="rounded p-1 text-muted-foreground/40 hover:text-muted-foreground"
                    >
                      <Pencil className="h-3.5 w-3.5" />
                    </button>
                    <button
                      onClick={() => handleDelete(d.id, d.title)}
                      className="rounded p-1 text-muted-foreground/40 hover:text-danger"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Add/Edit Dialog */}
      <Dialog open={dialog !== null} onOpenChange={(v) => !v && closeDialog()}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>{dialog === "edit" ? "Edit deadline" : "Add deadline"}</DialogTitle>
          </DialogHeader>
          <form
            onSubmit={(e) => {
              e.preventDefault();
              const fd = new FormData(e.currentTarget);
              dialog === "edit" ? handleUpdate(fd) : handleCreate(fd);
            }}
            className="space-y-4"
          >
            <div className="space-y-1.5">
              <Label>Title</Label>
              <Input
                name="title"
                defaultValue={editing?.title ?? ""}
                placeholder="Data Structures Assignment 3"
                required
                autoFocus={dialog === "add"}
              />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label>Type</Label>
                <select
                  name="type"
                  defaultValue={editing?.type ?? "ASSIGNMENT"}
                  className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm focus:border-accent focus:outline-none"
                >
                  {DEADLINE_TYPES.map((t) => (
                    <option key={t} value={t}>{TYPE_LABELS[t]}</option>
                  ))}
                </select>
              </div>
              <div className="space-y-1.5">
                <Label>Due date</Label>
                <Input
                  name="dueDate"
                  type="date"
                  defaultValue={editing ? toDateInputValue(new Date(editing.dueDate)) : ""}
                  required
                />
              </div>
            </div>
            {courses.length > 0 && (
              <div className="space-y-1.5">
                <Label>Course (optional)</Label>
                <select
                  name="courseId"
                  defaultValue={editing?.courseId ?? ""}
                  className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm focus:border-accent focus:outline-none"
                >
                  <option value="">No course</option>
                  {courses.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.code ? `${c.code} – ` : ""}{c.name}
                    </option>
                  ))}
                </select>
              </div>
            )}
            <div className="space-y-1.5">
              <Label>Notes (optional)</Label>
              <Input
                name="notes"
                defaultValue={editing?.notes ?? ""}
                placeholder="Chapter 5-8, 20 marks..."
              />
            </div>
            <DialogFooter>
              <Button type="button" variant="ghost" onClick={closeDialog}>
                <X className="h-4 w-4" />
              </Button>
              <Button type="submit" disabled={pending} className="gap-1.5">
                {pending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Plus className="h-4 w-4" />}
                {dialog === "edit" ? "Update" : "Add"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
