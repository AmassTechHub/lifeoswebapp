"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import {
  Award, BookOpen, Brain, ChevronDown, ChevronUp,
  Loader2, Pencil, Plus, Target, Trash2, X,
} from "lucide-react";

import { createGrade, updateGrade, deleteGrade, savePreviousRecord } from "@/lib/actions/grades";
import {
  KNUST_GRADES, ACADEMIC_CLASSES, GRADE_MIDPOINT,
  getAcademicClass, getAcademicClassByGPA, scoreToGrade,
} from "@/lib/grades-constants";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { cn } from "@/lib/utils";

type Grade = {
  id: string; name: string; code: string | null; credits: number;
  grade: string; score?: number | null; semester: string; year: number;
};

type ViewMode = "cwa" | "gpa";

const GRADE_OPTIONS = Object.keys(KNUST_GRADES);
const CURRENT_YEAR = new Date().getFullYear();
const YEARS = Array.from({ length: 6 }, (_, i) => CURRENT_YEAR - i);
const SEMESTERS = ["Semester 1", "Semester 2", "Semester 3"];

// ── Computation helpers ──────────────────────────────────────────────────────

function computeCWA(grades: Grade[], prevCWA: number | null, prevCredits: number | null): number {
  const appSum = grades.reduce((s, g) => s + (g.score ?? GRADE_MIDPOINT[g.grade] ?? 0) * g.credits, 0);
  const appCreds = grades.reduce((s, g) => s + g.credits, 0);
  const prevSum = (prevCWA ?? 0) * (prevCredits ?? 0);
  const prevCreds = prevCredits ?? 0;
  const totalCreds = appCreds + prevCreds;
  return totalCreds > 0 ? (appSum + prevSum) / totalCreds : 0;
}

function computeGPA(grades: Grade[], prevCWA: number | null, prevCredits: number | null): number {
  const appSum = grades.reduce((s, g) => s + (KNUST_GRADES[g.grade] ?? 0) * g.credits, 0);
  const appCreds = grades.reduce((s, g) => s + g.credits, 0);
  let prevGPASum = 0;
  if (prevCWA != null && prevCredits != null && prevCredits > 0) {
    prevGPASum = (KNUST_GRADES[scoreToGrade(prevCWA)] ?? 0) * prevCredits;
  }
  const totalCreds = appCreds + (prevCredits ?? 0);
  return totalCreds > 0 ? (appSum + prevGPASum) / totalCreds : 0;
}

function totalCreditsDone(grades: Grade[], prevCredits: number | null): number {
  return grades.reduce((s, g) => s + g.credits, 0) + (prevCredits ?? 0);
}

