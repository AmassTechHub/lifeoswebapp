"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Award, BookOpen, Loader2, Pencil, Plus, Trash2, TrendingUp, X } from "lucide-react";

import { createGrade, updateGrade, deleteGrade, KNUST_GRADES } from "@/lib/actions/grades";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { cn } from "@/lib/utils";

type Grade = {
  id: string; name: string; code: string | null; credits: number;
  grade: string; semester: string; year: number;
};

const GRADE_COLORS: Record<string, string> = {
  "A": "text-success", "B+": "text-success", "B": "text-accent",
  "C+": "text-accent", "C": "text-warning", "D+": "text-warning",
  "D": "text-danger", "F": "text-danger",
};

const GRADE_OPTIONS = Object.keys(KNUST_GRADES);
const CURRENT_YEAR = new Date().getFullYear();
const YEARS = Array.from({ length: 6 }, (_, i) => CURRENT_YEAR - i);
const SEMESTERS = ["Semester 1", "Semester 2", "Semester 3"];

function computeGPA(grades: Grade[]): number {
  if (grades.length === 0) return 0;
  const totalPoints = grades.reduce((s, g) => s + (KNUST_GRADES[g.grade] ?? 0) * g.credits, 0);
  const totalCredits = grades.reduce((s, g) => s + g.credits, 0);
  return totalCredits > 0 ? totalPoints / totalCredits : 0;
}

function groupBySemester(grades: Grade[]): Record<string, Grade[]> {
  const groups: Record<string, Grade[]> = {};
  for (const g of grades) {
    const key = `${g.year} – ${g.semester}`;
    if (!groups[key]) groups[key] = [];
    groups[key].push(g);
  }
  return groups;
}

function GPABadge({ gpa }: { gpa: number }) {
  const color = gpa >= 3.5 ? "text-success bg-success/10" : gpa >= 3.0 ? "text-accent bg-accent/10" : gpa >= 2.0 ? "text-warning bg-warning/10" : "text-danger bg-danger/10";
  const label = gpa >= 3.5 ? "First Class" : gpa >= 3.0 ? "Second Class Upper" : gpa >= 2.0 ? "Second Class Lower" : gpa >= 1.0 ? "Third Class" : "Fail";
  return (
    <div className={cn("inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-semibold", color)}>
      <Award className="h-3.5 w-3.5" />
      {label}
    </div>
  );
}

