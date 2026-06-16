"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { DragDropContext, Droppable, Draggable, DropResult } from "@hello-pangea/dnd";
import { toast } from "sonner";
import { Calendar, GripVertical, Loader2, Plus, Trash2 } from "lucide-react";

import { createTask, deleteTask, updateTaskStatus } from "@/lib/actions/tasks";
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
import { cn } from "@/lib/utils";

type Task = {
  id: string;
  title: string;
  category: string;
  status: string;
  completed: boolean;
  dueDate: Date | null;
  description?: string | null;
};

const CATEGORY_STYLES: Record<string, { bg: string; dot: string; label: string }> = {
  ACADEMICS: { bg: "bg-blue-500/10 text-blue-600 dark:text-blue-400", dot: "bg-blue-500", label: "Academics" },
  CODING:    { bg: "bg-violet-500/10 text-violet-600 dark:text-violet-400", dot: "bg-violet-500", label: "Coding" },
  CONTENT:   { bg: "bg-orange-500/10 text-orange-600 dark:text-orange-400", dot: "bg-orange-500", label: "Content" },
  CLIENTS:   { bg: "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400", dot: "bg-emerald-500", label: "Clients" },
  PERSONAL:  { bg: "bg-slate-500/10 text-slate-600 dark:text-slate-400", dot: "bg-slate-500", label: "Personal" },
};

const COLUMNS = [
  { id: "todo",       label: "To Do",       statuses: ["BACKLOG", "PLANNED"],           color: "text-muted-foreground" },
  { id: "inprogress", label: "In Progress", statuses: ["IN_PROGRESS", "REVIEW"],        color: "text-warning" },
  { id: "done",       label: "Done",        statuses: ["COMPLETED"],                    color: "text-success" },
];

const COLUMN_STATUS: Record<string, string> = {
  todo: "PLANNED",
  inprogress: "IN_PROGRESS",
  done: "COMPLETED",
};

function getColumn(status: string) {
  return COLUMNS.find((c) => c.statuses.includes(status))?.id ?? "todo";
}

export function TasksPanel({ tasks: initial }: { tasks: Task[] }) {
  const router = useRouter();
  const [tasks, setTasks] = useState(initial);
  const [addOpen, setAddOpen] = useState(false);
  const [pending, startTransition] = useTransition();

  function handleDragEnd(result: DropResult) {
    const { source, destination, draggableId } = result;
    if (!destination || source.droppableId === destination.droppableId) return;

    const newStatus = COLUMN_STATUS[destination.droppableId];
    setTasks((prev) =>
      prev.map((t) =>
        t.id === draggableId ? { ...t, status: newStatus, completed: newStatus === "COMPLETED" } : t
      )
    );

    startTransition(async () => {
      const res = await updateTaskStatus(draggableId, newStatus);
      if (res.error) {
        toast.error("Failed to update task");
        setTasks(initial);
      } else {
        toast.success("Task moved");
        router.refresh();
      }
    });
  }

  async function handleCreate(fd: FormData) {
    const res = await createTask(fd);
    if (res.error) {
      toast.error(res.error);
    } else {
      toast.success("Task created");
      setAddOpen(false);
      router.refresh();
    }
  }

  async function handleDelete(id: string, title: string) {
    setTasks((prev) => prev.filter((t) => t.id !== id));
    startTransition(async () => {
      const res = await deleteTask(id);
      if (res.error) {
        toast.error("Failed to delete task");
        router.refresh();
      } else {
        toast.success(`"${title}" deleted`);
      }
    });
  }

  const counts = {
    total: tasks.length,
    done: tasks.filter((t) => t.completed).length,
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <span className="text-sm text-muted-foreground">
            {counts.done} / {counts.total} done
          </span>
          {counts.total > 0 && (
            <div className="h-1.5 w-24 rounded-full bg-muted overflow-hidden">
              <div
                className="h-full rounded-full bg-accent transition-all duration-500"
                style={{ width: `${(counts.done / counts.total) * 100}%` }}
              />
            </div>
          )}
        </div>
        <Button size="sm" className="gap-2" onClick={() => setAddOpen(true)}>
          <Plus className="h-4 w-4" />
          Add task
        </Button>
      </div>

      <DragDropContext onDragEnd={handleDragEnd}>
        <div className="grid gap-4 md:grid-cols-3">
          {COLUMNS.map((col) => {
            const colTasks = tasks.filter((t) => getColumn(t.status) === col.id);
            return (
              <div key={col.id} className="flex flex-col gap-3">
                <div className="flex items-center justify-between px-1">
                  <div className="flex items-center gap-2">
                    <span className={cn("text-xs font-semibold uppercase tracking-wider", col.color)}>
                      {col.label}
                    </span>
                    <span className="flex h-5 w-5 items-center justify-center rounded-full bg-muted text-[10px] font-semibold text-muted-foreground">
                      {colTasks.length}
                    </span>
                  </div>
                </div>

                <Droppable droppableId={col.id}>
                  {(provided, snapshot) => (
                    <div
                      ref={provided.innerRef}
                      {...provided.droppableProps}
                      className={cn(
                        "min-h-50 rounded-xl border-2 border-dashed p-2 transition-colors",
                        snapshot.isDraggingOver
                          ? "border-accent/40 bg-accent/5"
                          : "border-border/40 bg-muted/20"
                      )}
                    >
                      {colTasks.length === 0 && !snapshot.isDraggingOver && (
                        <div className="flex h-full min-h-40 items-center justify-center">
                          <p className="text-xs text-muted-foreground/50">
                            {col.id === "todo" ? "No tasks" : col.id === "inprogress" ? "Nothing in progress" : "Nothing done yet"}
                          </p>
                        </div>
                      )}
                      {colTasks.map((task, index) => (
                        <Draggable key={task.id} draggableId={task.id} index={index}>
                          {(prov, snap) => (
                            <TaskCard
                              ref={prov.innerRef}
                              {...(prov.draggableProps as React.HTMLAttributes<HTMLDivElement>)}
                              {...prov.dragHandleProps}
                              task={task}
                              isDragging={snap.isDragging}
                              onDelete={() => handleDelete(task.id, task.title)}
                            />
                          )}
                        </Draggable>
                      ))}
                      {provided.placeholder}
                    </div>
                  )}
                </Droppable>
              </div>
            );
          })}
        </div>
      </DragDropContext>

      <AddTaskDialog
        open={addOpen}
        onClose={() => setAddOpen(false)}
        onSubmit={handleCreate}
        pending={pending}
      />
    </div>
  );
}