function requiredAvg(targetCWA: number, weightedSum: number, credsDone: number, remaining: number): number {
  if (remaining <= 0) return 0;
  return (targetCWA * (credsDone + remaining) - weightedSum) / remaining;
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

// ── Main Component ───────────────────────────────────────────────────────────

export function CGPATracker({
  grades: initial,
  previousCWA: initPrevCWA,
  previousCredits: initPrevCredits,
}: {
  grades: Grade[];
  previousCWA: number | null;
  previousCredits: number | null;
}) {
  const router = useRouter();
  const [grades, setGrades] = useState(initial);
  const [viewMode, setViewMode] = useState<ViewMode>("cwa");
  const [dialog, setDialog] = useState<"add" | "edit" | "prev" | null>(null);
  const [editing, setEditing] = useState<Grade | null>(null);
  const [pending, startTransition] = useTransition();
  const [prevCWA, setPrevCWA] = useState(initPrevCWA);
  const [prevCredits, setPrevCredits] = useState(initPrevCredits);
  const [remainingCredits, setRemainingCredits] = useState(0);
  const [showTargets, setShowTargets] = useState(true);
  const [aiAdvice, setAiAdvice] = useState<string | null>(null);
  const [aiLoading, setAiLoading] = useState(false);
  const [scoreInput, setScoreInput] = useState("");
  const [derivedGrade, setDerivedGrade] = useState("");

  const cwa = computeCWA(grades, prevCWA, prevCredits);
  const gpa = computeGPA(grades, prevCWA, prevCredits);
  const credsDone = totalCreditsDone(grades, prevCredits);
  const grouped = groupBySemester(grades);
  const activeClass = viewMode === "cwa" ? getAcademicClass(cwa) : getAcademicClassByGPA(gpa);
  const displayValue = credsDone > 0
    ? (viewMode === "cwa" ? cwa.toFixed(1) + "%" : gpa.toFixed(2))
    : "—";
  const barPct = Math.min((viewMode === "cwa" ? cwa / 100 : gpa / 4) * 100, 100);

  function openEdit(g: Grade) {
    setEditing(g);
    setScoreInput(g.score != null ? String(g.score) : "");
    setDerivedGrade(g.grade);
    setDialog("edit");
  }
  function closeDialog() { setDialog(null); setEditing(null); setScoreInput(""); setDerivedGrade(""); }

  function handleScoreChange(val: string) {
    setScoreInput(val);
    const n = parseFloat(val);
    setDerivedGrade(!isNaN(n) && n >= 0 && n <= 100 ? scoreToGrade(n) : "");
  }

  async function handleCreate(fd: FormData) {
    if (derivedGrade) fd.set("grade", derivedGrade);
    startTransition(async () => {
      const res = await createGrade(fd);
      if (res?.error) { toast.error(res.error); return; }
      toast.success("Course added"); closeDialog(); router.refresh();
    });
  }

  async function handleUpdate(fd: FormData) {
    if (!editing) return;
    if (derivedGrade) fd.set("grade", derivedGrade);
    startTransition(async () => {
      const res = await updateGrade(editing.id, fd);
      if (res?.error) { toast.error(res.error); return; }
      toast.success("Grade updated"); closeDialog(); router.refresh();
    });
  }

  async function handleDelete(id: string, name: string) {
    setGrades((prev) => prev.filter((g) => g.id !== id));
    startTransition(async () => {
      await deleteGrade(id);
      toast.success(`${name} removed`); router.refresh();
    });
  }

  async function handleSavePrev(fd: FormData) {
    startTransition(async () => {
      const res = await savePreviousRecord(fd);
      if (res?.error) { toast.error(res.error); return; }
      setPrevCWA(parseFloat(String(fd.get("previousCWA"))));
      setPrevCredits(parseInt(String(fd.get("previousCredits")), 10));
      toast.success("Previous record saved"); closeDialog();
    });
  }

  async function getAIAdvice() {
    setAiLoading(true);
    setAiAdvice(null);
    try {
      const res = await fetch("/api/ai/cwa-advice", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          currentCWA: cwa,
          creditsCompleted: credsDone,
          grades: grades.map((g) => ({ name: g.name, code: g.code, score: g.score, grade: g.grade, credits: g.credits })),
        }),
      });
      const data = await res.json();
      setAiAdvice(data.advice);
    } catch {
      toast.error("Could not get AI advice");
    } finally {
      setAiLoading(false);
    }
  }

  return (
    <div className="space-y-6">
      {/* ── Hero ── */}
      <div className="rounded-2xl border border-border/70 bg-card/80 p-6">
        {/* CWA / GPA toggle + Add */}
        <div className="mb-5 flex items-center justify-between">
          <div className="flex gap-1 rounded-lg border border-border/70 bg-muted/30 p-1">
            {(["cwa", "gpa"] as const).map((m) => (
              <button
                key={m}
                onClick={() => setViewMode(m)}
                className={cn(
                  "rounded-md px-5 py-1.5 text-xs font-bold uppercase tracking-wider transition-colors",
                  viewMode === m ? "bg-accent text-accent-foreground shadow-sm" : "text-muted-foreground hover:text-foreground"
                )}
              >
                {m.toUpperCase()}
              </button>
            ))}
          </div>
          <Button size="sm" className="gap-2" onClick={() => { setScoreInput(""); setDerivedGrade(""); setDialog("add"); }}>
            <Plus className="h-4 w-4" /> Add course
          </Button>
        </div>

        {/* Main metric */}
        <div>
          <p className="text-sm font-medium text-muted-foreground">
            {viewMode === "cwa" ? "Cumulative Weighted Average" : "Grade Point Average"}
          </p>
          <div className="mt-1 flex items-end gap-3">
            <span className="text-5xl font-bold tabular-nums tracking-tight">{displayValue}</span>
            {credsDone > 0 && (
              <span className="mb-1.5 text-lg text-muted-foreground">/ {viewMode === "cwa" ? "100%" : "4.00"}</span>
            )}
          </div>
          <div className="mt-2 flex flex-wrap items-center gap-2">
            {credsDone > 0 && (
              <div className={cn("inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-semibold", activeClass.color, activeClass.bgColor)}>
                <Award className="h-3.5 w-3.5" />
                {activeClass.label}
              </div>
            )}
            <span className="text-xs text-muted-foreground">
              {grades.length} course{grades.length !== 1 ? "s" : ""} · {credsDone} credit hrs
              {credsDone > 0 && viewMode === "cwa" && gpa > 0 && (
                <span className="ml-1.5 opacity-60">· GPA {gpa.toFixed(2)}</span>
              )}
              {credsDone > 0 && viewMode === "gpa" && cwa > 0 && (
                <span className="ml-1.5 opacity-60">· CWA {cwa.toFixed(1)}%</span>
              )}
            </span>
          </div>
        </div>

        {/* Progress bar */}
        {credsDone > 0 && (
          <div className="mt-5">
            <div className="h-3 w-full overflow-hidden rounded-full bg-muted/50">
              <div
                className={cn("h-full rounded-full transition-all duration-700",
                  activeClass.cwaMin >= 70 ? "bg-success" :
                  activeClass.cwaMin >= 60 ? "bg-accent" :
                  activeClass.cwaMin >= 50 ? "bg-warning" :
                  activeClass.cwaMin >= 45 ? "bg-orange-500" : "bg-danger"
                )}
                style={{ width: `${barPct}%` }}
              />
            </div>
            {/* threshold ticks */}
            <div className="relative mt-1 h-3">
              {ACADEMIC_CLASSES.filter((c) => c.cwaMin > 0 && c.cwaMin < 100).map((c) => {
                const pct = viewMode === "cwa" ? c.cwaMin : (c.gpaMin / 4) * 100;
                return (
                  <div key={c.label} className="absolute -translate-x-1/2" style={{ left: `${pct}%` }} title={`${c.label}: ${viewMode === "cwa" ? c.cwaMin + "%" : c.gpaMin}`}>
                    <div className="h-1.5 w-px bg-border/60" />
                    <span className="text-[9px] text-muted-foreground/50">{viewMode === "cwa" ? c.cwaMin : c.gpaMin}</span>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        <button
          onClick={() => setDialog("prev")}
          className="mt-4 text-xs text-muted-foreground underline-offset-2 hover:text-foreground hover:underline"
        >
          {prevCWA != null
            ? `Previous record: CWA ${prevCWA}% · ${prevCredits} credits — click to update`
            : "Import previous CWA from transcript"}
        </button>
      </div>

      {/* ── Target Calculator ── */}
      {credsDone > 0 && (
        <Card className="border-border/70 bg-card/80">
          <CardHeader className="pb-2">
            <div className="flex items-center justify-between">
              <CardTitle className="flex items-center gap-2 text-sm">
                <Target className="h-4 w-4 text-accent" />
                What do you need?
              </CardTitle>
              <button onClick={() => setShowTargets((v) => !v)} className="text-muted-foreground hover:text-foreground">
                {showTargets ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
              </button>
            </div>
          </CardHeader>
          {showTargets && (
            <CardContent className="space-y-4">
              <div className="flex items-center gap-3">
                <Label className="shrink-0 text-xs text-muted-foreground">Remaining credit hours:</Label>
                <Input
                  type="number" min="0" max="200"
                  className="h-8 w-24 text-sm"
                  value={remainingCredits || ""}
                  onChange={(e) => setRemainingCredits(parseInt(e.target.value) || 0)}
                  placeholder="e.g. 30"
                />
              </div>
              <div className="space-y-2.5">
                {ACADEMIC_CLASSES.filter((c) => c.cwaMin > 0).map((cls) => {
                  const weightedSum = cwa * credsDone;
                  const needed = requiredAvg(cls.cwaMin, weightedSum, credsDone, remainingCredits);
                  const achieved = cwa >= cls.cwaMin;
                  const impossible = needed > 100;
                  return (
                    <div key={cls.label} className="flex items-center justify-between gap-3">
                      <div className="flex items-center gap-2">
                        <span className={cn("text-xs font-semibold", cls.color)}>{cls.label}</span>
                        <span className="text-xs text-muted-foreground">≥ {cls.cwaMin}%</span>
                      </div>
                      {achieved ? (
                        <span className="rounded-full bg-success/10 px-2.5 py-0.5 text-xs font-semibold text-success">Achieved ✓</span>
                      ) : remainingCredits === 0 ? (
                        <span className="text-xs text-muted-foreground italic">Enter remaining credits →</span>
                      ) : impossible ? (
                        <span className="rounded-full bg-danger/10 px-2.5 py-0.5 text-xs text-danger">Not achievable</span>
                      ) : (
                        <span className={cn("rounded-full px-2.5 py-0.5 text-xs font-semibold", cls.bgColor, cls.color)}>
                          Avg {needed.toFixed(1)}% needed
                        </span>
                      )}
                    </div>
                  );
                })}
              </div>
            </CardContent>
          )}
        </Card>
      )}

      {/* ── AI Improvement Advisor ── */}
      {grades.length > 0 && (
        <Card className="border-border/70 bg-card/80">
          <CardContent className="pt-4">
            {!aiAdvice ? (
              <Button variant="outline" className="w-full gap-2" onClick={getAIAdvice} disabled={aiLoading}>
                {aiLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Brain className="h-4 w-4 text-accent" />}
                {aiLoading ? "Analyzing your academic record…" : "Get AI improvement advice"}
              </Button>
            ) : (
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <p className="flex items-center gap-2 text-sm font-semibold">
                    <Brain className="h-4 w-4 text-accent" />
                    AI Academic Advisor
                  </p>
                  <button onClick={() => setAiAdvice(null)} className="text-xs text-muted-foreground hover:text-foreground">
                    Refresh
                  </button>
                </div>
                <p className="whitespace-pre-wrap text-sm leading-relaxed text-foreground/80">{aiAdvice}</p>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* ── KNUST Grade Scale Reference ── */}
      <Card className="border-border/70 bg-card/80">
        <CardHeader className="pb-3">
          <CardTitle className="text-sm">KNUST Grading Scale</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
            {[
              { range: "80–100%", grade: "A",  pts: "4.0" },
              { range: "75–79%",  grade: "B+", pts: "3.5" },
              { range: "70–74%",  grade: "B",  pts: "3.0" },
              { range: "65–69%",  grade: "C+", pts: "2.5" },
              { range: "60–64%",  grade: "C",  pts: "2.0" },
              { range: "55–59%",  grade: "D+", pts: "1.5" },
              { range: "50–54%",  grade: "D",  pts: "1.0" },
              { range: "0–49%",   grade: "F",  pts: "0.0" },
            ].map(({ range, grade, pts }) => (
              <div key={grade} className="flex items-center gap-2 rounded-lg border border-border/50 bg-background/50 px-2.5 py-2">
                <div className="min-w-0">
                  <p className="text-[10px] text-muted-foreground">{range}</p>
                  <p className="text-sm font-bold">{grade}</p>
                </div>
                <span className="ml-auto text-xs text-muted-foreground">{pts}</span>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* ── Course List ── */}
      {grades.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-border bg-muted/20 px-6 py-14 text-center">
          <BookOpen className="mx-auto h-10 w-10 text-muted-foreground/30" />
          <p className="mt-3 text-sm font-medium text-muted-foreground">No courses yet</p>
          <p className="mt-1 text-xs text-muted-foreground/60">Enter your score (%) per course — grade and CWA are calculated automatically.</p>
          <Button size="sm" className="mt-4 gap-2" onClick={() => setDialog("add")}>
            <Plus className="h-4 w-4" /> Add first course
          </Button>
        </div>
      ) : (
        <div className="space-y-4">
          {Object.entries(grouped)
            .sort(([a], [b]) => b.localeCompare(a))
            .map(([semKey, semGrades]) => {
              const semCredits = semGrades.reduce((s, g) => s + g.credits, 0);
              const semCWA = semGrades.reduce((s, g) => s + (g.score ?? GRADE_MIDPOINT[g.grade] ?? 0) * g.credits, 0) / Math.max(semCredits, 1);
              const semGPA = semGrades.reduce((s, g) => s + (KNUST_GRADES[g.grade] ?? 0) * g.credits, 0) / Math.max(semCredits, 1);
              const semClass = getAcademicClass(semCWA);

              return (
                <Card key={semKey} className="border-border/70 bg-card/80">
                  <CardHeader className="pb-3">
                    <div className="flex items-center justify-between">
                      <CardTitle className="text-sm font-semibold">{semKey}</CardTitle>
                      <div className="flex items-center gap-2">
                        <span className="text-xs text-muted-foreground">{semCredits} credits</span>
                        <span className={cn("rounded-full px-2 py-0.5 text-xs font-bold", semClass.bgColor, semClass.color)}>
                          {viewMode === "cwa" ? `CWA ${semCWA.toFixed(1)}%` : `GPA ${semGPA.toFixed(2)}`}
                        </span>
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent className="space-y-2 pt-0">
                    {semGrades.map((g) => {
                      const effectiveScore = g.score ?? GRADE_MIDPOINT[g.grade] ?? 0;
                      const cls = getAcademicClass(effectiveScore);
                      return (
                        <div key={g.id} className="group flex items-center justify-between rounded-xl border border-border/50 px-3 py-2.5 transition-colors hover:bg-muted/30">
                          <div className="min-w-0">
                            <p className="truncate text-sm font-medium">{g.name}</p>
                            <p className="text-xs text-muted-foreground">
                              {g.code ? `${g.code} · ` : ""}{g.credits} cr
                            </p>
                          </div>
                          <div className="flex shrink-0 items-center gap-2">
                            {viewMode === "cwa" ? (
                              <span className={cn("text-lg font-bold", cls.color)}>
                                {g.score != null ? `${g.score}%` : g.grade}
                              </span>
                            ) : (
                              <>
                                <span className={cn("text-lg font-bold", cls.color)}>{g.grade}</span>
                                <span className="text-xs text-muted-foreground">({KNUST_GRADES[g.grade]?.toFixed(1)})</span>
                              </>
                            )}
                            <div className="flex opacity-0 transition-opacity group-hover:opacity-100">
                              <button onClick={() => openEdit(g)} className="rounded p-1 text-muted-foreground/40 hover:text-muted-foreground">
                                <Pencil className="h-3.5 w-3.5" />
                              </button>
                              <button onClick={() => handleDelete(g.id, g.name)} className="rounded p-1 text-muted-foreground/40 hover:text-danger">
                                <Trash2 className="h-3.5 w-3.5" />
                              </button>
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </CardContent>
                </Card>
              );
            })}
        </div>
      )}

      {/* ── Add / Edit Dialog ── */}
      <Dialog open={dialog === "add" || dialog === "edit"} onOpenChange={(v) => !v && closeDialog()}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>{dialog === "edit" ? "Edit course" : "Add course"}</DialogTitle>
          </DialogHeader>
          <form
            onSubmit={(e) => {
              e.preventDefault();
              const fd = new FormData(e.currentTarget);
              if (derivedGrade) fd.set("grade", derivedGrade);
              dialog === "edit" ? handleUpdate(fd) : handleCreate(fd);
            }}
            className="space-y-4"
          >
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label>Course name</Label>
                <Input name="name" defaultValue={editing?.name ?? ""} placeholder="Data Structures" required autoFocus={dialog === "add"} />
              </div>
              <div className="space-y-1.5">
                <Label>Code (optional)</Label>
                <Input name="code" defaultValue={editing?.code ?? ""} placeholder="CSM 388" />
              </div>
            </div>

            {/* Score → auto-grade */}
            <div className="space-y-1.5">
              <Label>
                Score <span className="font-normal text-muted-foreground">(% — recommended for CWA)</span>
              </Label>
              <div className="flex items-center gap-2">
                <Input
                  name="score"
                  type="number" min="0" max="100" step="0.1"
                  value={scoreInput}
                  onChange={(e) => handleScoreChange(e.target.value)}
                  placeholder="e.g. 78.5"
                  className="flex-1"
                />
                {derivedGrade && (
                  <span className="shrink-0 rounded-lg border border-border bg-muted/30 px-3 py-2 text-sm font-bold text-accent">
                    → {derivedGrade}
                  </span>
                )}
              </div>
            </div>

            <div className="grid grid-cols-3 gap-3">
              <div className="space-y-1.5">
                <Label>Grade <span className="font-normal text-muted-foreground text-[10px]">(or pick manually)</span></Label>
                <select
                  name="grade"
                  value={derivedGrade || (editing?.grade ?? "B")}
                  onChange={(e) => setDerivedGrade(e.target.value)}
                  className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm focus:border-accent focus:outline-none"
                >
                  {GRADE_OPTIONS.map((g) => <option key={g} value={g}>{g} ({KNUST_GRADES[g].toFixed(1)})</option>)}
                </select>
              </div>
              <div className="space-y-1.5">
                <Label>Credits</Label>
                <Input name="credits" type="number" min="1" max="6" defaultValue={editing?.credits ?? 3} required />
              </div>
              <div className="space-y-1.5">
                <Label>Year</Label>
                <select name="year" defaultValue={editing?.year ?? CURRENT_YEAR} className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm focus:border-accent focus:outline-none">
                  {YEARS.map((y) => <option key={y} value={y}>{y}</option>)}
                </select>
              </div>
            </div>

            <div className="space-y-1.5">
              <Label>Semester</Label>
              <select name="semester" defaultValue={editing?.semester ?? "Semester 1"} className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm focus:border-accent focus:outline-none">
                {SEMESTERS.map((s) => <option key={s} value={s}>{s}</option>)}
              </select>
            </div>

            <DialogFooter>
              <Button type="button" variant="ghost" onClick={closeDialog}><X className="h-4 w-4" /></Button>
              <Button type="submit" disabled={pending} className="gap-1.5">
                {pending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Plus className="h-4 w-4" />}
                {dialog === "edit" ? "Update" : "Add"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* ── Previous Record Dialog ── */}
      <Dialog open={dialog === "prev"} onOpenChange={(v) => !v && closeDialog()}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>Import previous record</DialogTitle>
          </DialogHeader>
          <p className="text-sm text-muted-foreground">
            Enter your CWA and total credit hours completed <strong>before</strong> using this app. Your overall CWA will be calculated correctly across all semesters.
          </p>
          <form onSubmit={(e) => { e.preventDefault(); handleSavePrev(new FormData(e.currentTarget)); }} className="space-y-4">
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label>CWA (%)</Label>
                <Input name="previousCWA" type="number" min="0" max="100" step="0.1"
                  defaultValue={prevCWA ?? ""} placeholder="e.g. 68.4" required autoFocus />
              </div>
              <div className="space-y-1.5">
                <Label>Credit hours</Label>
                <Input name="previousCredits" type="number" min="0" max="400"
                  defaultValue={prevCredits ?? ""} placeholder="e.g. 45" required />
              </div>
            </div>
            <DialogFooter>
              <Button type="button" variant="ghost" onClick={closeDialog}><X className="h-4 w-4" /></Button>
              <Button type="submit" disabled={pending} className="gap-1.5">
                {pending && <Loader2 className="h-4 w-4 animate-spin" />}
                Save
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