export function CGPATracker({ grades: initial }: { grades: Grade[] }) {
  const router = useRouter();
  const [grades, setGrades] = useState(initial);
  const [dialog, setDialog] = useState<"add" | "edit" | null>(null);
  const [editing, setEditing] = useState<Grade | null>(null);
  const [pending, startTransition] = useTransition();

  const cgpa = computeGPA(grades);
  const grouped = groupBySemester(grades);
  const totalCredits = grades.reduce((s, g) => s + g.credits, 0);

  function openEdit(g: Grade) { setEditing(g); setDialog("edit"); }
  function closeDialog() { setDialog(null); setEditing(null); }

  async function handleCreate(fd: FormData) {
    startTransition(async () => {
      const res = await createGrade(fd);
      if (res?.error) { toast.error(res.error); return; }
      toast.success("Course grade added");
      closeDialog();
      router.refresh();
    });
  }

  async function handleUpdate(fd: FormData) {
    if (!editing) return;
    startTransition(async () => {
      const res = await updateGrade(editing.id, fd);
      if (res?.error) { toast.error(res.error); return; }
      toast.success("Grade updated");
      closeDialog();
      router.refresh();
    });
  }

  async function handleDelete(id: string, name: string) {
    startTransition(async () => {
      setGrades((prev) => prev.filter((g) => g.id !== id));
      await deleteGrade(id);
      toast.success(`${name} removed`);
      router.refresh();
    });
  }

  return (
    <div className="space-y-6">
      {/* CGPA Hero */}
      <div className="rounded-2xl border border-border/70 bg-card/80 p-6">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <p className="text-sm font-medium text-muted-foreground">Cumulative GPA</p>
            <div className="mt-1 flex items-end gap-3">
              <span className="text-5xl font-bold tabular-nums tracking-tight text-foreground">
                {cgpa.toFixed(2)}
              </span>
              <span className="mb-1.5 text-lg text-muted-foreground">/ 4.00</span>
            </div>
            <div className="mt-2 flex flex-wrap items-center gap-2">
              {cgpa > 0 && <GPABadge gpa={cgpa} />}
              <span className="text-xs text-muted-foreground">{grades.length} courses · {totalCredits} credit hours</span>
            </div>
          </div>
          <Button className="gap-2 self-start sm:self-auto" onClick={() => setDialog("add")}>
            <Plus className="h-4 w-4" />
            Add course
          </Button>
        </div>

        {/* GPA bar */}
        {grades.length > 0 && (
          <div className="mt-5">
            <div className="mb-1.5 flex justify-between text-xs text-muted-foreground">
              <span>0.00</span>
              <span className="font-medium text-foreground">{cgpa.toFixed(2)} GPA</span>
              <span>4.00</span>
            </div>
            <div className="h-3 w-full overflow-hidden rounded-full bg-muted/50">
              <div
                className={cn("h-full rounded-full transition-all duration-700",
                  cgpa >= 3.5 ? "bg-success" : cgpa >= 3.0 ? "bg-accent" : cgpa >= 2.0 ? "bg-warning" : "bg-danger"
                )}
                style={{ width: `${(cgpa / 4) * 100}%` }}
              />
            </div>
          </div>
        )}
      </div>

      {/* Grade scale reference */}
      <Card className="border-border/70 bg-card/80">
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2 text-sm">
            <TrendingUp className="h-4 w-4 text-accent" />
            KNUST Grading Scale
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex flex-wrap gap-2">
            {GRADE_OPTIONS.map((g) => (
              <div key={g} className="flex items-center gap-1.5 rounded-lg border border-border/50 bg-background/50 px-2.5 py-1.5">
                <span className={cn("text-sm font-bold", GRADE_COLORS[g])}>{g}</span>
                <span className="text-xs text-muted-foreground">= {KNUST_GRADES[g].toFixed(1)}</span>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Courses by semester */}
      {grades.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-border bg-muted/20 px-6 py-14 text-center">
          <BookOpen className="mx-auto h-10 w-10 text-muted-foreground/30" />
          <p className="mt-3 text-sm font-medium text-muted-foreground">No courses yet</p>
          <p className="mt-1 text-xs text-muted-foreground/60">Add courses with their grades to track your CGPA.</p>
          <Button size="sm" className="mt-4 gap-2" onClick={() => setDialog("add")}>
            <Plus className="h-4 w-4" />Add first course
          </Button>
        </div>
      ) : (
        <div className="space-y-4">
          {Object.entries(grouped)
            .sort(([a], [b]) => b.localeCompare(a))
            .map(([semKey, semGrades]) => {
              const semGPA = computeGPA(semGrades);
              const semCredits = semGrades.reduce((s, g) => s + g.credits, 0);
              return (
                <Card key={semKey} className="border-border/70 bg-card/80">
                  <CardHeader className="pb-3">
                    <div className="flex items-center justify-between">
                      <CardTitle className="text-sm font-semibold text-foreground">{semKey}</CardTitle>
                      <div className="flex items-center gap-2">
                        <span className="text-xs text-muted-foreground">{semCredits} credits</span>
                        <span className={cn("rounded-full px-2 py-0.5 text-xs font-bold",
                          semGPA >= 3.5 ? "bg-success/10 text-success" :
                          semGPA >= 3.0 ? "bg-accent/10 text-accent" :
                          semGPA >= 2.0 ? "bg-warning/10 text-warning" : "bg-danger/10 text-danger"
                        )}>
                          GPA {semGPA.toFixed(2)}
                        </span>
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent className="space-y-2 pt-0">
                    {semGrades.map((g) => (
                      <div key={g.id} className="group flex items-center justify-between rounded-xl border border-border/50 px-3 py-2.5 transition-colors hover:bg-muted/30">
                        <div className="min-w-0">
                          <p className="truncate text-sm font-medium">{g.name}</p>
                          <p className="text-xs text-muted-foreground">
                            {g.code ? `${g.code} · ` : ""}{g.credits} credit{g.credits !== 1 ? "s" : ""}
                          </p>
                        </div>
                        <div className="flex shrink-0 items-center gap-2">
                          <span className={cn("text-lg font-bold", GRADE_COLORS[g.grade])}>{g.grade}</span>
                          <span className="text-xs text-muted-foreground">({KNUST_GRADES[g.grade]?.toFixed(1)})</span>
                          <div className="flex opacity-0 transition-opacity group-hover:opacity-100">
                            <button type="button" onClick={() => openEdit(g)} className="rounded p-1 text-muted-foreground/40 hover:text-muted-foreground">
                              <Pencil className="h-3.5 w-3.5" />
                            </button>
                            <button type="button" onClick={() => handleDelete(g.id, g.name)} className="rounded p-1 text-muted-foreground/40 hover:text-danger">
                              <Trash2 className="h-3.5 w-3.5" />
                            </button>
                          </div>
                        </div>
                      </div>
                    ))}
                  </CardContent>
                </Card>
              );
            })}
        </div>
      )}

      {/* Add / Edit Dialog */}
      <Dialog open={dialog !== null} onOpenChange={(v) => !v && closeDialog()}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>{dialog === "edit" ? "Edit course grade" : "Add course grade"}</DialogTitle>
          </DialogHeader>
          <form
            onSubmit={(e) => { e.preventDefault(); const fd = new FormData(e.currentTarget); dialog === "edit" ? handleUpdate(fd) : handleCreate(fd); }}
            className="space-y-4"
          >
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label>Course name</Label>
                <Input name="name" defaultValue={editing?.name ?? ""} placeholder="Data Structures" required autoFocus={dialog === "add"} />
              </div>
              <div className="space-y-1.5">
                <Label>Code (optional)</Label>
                <Input name="code" defaultValue={editing?.code ?? ""} placeholder="CS 301" />
              </div>
            </div>
            <div className="grid grid-cols-3 gap-3">
              <div className="space-y-1.5">
                <Label>Grade</Label>
                <select name="grade" defaultValue={editing?.grade ?? "B"} required
                  className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm focus:border-accent focus:outline-none">
                  {GRADE_OPTIONS.map((g) => <option key={g} value={g}>{g} ({KNUST_GRADES[g].toFixed(1)})</option>)}
                </select>
              </div>
              <div className="space-y-1.5">
                <Label>Credits</Label>
                <Input name="credits" type="number" min="1" max="6" defaultValue={editing?.credits ?? 3} required />
              </div>
              <div className="space-y-1.5">
                <Label>Year</Label>
                <select name="year" defaultValue={editing?.year ?? CURRENT_YEAR}
                  className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm focus:border-accent focus:outline-none">
                  {YEARS.map((y) => <option key={y} value={y}>{y}</option>)}
                </select>
              </div>
            </div>
            <div className="space-y-1.5">
              <Label>Semester</Label>
              <select name="semester" defaultValue={editing?.semester ?? "Semester 1"} required
                className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm focus:border-accent focus:outline-none">
                {SEMESTERS.map((s) => <option key={s} value={s}>{s}</option>)}
              </select>
            </div>
            <DialogFooter>
              <Button type="button" variant="ghost" onClick={closeDialog}><X className="h-4 w-4" /></Button>
              <Button type="submit" disabled={pending} className="gap-1.5">
                {pending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Plus className="h-4 w-4" />}
                {dialog === "edit" ? "Update" : "Add course"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