function TaskCard({
  task,
  isDragging,
  onDelete,
  ...props
}: React.HTMLAttributes<HTMLDivElement> & {
  task: Task;
  isDragging: boolean;
  onDelete: () => void;
  ref?: React.Ref<HTMLDivElement>;
}) {
  const cat = CATEGORY_STYLES[task.category] ?? CATEGORY_STYLES.PERSONAL;
  const isOverdue =
    task.dueDate && !task.completed && new Date(task.dueDate) < new Date();

  return (
    <div
      {...props}
      className={cn(
        "group mb-2 rounded-xl border border-border bg-card p-3 shadow-sm transition-all",
        isDragging && "shadow-xl ring-2 ring-accent/30 rotate-1",
        task.completed && "opacity-60"
      )}
    >
      <div className="flex items-start gap-2">
        <GripVertical className="mt-0.5 h-4 w-4 shrink-0 text-muted-foreground/30 group-hover:text-muted-foreground/60 transition-colors cursor-grab active:cursor-grabbing" />
        <div className="min-w-0 flex-1">
          <p className={cn("text-sm font-medium leading-snug", task.completed && "line-through text-muted-foreground")}>
            {task.title}
          </p>
          <div className="mt-1.5 flex flex-wrap items-center gap-1.5">
            <span className={cn("inline-flex items-center gap-1 rounded-md px-1.5 py-0.5 text-[10px] font-medium", cat.bg)}>
              <span className={cn("h-1.5 w-1.5 rounded-full", cat.dot)} />
              {cat.label}
            </span>
            {task.dueDate && (
              <span className={cn(
                "inline-flex items-center gap-1 rounded-md px-1.5 py-0.5 text-[10px] font-medium",
                isOverdue
                  ? "bg-danger/10 text-danger"
                  : "bg-muted text-muted-foreground"
              )}>
                <Calendar className="h-2.5 w-2.5" />
                {new Date(task.dueDate).toLocaleDateString("en-US", { month: "short", day: "numeric" })}
              </span>
            )}
          </div>
        </div>
        <button
          type="button"
          onClick={(e) => { e.stopPropagation(); onDelete(); }}
          className="shrink-0 rounded-md p-1 text-muted-foreground/0 transition-all group-hover:text-muted-foreground/50 hover:text-danger! hover:bg-danger/10"
        >
          <Trash2 className="h-3.5 w-3.5" />
        </button>
      </div>
    </div>
  );
}

function AddTaskDialog({
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
          <DialogTitle>New task</DialogTitle>
        </DialogHeader>
        <form
          onSubmit={(e) => {
            e.preventDefault();
            onSubmit(new FormData(e.currentTarget));
          }}
          className="space-y-4"
        >
          <div className="space-y-1.5">
            <Label>Title</Label>
            <Input name="title" placeholder="What needs to be done?" required autoFocus />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label>Category</Label>
              <select
                name="category"
                className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm focus:border-accent focus:outline-none focus:ring-2 focus:ring-accent/20"
                defaultValue="PERSONAL"
              >
                <option value="ACADEMICS">Academics</option>
                <option value="CODING">Coding</option>
                <option value="CONTENT">Content</option>
                <option value="CLIENTS">Clients</option>
                <option value="PERSONAL">Personal</option>
              </select>
            </div>
            <div className="space-y-1.5">
              <Label>Due date</Label>
              <Input name="dueDate" type="date" />
            </div>
          </div>
          <DialogFooter>
            <Button type="button" variant="ghost" onClick={onClose}>
              Cancel
            </Button>
            <Button type="submit" disabled={pending} className="gap-2">
              {pending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Plus className="h-4 w-4" />}
              Create task
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
