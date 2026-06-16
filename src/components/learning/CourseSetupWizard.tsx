"use client";

import { useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import { toast } from "sonner";
import {
  BookOpen, Calendar, Check, ChevronRight,
  FileText, GraduationCap, Loader2, Plus, Sparkles, Trash2, Upload, Users, X, Wand2,
} from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { cn } from "@/lib/utils";

// ── KNUST CSM preset (Year 3 Sem 2) ─────────────────────────────────────────
const KNUST_COURSES = [
  { code: "CSM 388", name: "Data Structures II",              color: "#3b82f6", credits: 3, slots: [{ day: "Mon", time: "10:30–11:25", venue: "SCB-SF20" }, { day: "Tue", time: "10:30–11:25", venue: "FF17" }] },
  { code: "CSM 352", name: "Computer Architecture",           color: "#8b5cf6", credits: 3, slots: [{ day: "Mon", time: "13:00–13:55", venue: "SCB-SF7" }, { day: "Thu", time: "18:00–18:55", venue: "FF17" }] },
  { code: "CSM 354", name: "Computer Graphics",              color: "#ec4899", credits: 2, slots: [{ day: "Mon", time: "17:00–17:55", venue: "SCB-SF19" }, { day: "Tue", time: "15:00–15:55", venue: "FF6" }] },
  { code: "CSM 374", name: "Real-Time and Embedded Systems", color: "#ef4444", credits: 2, slots: [{ day: "Tue", time: "13:00–13:55", venue: "FF17" }, { day: "Fri", time: "17:00–17:55", venue: "SCB-TF1" }] },
  { code: "CSM 358", name: "E-Commerce",                     color: "#f59e0b", credits: 3, slots: [{ day: "Wed", time: "15:00–15:55", venue: "SCB-SF19" }] },
  { code: "CSM 394", name: "Operations Research II",         color: "#a855f7", credits: 2, slots: [{ day: "Wed", time: "16:00–16:55", venue: "SCB-SF7" }, { day: "Thu", time: "17:00–17:55", venue: "DCB-FF24" }] },
  { code: "ACF 256", name: "Financial Accounting II",        color: "#f97316", credits: 2, slots: [{ day: "Thu", time: "08:00–08:55", venue: "SCB-SF19" }] },
  { code: "CSM 376", name: "Research Method and IT Project", color: "#06b6d4", credits: 2, slots: [{ day: "Thu", time: "10:30–11:25", venue: "SCB-SF1" }] },
  { code: "CSM 366", name: "Mini Project",                   color: "#22c55e", credits: 2, slots: [{ day: "Fri", time: "10:30–14:55", venue: "—" }] },
] as const;

const COURSE_COLORS = [
  "#3b82f6", "#8b5cf6", "#ec4899", "#ef4444",
  "#f59e0b", "#a855f7", "#06b6d4", "#22c55e", "#f97316", "#14b8a6",
];

type ManualCourse = { name: string; code: string; color: string; credits: number };
type Step = "method" | "preset-choose" | "preset-confirm" | "manual" | "ai-import" | "ai-review" | "done";

interface CourseSetupWizardProps {
  onComplete?: () => void;
}

export function CourseSetupWizard({ onComplete }: CourseSetupWizardProps) {
  const router = useRouter();
  const fileRef = useRef<HTMLInputElement>(null);
  const [step, setStep] = useState<Step>("method");
  const [loading, setLoading] = useState(false);
  const [selected, setSelected] = useState<Set<string>>(new Set(KNUST_COURSES.map((c) => c.code)));
  const [result, setResult] = useState<{ courses: number; events: number } | null>(null);

  // Manual entry state
  const [manualCourses, setManualCourses] = useState<ManualCourse[]>([
    { name: "", code: "", color: COURSE_COLORS[0], credits: 3 },
  ]);
  const [savingManual, setSavingManual] = useState(false);

  // AI import state
  const [aiText, setAiText] = useState("");
  const [aiFile, setAiFile] = useState<File | null>(null);
  const [aiLoading, setAiLoading] = useState(false);
  const [aiExtracted, setAiExtracted] = useState<ManualCourse[]>([]);

  function togglePreset(code: string) {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(code)) next.delete(code); else next.add(code);
      return next;
    });
  }

  function addManualRow() {
    setManualCourses((prev) => [
      ...prev,
      { name: "", code: "", color: COURSE_COLORS[prev.length % COURSE_COLORS.length], credits: 3 },
    ]);
  }

  function removeManualRow(i: number) {
    setManualCourses((prev) => prev.filter((_, idx) => idx !== i));
  }

  function updateManualRow(i: number, field: keyof ManualCourse, value: string | number) {
    setManualCourses((prev) => prev.map((c, idx) => idx === i ? { ...c, [field]: value } : c));
  }

  function updateExtractedRow(i: number, field: keyof ManualCourse, value: string | number) {
    setAiExtracted((prev) => prev.map((c, idx) => idx === i ? { ...c, [field]: value } : c));
  }

  function removeExtractedRow(i: number) {
    setAiExtracted((prev) => prev.filter((_, idx) => idx !== i));
  }

  async function runAiExtraction() {
    if (!aiText.trim() && !aiFile) {
      toast.error("Paste your course list or upload a document first");
      return;
    }
    setAiLoading(true);
    try {
      const fd = new FormData();
      if (aiFile) {
        fd.set("file", aiFile);
      } else {
        fd.set("text", aiText.trim());
      }
      const res = await fetch("/api/study/extract-courses", { method: "POST", body: fd });
      const data = await res.json() as { courses?: ManualCourse[]; error?: string };
      if (!res.ok || data.error) throw new Error(data.error ?? "Extraction failed");
      if (!data.courses?.length) {
        toast.error("No courses found. Try pasting your course registration text.");
        return;
      }
      setAiExtracted(data.courses);
      setStep("ai-review");
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "AI extraction failed. Try again.");
    } finally {
      setAiLoading(false);
    }
  }

  async function applyKnustPreset() {
    setLoading(true);
    try {
      const presetRes = await fetch("/api/setup/courses");
      if (!presetRes.ok) throw new Error(`Could not load course preset (${presetRes.status})`);
      const preset = await presetRes.json() as { preset: { courses: { code: string }[] } };
      const selectedCourses = preset.preset.courses.filter((c: { code: string }) => selected.has(c.code));

      const res = await fetch("/api/setup/courses", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ courses: selectedCourses, group: 1 }),
      });

      let data: { error?: string; coursesCreated?: number; generatedEvents?: number } = {};
      try { data = await res.json(); } catch { throw new Error("Unexpected server response"); }
      if (!res.ok) throw new Error(data.error ?? "Setup failed");

      setResult({ courses: data.coursesCreated ?? 0, events: data.generatedEvents ?? 0 });
      setStep("done");
      router.refresh();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Setup failed. Try again.");
    } finally {
      setLoading(false);
    }
  }

  async function saveManualCourses(courses: ManualCourse[] = manualCourses) {
    const valid = courses.filter((c) => c.name.trim());
    if (valid.length === 0) { toast.error("Add at least one course name"); return; }
    setSavingManual(true);
    try {
      let created = 0;
      for (const c of valid) {
        const fd = new FormData();
        fd.set("name", c.name.trim());
        if (c.code.trim()) fd.set("code", c.code.trim());
        fd.set("color", c.color);
        fd.set("credits", String(c.credits));
        const res = await fetch("/api/study/courses", { method: "POST", body: fd });
        if (res.ok) created++;
      }
      setResult({ courses: created, events: 0 });
      setStep("done");
      router.refresh();
    } catch {
      toast.error("Could not save courses. Try again.");
    } finally {
      setSavingManual(false);
    }
  }

  return (
    <div className="w-full overflow-hidden rounded-2xl border border-border/80 bg-card shadow-sm">
      {/* Header */}
      <div className="border-b border-border/60 bg-linear-to-r from-accent/5 to-transparent px-6 py-5">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-accent/15 text-accent">
            <GraduationCap className="h-5 w-5" />
          </div>
          <div>
            <h2 className="text-base font-semibold text-foreground">Set up your courses</h2>
            <p className="text-xs text-muted-foreground">Your courses are private — only you can see them</p>
          </div>
        </div>
      </div>

      <AnimatePresence mode="wait">

        {/* ── Method chooser ── */}
        {step === "method" && (
          <motion.div key="method" initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -8 }} transition={{ duration: 0.2 }} className="p-6 space-y-3">
            <p className="text-sm text-muted-foreground mb-4">How would you like to add your courses?</p>

            {/* AI Smart Import */}
            <button
              onClick={() => setStep("ai-import")}
              className="flex w-full items-start gap-4 rounded-xl border-2 border-accent/30 bg-accent/5 p-4 text-left transition-all hover:border-accent/60 hover:bg-accent/10"
            >
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-accent/20 text-accent">
                <Wand2 className="h-5 w-5" />
              </div>
              <div className="flex-1">
                <div className="flex items-center gap-2">
                  <p className="font-semibold text-foreground">Smart import</p>
                  <span className="rounded-full bg-accent/15 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide text-accent">AI</span>
                </div>
                <p className="mt-0.5 text-xs text-muted-foreground">
                  Paste your course list or upload your timetable — AI extracts everything automatically
                </p>
              </div>
              <ChevronRight className="ml-auto mt-2 h-4 w-4 shrink-0 text-muted-foreground" />
            </button>

            {/* KNUST Preset */}
            <button
              onClick={() => setStep("preset-choose")}
              className="flex w-full items-start gap-4 rounded-xl border border-border/70 bg-background/50 p-4 text-left transition-all hover:border-border hover:bg-muted/20"
            >
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-muted/50 text-muted-foreground">
                <Sparkles className="h-5 w-5" />
              </div>
              <div>
                <p className="font-semibold text-foreground">Use KNUST CSM preset</p>
                <p className="mt-0.5 text-xs text-muted-foreground">
                  BSc Computer Science Year 3 Sem 2 · auto-fills timetable and calendar
                </p>
              </div>
              <ChevronRight className="ml-auto mt-2 h-4 w-4 shrink-0 text-muted-foreground" />
            </button>

            {/* Manual entry */}
            <button
              onClick={() => setStep("manual")}
              className="flex w-full items-start gap-4 rounded-xl border border-border/70 bg-background/50 p-4 text-left transition-all hover:border-border hover:bg-muted/20"
            >
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-muted/50 text-muted-foreground">
                <BookOpen className="h-5 w-5" />
              </div>
              <div>
                <p className="font-semibold text-foreground">Add manually</p>
                <p className="mt-0.5 text-xs text-muted-foreground">
                  Type each course name, code, and credits yourself
                </p>
              </div>
              <ChevronRight className="ml-auto mt-2 h-4 w-4 shrink-0 text-muted-foreground" />
            </button>
          </motion.div>
        )}

        {/* ── AI Smart Import ── */}
        {step === "ai-import" && (
          <motion.div key="ai-import" initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -8 }} transition={{ duration: 0.2 }} className="p-6 space-y-4">
            <div className="flex items-center gap-2 rounded-xl border border-accent/20 bg-accent/5 px-4 py-3 text-sm text-accent">
              <Wand2 className="h-4 w-4 shrink-0" />
              <span>Paste your course schedule or upload a document — AI will extract your courses.</span>
            </div>

            {/* File upload zone */}
            <div>
              <p className="mb-2 text-xs font-semibold uppercase tracking-widest text-muted-foreground/50">
                Upload timetable / course list
              </p>
              <button
                type="button"
                onClick={() => fileRef.current?.click()}
                className={cn(
                  "flex w-full flex-col items-center gap-2 rounded-xl border-2 border-dashed py-5 transition-colors",
                  aiFile
                    ? "border-accent/40 bg-accent/5"
                    : "border-border/60 bg-muted/20 hover:border-accent/30 hover:bg-accent/5"
                )}
              >
                {aiFile ? (
                  <>
                    <FileText className="h-6 w-6 text-accent" />
                    <div className="text-center">
                      <p className="text-sm font-medium text-foreground">{aiFile.name}</p>
                      <p className="text-xs text-muted-foreground">{(aiFile.size / 1024).toFixed(0)} KB · click to change</p>
                    </div>
                  </>
                ) : (
                  <>
                    <Upload className="h-6 w-6 text-muted-foreground/50" />
                    <div className="text-center">
                      <p className="text-sm font-medium text-muted-foreground">Drop a PDF or screenshot here</p>
                      <p className="text-xs text-muted-foreground/50">PDF, PNG, JPG, WEBP</p>
                    </div>
                  </>
                )}
              </button>
              <input
                ref={fileRef}
                type="file"
                accept=".pdf,image/png,image/jpeg,image/webp"
                className="hidden"
                onChange={(e) => {
                  const f = e.target.files?.[0];
                  if (f) { setAiFile(f); setAiText(""); }
                }}
              />
            </div>

            <div className="flex items-center gap-3">
              <div className="h-px flex-1 bg-border/50" />
              <span className="text-xs text-muted-foreground/40">or paste text</span>
              <div className="h-px flex-1 bg-border/50" />
            </div>

            {/* Text paste */}
            <div>
              <p className="mb-2 text-xs font-semibold uppercase tracking-widest text-muted-foreground/50">
                Paste course list
              </p>
              <textarea
                value={aiText}
                onChange={(e) => { setAiText(e.target.value); if (e.target.value) setAiFile(null); }}
                placeholder={"CSM 388 Data Structures II - 3 credits\nCSM 354 Computer Graphics - 2 credits\n\nOr paste your course registration page content..."}
                rows={5}
                className="w-full rounded-xl border border-border/70 bg-muted/30 px-3 py-2.5 text-sm text-foreground outline-none placeholder:text-muted-foreground/30 focus:border-accent focus:ring-1 focus:ring-accent/15 resize-none"
              />
            </div>

            <div className="flex items-center justify-between pt-1">
              <button onClick={() => setStep("method")} className="text-xs text-muted-foreground hover:text-foreground">← Back</button>
              <Button
                onClick={runAiExtraction}
                disabled={aiLoading || (!aiText.trim() && !aiFile)}
                className="gap-2"
              >
                {aiLoading ? (
                  <><Loader2 className="h-4 w-4 animate-spin" /> Extracting...</>
                ) : (
                  <><Wand2 className="h-4 w-4" /> Extract courses</>
                )}
              </Button>
            </div>
          </motion.div>
        )}

        {/* ── AI Review extracted courses ── */}
        {step === "ai-review" && (
          <motion.div key="ai-review" initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -8 }} transition={{ duration: 0.2 }} className="p-6">
            <div className="mb-4 flex items-center gap-2 rounded-xl border border-success/20 bg-success/5 px-3 py-2.5 text-sm text-success">
              <Sparkles className="h-4 w-4 shrink-0" />
              <span>AI found {aiExtracted.length} courses. Review and edit before saving.</span>
            </div>
            <div className="space-y-2.5 max-h-72 overflow-y-auto pr-1">
              {aiExtracted.map((c, i) => (
                <div key={i} className="flex items-center gap-2 rounded-xl border border-border/60 bg-muted/20 p-2.5">
                  <div className="relative shrink-0">
                    <div className="h-6 w-6 rounded-full cursor-pointer border-2 border-white/20 shadow-sm" style={{ backgroundColor: c.color }} />
                    <input
                      type="color"
                      value={c.color}
                      onChange={(e) => updateExtractedRow(i, "color", e.target.value)}
                      className="absolute inset-0 h-full w-full cursor-pointer opacity-0"
                    />
                  </div>
                  <div className="flex flex-1 flex-col gap-1 sm:flex-row">
                    <Input
                      value={c.name}
                      onChange={(e) => updateExtractedRow(i, "name", e.target.value)}
                      placeholder="Course name"
                      className="h-7 flex-1 text-xs"
                    />
                    <Input
                      value={c.code}
                      onChange={(e) => updateExtractedRow(i, "code", e.target.value)}
                      placeholder="Code"
                      className="h-7 w-24 shrink-0 text-xs"
                    />
                    <div className="flex items-center gap-1">
                      <Input
                        type="number" min="1" max="6"
                        value={c.credits}
                        onChange={(e) => updateExtractedRow(i, "credits", parseInt(e.target.value) || 3)}
                        className="h-7 w-14 shrink-0 text-xs"
                      />
                      <Label className="shrink-0 text-[10px] text-muted-foreground">cr</Label>
                    </div>
                  </div>
                  <button onClick={() => removeExtractedRow(i)} className="shrink-0 rounded p-1 text-muted-foreground/30 hover:text-danger">
                    <X className="h-3.5 w-3.5" />
                  </button>
                </div>
              ))}
            </div>
            <button
              onClick={() => setAiExtracted((prev) => [...prev, { name: "", code: "", color: COURSE_COLORS[prev.length % COURSE_COLORS.length], credits: 3 }])}
              className="mt-2 flex items-center gap-1.5 text-xs text-accent hover:underline"
            >
              <Plus className="h-3.5 w-3.5" /> Add another
            </button>
            <div className="mt-5 flex items-center justify-between">
              <button onClick={() => setStep("ai-import")} className="text-xs text-muted-foreground hover:text-foreground">← Re-import</button>
              <Button onClick={() => saveManualCourses(aiExtracted)} disabled={savingManual || aiExtracted.filter((c) => c.name.trim()).length === 0} className="gap-2">
                {savingManual ? <Loader2 className="h-4 w-4 animate-spin" /> : <Check className="h-4 w-4" />}
                Save {aiExtracted.filter((c) => c.name.trim()).length} courses
              </Button>
            </div>
          </motion.div>
        )}

        {/* ── Preset: Choose courses ── */}
        {step === "preset-choose" && (
          <motion.div key="preset-choose" initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -8 }} transition={{ duration: 0.2 }} className="p-6">
            <div className="mb-4 flex items-center gap-2 rounded-xl border border-accent/20 bg-accent/5 px-4 py-3 text-sm text-accent">
              <Sparkles className="h-4 w-4 shrink-0" />
              <span>KNUST CS3 timetable detected. Select your courses.</span>
            </div>
            <div className="mb-2 flex items-center gap-2">
              <Users className="h-3.5 w-3.5 text-muted-foreground" />
              <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                Group 1 schedule · 9 courses · 21 credits
              </span>
            </div>
            <div className="mt-3 space-y-2">
              {KNUST_COURSES.map((course) => {
                const isSelected = selected.has(course.code);
                return (
                  <button key={course.code} type="button" onClick={() => togglePreset(course.code)}
                    className={cn("flex w-full items-start gap-3 rounded-xl border p-3 text-left transition-all",
                      isSelected ? "border-accent/30 bg-accent/5" : "border-border/50 bg-background/50 opacity-60 hover:opacity-80"
                    )}
                  >
                    <div className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full"
                      style={{ backgroundColor: isSelected ? course.color : "transparent", border: `2px solid ${course.color}` }}>
                      {isSelected && <Check className="h-3 w-3 text-white" />}
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2">
                        <span className="rounded px-1.5 py-0.5 text-[10px] font-bold tracking-wide text-white" style={{ backgroundColor: course.color }}>{course.code}</span>
                        <span className="text-xs text-muted-foreground">{course.credits} cr</span>
                      </div>
                      <p className="mt-0.5 text-sm font-medium">{course.name}</p>
                      <div className="mt-1 flex flex-wrap gap-2">
                        {course.slots.map((s, i) => (
                          <span key={i} className="flex items-center gap-1 text-[11px] text-muted-foreground">
                            <Calendar className="h-3 w-3" />
                            {s.day} {s.time}
                            {s.venue && s.venue !== "—" && <span className="rounded bg-muted px-1 text-[10px]">{s.venue}</span>}
                          </span>
                        ))}
                      </div>
                    </div>
                  </button>
                );
              })}
            </div>
            <div className="mt-5 flex items-center justify-between">
              <button onClick={() => setStep("method")} className="text-xs text-muted-foreground hover:text-foreground">← Back</button>
              <Button onClick={() => setStep("preset-confirm")} disabled={selected.size === 0} className="gap-2">
                Continue <ChevronRight className="h-4 w-4" />
              </Button>
            </div>
          </motion.div>
        )}

        {/* ── Preset: Confirm ── */}
        {step === "preset-confirm" && (
          <motion.div key="preset-confirm" initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -8 }} transition={{ duration: 0.2 }} className="p-6">
            <h3 className="mb-1 text-sm font-semibold">Ready to apply</h3>
            <p className="mb-5 text-sm text-muted-foreground">
              This will create <strong>{selected.size} courses</strong>, build your timetable, and schedule classes on your calendar for the next 14 days.
            </p>
            <div className="mb-5 grid grid-cols-3 gap-3">
              {[
                { icon: BookOpen, label: "Courses", value: String(selected.size) },
                { icon: Calendar, label: "Calendar events", value: `${selected.size * 3}+` },
                { icon: GraduationCap, label: "Timetable slots", value: `${selected.size * 2}+` },
              ].map(({ icon: Icon, label, value }) => (
                <div key={label} className="rounded-xl border border-border/60 bg-muted/30 p-3 text-center">
                  <Icon className="mx-auto mb-1 h-4 w-4 text-accent" />
                  <p className="text-lg font-bold">{value}</p>
                  <p className="text-[10px] text-muted-foreground">{label}</p>
                </div>
              ))}
            </div>
            <div className="flex gap-2">
              <Button variant="outline" onClick={() => setStep("preset-choose")}>Back</Button>
              <Button onClick={applyKnustPreset} disabled={loading} className="flex-1 gap-2">
                {loading ? <><Loader2 className="h-4 w-4 animate-spin" /> Setting up...</> : <><Sparkles className="h-4 w-4" /> Apply preset</>}
              </Button>
            </div>
          </motion.div>
        )}

        {/* ── Manual entry ── */}
        {step === "manual" && (
          <motion.div key="manual" initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -8 }} transition={{ duration: 0.2 }} className="p-6">
            <p className="mb-4 text-sm text-muted-foreground">
              Add your courses below. You can upload slides and add notes for each one after setup.
            </p>
            <div className="space-y-3">
              {manualCourses.map((c, i) => (
                <div key={i} className="flex items-center gap-2 rounded-xl border border-border/60 bg-muted/20 p-3">
                  <div className="relative shrink-0">
                    <div className="h-7 w-7 rounded-full cursor-pointer border-2 border-white/20 shadow-sm" style={{ backgroundColor: c.color }} />
                    <input
                      type="color"
                      value={c.color}
                      onChange={(e) => updateManualRow(i, "color", e.target.value)}
                      className="absolute inset-0 h-full w-full cursor-pointer opacity-0"
                      title="Pick course color"
                    />
                  </div>
                  <div className="flex flex-1 flex-col gap-1.5 sm:flex-row">
                    <Input
                      placeholder="Course name *"
                      value={c.name}
                      onChange={(e) => updateManualRow(i, "name", e.target.value)}
                      className="h-8 flex-1 text-sm"
                    />
                    <Input
                      placeholder="Code (optional)"
                      value={c.code}
                      onChange={(e) => updateManualRow(i, "code", e.target.value)}
                      className="h-8 w-28 shrink-0 text-sm"
                    />
                    <div className="flex items-center gap-1">
                      <Input
                        type="number" min="1" max="6"
                        value={c.credits}
                        onChange={(e) => updateManualRow(i, "credits", parseInt(e.target.value) || 3)}
                        className="h-8 w-16 shrink-0 text-sm"
                        title="Credit hours"
                      />
                      <Label className="shrink-0 text-xs text-muted-foreground">cr</Label>
                    </div>
                  </div>
                  {manualCourses.length > 1 && (
                    <button onClick={() => removeManualRow(i)} className="shrink-0 rounded p-1 text-muted-foreground/40 hover:text-danger">
                      <X className="h-4 w-4" />
                    </button>
                  )}
                </div>
              ))}
            </div>
            <div className="mt-3 flex items-center justify-between">
              <button onClick={addManualRow} className="flex items-center gap-1.5 text-xs text-accent hover:underline">
                <Plus className="h-3.5 w-3.5" /> Add another course
              </button>
              <span className="text-xs text-muted-foreground">{manualCourses.filter((c) => c.name.trim()).length} course{manualCourses.filter((c) => c.name.trim()).length !== 1 ? "s" : ""} ready</span>
            </div>
            <div className="mt-5 flex gap-2">
              <button onClick={() => setStep("method")} className="text-xs text-muted-foreground hover:text-foreground">← Back</button>
              <Button onClick={() => saveManualCourses()} disabled={savingManual} className="ml-auto gap-2">
                {savingManual ? <Loader2 className="h-4 w-4 animate-spin" /> : <Check className="h-4 w-4" />}
                Save courses
              </Button>
            </div>
          </motion.div>
        )}

        {/* ── Done ── */}
        {step === "done" && result && (
          <motion.div key="done" initial={{ opacity: 0, scale: 0.97 }} animate={{ opacity: 1, scale: 1 }} transition={{ duration: 0.25 }} className="flex flex-col items-center p-8 text-center">
            <motion.div initial={{ scale: 0 }} animate={{ scale: 1 }} transition={{ type: "spring", delay: 0.1 }}
              className="flex h-16 w-16 items-center justify-center rounded-full bg-success/15 text-success">
              <Check className="h-8 w-8" />
            </motion.div>
            <h3 className="mt-4 text-lg font-bold">You&apos;re all set!</h3>
            <p className="mt-2 max-w-xs text-sm text-muted-foreground">
              {result.courses} course{result.courses !== 1 ? "s" : ""} created
              {result.events > 0 ? `, ${result.events} class events scheduled.` : "."}
              {" "}Upload slides in the Materials tab for each course.
            </p>
            <div className="mt-6 flex flex-wrap justify-center gap-2">
              <Button size="sm" onClick={() => { onComplete?.(); router.refresh(); }}>
                Go to Study Hub
              </Button>
              <Button size="sm" variant="outline" onClick={() => router.push("/calendar")}>
                View Calendar
              </Button>
            </div>
            <div className="mt-4 flex items-center gap-2 rounded-lg bg-accent/5 px-3 py-2 text-xs text-accent">
              <Upload className="h-3.5 w-3.5" />
              Upload lecture slides per course → AI can teach, quiz, and predict exam topics
            </div>
            <div className="mt-2 text-xs text-muted-foreground">
              Your courses are private. Only your account can see them.
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
