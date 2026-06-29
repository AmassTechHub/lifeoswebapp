"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { AlarmClock, CheckSquare, DollarSign, Loader2, Plus, X } from "lucide-react";

import { createTask } from "@/lib/actions/tasks";
import { createExpense } from "@/lib/actions/finance";
import { createDeadlineQuick } from "@/lib/actions/deadlines";
import { cn } from "@/lib/utils";

type Mode = "task" | "expense" | "deadline" | null;

const TASK_CATEGORIES = ["ACADEMICS", "CODING", "CONTENT", "CLIENTS", "PERSONAL"] as const;
const EXPENSE_CATEGORIES = [
  "Food & Drinks", "Transport", "Education", "Entertainment",
  "Health", "Utilities", "Subscriptions", "Personal Care", "Other",
];

export function QuickAdd({ currencySymbol = "₵" }: { currencySymbol?: string }) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [mode, setMode] = useState<Mode>(null);
  const [pending, startTransition] = useTransition();

  function close() { setOpen(false); setMode(null); }

  async function handleTask(fd: FormData) {
    startTransition(async () => {
      const res = await createTask(fd);
      if (res?.error) { toast.error(res.error); return; }
      toast.success("Task added");
      close();
      router.refresh();
    });
  }

  async function handleExpense(fd: FormData) {
    startTransition(async () => {
      const res = await createExpense(fd);
      if (res?.error) { toast.error(res.error); return; }
      toast.success("Expense logged");
      close();
      router.refresh();
    });
  }

  async function handleDeadline(fd: FormData) {
    const title   = String(fd.get("title") ?? "").trim();
    const dueDate = String(fd.get("dueDate") ?? "").trim();
    const type    = String(fd.get("type") ?? "ASSIGNMENT");
    startTransition(async () => {
      const res = await createDeadlineQuick(title, dueDate, type);
      if (res?.error) { toast.error(res.error); return; }
      toast.success("Deadline added");
      close();
      router.refresh();
    });
  }

  return (
    <>
      {/* Backdrop */}
      {open && (
        <div
          className="fixed inset-0 z-40 bg-black/40 backdrop-blur-sm"
          onClick={close}
        />
      )}

      {/* FAB */}
      <button
        type="button"
        onClick={() => { setOpen((v) => !v); setMode(null); }}
        className={cn(
          "fixed bottom-6 right-6 z-50 flex h-11 w-11 items-center justify-center rounded-full shadow-lg transition-all duration-200",
          "bg-accent text-white hover:bg-accent/90 hover:shadow-xl active:scale-95",
          "lg:bottom-8 lg:right-8"
        )}
        aria-label="Quick add"
      >
        <Plus className={cn("h-5 w-5 transition-transform duration-200", open && "rotate-45")} />
      </button>

      {/* Quick action panel */}
      {open && (
        <div className="fixed bottom-20 right-6 z-50 w-72 lg:bottom-22 lg:right-8">
          {mode === null ? (
            /* Mode chooser */
            <div className="overflow-hidden rounded-2xl border border-border/80 bg-card shadow-xl">
              <div className="flex items-center justify-between border-b border-border/50 px-4 py-3">
                <p className="text-sm font-semibold">Quick add</p>
                <button type="button" onClick={close} className="rounded-lg p-1 text-muted-foreground hover:bg-muted">
                  <X className="h-4 w-4" />
                </button>
              </div>
              <div className="p-2">
                <button
                  type="button"
                  onClick={() => setMode("task")}
                  className="flex w-full items-center gap-3 rounded-xl px-3 py-3 text-left transition-colors hover:bg-muted/50"
                >
                  <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-accent/15">
                    <CheckSquare className="h-4 w-4 text-accent" />
                  </div>
                  <div>
                    <p className="text-sm font-medium">New task</p>
                    <p className="text-xs text-muted-foreground">Add to your task list</p>
                  </div>
                </button>
                <button
                  type="button"
                  onClick={() => setMode("expense")}
                  className="flex w-full items-center gap-3 rounded-xl px-3 py-3 text-left transition-colors hover:bg-muted/50"
                >
                  <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-success/15">
                    <DollarSign className="h-4 w-4 text-success" />
                  </div>
                  <div>
                    <p className="text-sm font-medium">Log expense</p>
                    <p className="text-xs text-muted-foreground">Quick expense entry</p>
                  </div>
                </button>
                <button
                  type="button"
                  onClick={() => setMode("deadline")}
                  className="flex w-full items-center gap-3 rounded-xl px-3 py-3 text-left transition-colors hover:bg-muted/50"
                >
                  <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-amber-500/15">
                    <AlarmClock className="h-4 w-4 text-amber-500" />
                  </div>
                  <div>
                    <p className="text-sm font-medium">Add deadline</p>
                    <p className="text-xs text-muted-foreground">Exam, assignment, or project</p>
                  </div>
                </button>
              </div>
            </div>
          ) : mode === "task" ? (
            /* Task form */
            <form
              onSubmit={(e) => { e.preventDefault(); handleTask(new FormData(e.currentTarget)); }}
              className="overflow-hidden rounded-2xl border border-border/80 bg-card shadow-xl"
            >
              <div className="flex items-center justify-between border-b border-border/50 px-4 py-3">
                <p className="text-sm font-semibold">New task</p>
                <button type="button" onClick={() => setMode(null)} className="rounded-lg p-1 text-muted-foreground hover:bg-muted">
                  <X className="h-4 w-4" />
                </button>
              </div>
              <div className="space-y-3 p-4">
                <input
                  name="title"
                  required
                  autoFocus
                  placeholder="What needs to be done?"
                  className="w-full rounded-xl border border-border bg-background/50 px-3 py-2.5 text-sm placeholder:text-muted-foreground/50 focus:border-accent focus:outline-none focus:ring-2 focus:ring-accent/20"
                />
                <select
                  name="category"
                  defaultValue="ACADEMICS"
                  className="w-full rounded-xl border border-border bg-background px-3 py-2.5 text-sm focus:border-accent focus:outline-none"
                >
                  {TASK_CATEGORIES.map((c) => (
                    <option key={c} value={c}>{c.charAt(0) + c.slice(1).toLowerCase()}</option>
                  ))}
                </select>
                <input name="status" type="hidden" value="PLANNED" />
                <button
                  type="submit"
                  disabled={pending}
                  className="flex w-full items-center justify-center gap-2 rounded-xl bg-accent px-4 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-accent/90 disabled:opacity-60"
                >
                  {pending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Plus className="h-4 w-4" />}
                  Add task
                </button>
              </div>
            </form>
          ) : mode === "expense" ? (
            /* Expense form */
            <form
              onSubmit={(e) => { e.preventDefault(); handleExpense(new FormData(e.currentTarget)); }}
              className="overflow-hidden rounded-2xl border border-border/80 bg-card shadow-xl"
            >
              <div className="flex items-center justify-between border-b border-border/50 px-4 py-3">
                <p className="text-sm font-semibold">Log expense</p>
                <button type="button" onClick={() => setMode(null)} className="rounded-lg p-1 text-muted-foreground hover:bg-muted">
                  <X className="h-4 w-4" />
                </button>
              </div>
              <div className="space-y-3 p-4">
                <div className="flex gap-2">
                  <span className="flex h-10 items-center rounded-xl border border-border bg-muted/30 px-3 text-sm font-semibold text-muted-foreground">{currencySymbol}</span>
                  <input
                    name="amount"
                    type="number"
                    step="0.01"
                    min="0"
                    required
                    autoFocus
                    placeholder="0.00"
                    className="flex-1 rounded-xl border border-border bg-background/50 px-3 py-2.5 text-sm placeholder:text-muted-foreground/50 focus:border-accent focus:outline-none focus:ring-2 focus:ring-accent/20"
                  />
                </div>
                <select
                  name="category"
                  defaultValue="Food & Drinks"
                  className="w-full rounded-xl border border-border bg-background px-3 py-2.5 text-sm focus:border-accent focus:outline-none"
                >
                  {EXPENSE_CATEGORIES.map((c) => <option key={c} value={c}>{c}</option>)}
                </select>
                <input
                  name="description"
                  placeholder="What was this for? (optional)"
                  className="w-full rounded-xl border border-border bg-background/50 px-3 py-2.5 text-sm placeholder:text-muted-foreground/50 focus:border-accent focus:outline-none focus:ring-2 focus:ring-accent/20"
                />
                <input name="paymentMethod" type="hidden" value="CASH" />
                <button
                  type="submit"
                  disabled={pending}
                  className="flex w-full items-center justify-center gap-2 rounded-xl bg-success px-4 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-success/90 disabled:opacity-60"
                >
                  {pending ? <Loader2 className="h-4 w-4 animate-spin" /> : <DollarSign className="h-4 w-4" />}
                  Log expense
                </button>
              </div>
            </form>
          ) : mode === "deadline" ? (
            /* Deadline form */
            <form
              onSubmit={(e) => { e.preventDefault(); handleDeadline(new FormData(e.currentTarget)); }}
              className="overflow-hidden rounded-2xl border border-border/80 bg-card shadow-xl"
            >
              <div className="flex items-center justify-between border-b border-border/50 px-4 py-3">
                <p className="text-sm font-semibold">Add deadline</p>
                <button type="button" onClick={() => setMode(null)} className="rounded-lg p-1 text-muted-foreground hover:bg-muted">
                  <X className="h-4 w-4" />
                </button>
              </div>
              <div className="space-y-3 p-4">
                <input
                  name="title"
                  required
                  autoFocus
                  placeholder="e.g. Midterm Exam, Assignment 3…"
                  className="w-full rounded-xl border border-border bg-background/50 px-3 py-2.5 text-sm placeholder:text-muted-foreground/50 focus:border-accent focus:outline-none focus:ring-2 focus:ring-accent/20"
                />
                <select
                  name="type"
                  defaultValue="ASSIGNMENT"
                  className="w-full rounded-xl border border-border bg-background px-3 py-2.5 text-sm focus:border-accent focus:outline-none"
                >
                  <option value="ASSIGNMENT">Assignment</option>
                  <option value="EXAM">Exam</option>
                  <option value="PROJECT">Project</option>
                  <option value="QUIZ">Quiz</option>
                  <option value="LAB">Lab</option>
                  <option value="OTHER">Other</option>
                </select>
                <input
                  name="dueDate"
                  type="date"
                  required
                  className="w-full rounded-xl border border-border bg-background/50 px-3 py-2.5 text-sm focus:border-accent focus:outline-none focus:ring-2 focus:ring-accent/20"
                />
                <button
                  type="submit"
                  disabled={pending}
                  className="flex w-full items-center justify-center gap-2 rounded-xl bg-amber-500 px-4 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-amber-600 disabled:opacity-60"
                >
                  {pending ? <Loader2 className="h-4 w-4 animate-spin" /> : <AlarmClock className="h-4 w-4" />}
                  Add deadline
                </button>
              </div>
            </form>
          ) : null}
        </div>
      )}
    </>
  );
}
