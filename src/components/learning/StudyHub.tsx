"use client";

import { useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import {
  BookOpen,
  Bot,
  CalendarDays,
  CalendarPlus,
  FileImage,
  FileText,
  GraduationCap,
  Layers,
  Loader2,
  PenLine,
  Play,
  Plus,
  ScanText,
  Sparkles,
  Trash2,
  Upload,
  X,
  Youtube,
} from "lucide-react";

import Link from "next/link";

import { AITutorPanel } from "@/components/learning/AITutorPanel";
import { CourseIntelligence } from "@/components/learning/CourseIntelligence";
import { CourseSetupWizard } from "@/components/learning/CourseSetupWizard";
import { HandwritingCanvas } from "@/components/learning/HandwritingCanvas";
import { ExamCountdown } from "@/components/learning/ExamCountdown";
import { FlashcardsPanel } from "@/components/learning/FlashcardsPanel";
import { SlideReader } from "@/components/learning/SlideReader";
import { StudyBrainPanel } from "@/components/learning/StudyBrainPanel";
import { StudyTimer } from "@/components/learning/StudyTimer";
import { TimetableGrid } from "@/components/learning/TimetableGrid";
import { YouTubePanel } from "@/components/learning/YouTubePanel";

import {
  createStudyCourse,
  createStudyNote,
  deleteStudyCourse,
  deleteStudyNote,
} from "@/lib/actions/study";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { cn } from "@/lib/utils";

type Slot = {
  id: string;
  dayOfWeek: number;
  startTime: string;
  endTime: string;
  venue: string | null;
};

type Course = {
  id: string;
  name: string;
  code: string | null;
  color: string;
  scheduleSlots: Slot[];
  notes: {
    id: string;
    title: string;
    content: string;
    type: "NOTE" | "SUMMARY" | "LECTURE";
    updatedAt: Date;
  }[];
  materials: {
    id: string;
    title: string;
    fileName: string;
    fileUrl: string;
    mimeType: string | null;
    createdAt: Date;
  }[];
  _count: { notes: number; materials: number };
};

type Flashcard = {
  id: string;
  front: string;
  back: string;
  courseId: string | null;
  difficulty: number;
  reviewCount: number;
  nextReviewAt: Date | string | null;
};

type Deadline = {
  id: string;
  title: string;
  type: string;
  courseId: string | null;
  dueDate: Date | string;
  completed: boolean;
  course: { name: string; color: string } | null;
};

type Tab = "notes" | "summaries" | "materials" | "read" | "flashcards" | "ai-tutor" | "youtube" | "timetable" | "exams" | "handwrite";

type StreakData = { current: number; longest: number; totalSessions: number; totalMinutes: number };

export function StudyHub({
  courses: initial,
  flashcards,
  streak,
  courseTimeSecs,
  deadlines = [],
}: {
  courses: Course[];
  flashcards: Flashcard[];
  streak: StreakData;
  courseTimeSecs: Record<string, number>;
  deadlines?: Deadline[];
}) {
  const router = useRouter();
  const [courses] = useState(initial);
  const [selectedId, setSelectedId] = useState(initial[0]?.id ?? "");
  const [tab, setTab] = useState<Tab>(initial.length === 0 ? "timetable" : "notes");
  const [pending, startTransition] = useTransition();
  const [uploading, setUploading] = useState(false);
  const [planningStudy, setPlanningStudy] = useState(false);
  const [message, setMessage] = useState("");
  const [dragOver, setDragOver] = useState(false);
  const [showSetup, setShowSetup] = useState(initial.length === 0);
  const [examPrepNonce, setExamPrepNonce] = useState(0);

  function requestExamPrep() {
    setTab("ai-tutor");
    setExamPrepNonce((n) => n + 1);
  }

  const selected = useMemo(
    () => courses.find((c) => c.id === selectedId) ?? courses[0],
    [courses, selectedId]
  );

  const notes = selected?.notes.filter((n) => n.type === "NOTE" || n.type === "LECTURE") ?? [];
  const summaries = selected?.notes.filter((n) => n.type === "SUMMARY") ?? [];

  function getStudyTip(course: Course): string {
    const name = course.name.toLowerCase();
    if (name.includes("math") || name.includes("calculus") || name.includes("algebra") || name.includes("statistics"))
      return "Practice problems daily. Math is a skill, not a subject — repetition beats re-reading every time. Work through past papers.";
    if (name.includes("algorithm") || name.includes("data struct") || name.includes("discrete"))
      return "Active recall works best here. After reading, close your notes and explain the concept from memory. Implement every algorithm you study.";
    if (name.includes("physics") || name.includes("chemistry") || name.includes("biology"))
      return "Combine theory with practice problems. Draw diagrams to make abstract concepts concrete. Past exam papers are your best revision tool.";
    if (name.includes("programming") || name.includes("software") || name.includes("code") || name.includes("computer"))
      return "Build something with every concept you learn. Reading code is not the same as writing it. Upload project files and let AI help you debug and review.";
    if (name.includes("history") || name.includes("literature") || name.includes("philosophy"))
      return "Create timelines and mind maps. Focus on cause-and-effect relationships, not just dates. Write short essay outlines to test your understanding.";
    if (name.includes("account") || name.includes("finance") || name.includes("economics"))
      return "Practice journal entries and calculations daily. Flashcard key formulas and definitions. Apply theory to real-world examples you can find in the news.";
    if (name.includes("research") || name.includes("project") || name.includes("thesis"))
      return "Break the work into weekly milestones and track them here. Write consistently — even 30 minutes a day compounds fast. Start with your outline.";
    return "Spaced repetition and active recall are the two most evidence-backed study methods. Review your notes 24 hours after class, then use flashcards to test yourself.";
  }
  const courseCards = useMemo(
    () =>
      selected
        ? flashcards.filter((c) => c.courseId === selected.id || c.courseId === null)
        : flashcards,
    [flashcards, selected]
  );

  const flashcardsByCourse = useMemo(() => {
    const map: Record<string, number> = {};
    for (const f of flashcards) {
      if (f.courseId) map[f.courseId] = (map[f.courseId] ?? 0) + 1;
    }
    return map;
  }, [flashcards]);

  const dueToday = useMemo(() => {
    const now = new Date();
    return courseCards.filter((c) => !c.nextReviewAt || new Date(c.nextReviewAt as string) <= now).length;
  }, [courseCards]);

  function handleCreateCourse(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);
    startTransition(async () => {
      const res = await createStudyCourse(fd);
      if (res.error) {
        toast.error(res.error);
      } else {
        toast.success("Course added");
        setMessage("");
        (e.target as HTMLFormElement).reset();
        router.refresh();
      }
    });
  }

  function handleCreateNote(e: React.FormEvent<HTMLFormElement>, type: "NOTE" | "SUMMARY") {
    e.preventDefault();
    if (!selected) return;
    const fd = new FormData(e.currentTarget);
    fd.set("courseId", selected.id);
    fd.set("type", type);
    startTransition(async () => {
      const res = await createStudyNote(fd);
      if (res.error) {
        toast.error(res.error);
      } else {
        toast.success(type === "NOTE" ? "Note saved" : "Summary saved");
        setMessage("");
        (e.target as HTMLFormElement).reset();
        router.refresh();
      }
    });
  }

  async function handleGenerateStudyPlan() {
    setPlanningStudy(true);
    try {
      const res = await fetch("/api/study/plan", { method: "POST" });
      const data = await res.json();
      if (!res.ok) {
        toast.error(data.error ?? "Could not generate plan");
      } else {
        const parts: string[] = [];
        if (data.sessionsCreated > 0) parts.push(`${data.sessionsCreated} study session${data.sessionsCreated === 1 ? "" : "s"}`);
        if (data.tasksScheduled > 0) parts.push(`${data.tasksScheduled} task${data.tasksScheduled === 1 ? "" : "s"}`);
        toast.success(
          parts.length > 0
            ? `Timetable ready: ${parts.join(" + ")} added to your calendar for the next 7 days`
            : "No free slots found this week. Your schedule is full."
        );
        router.refresh();
      }
    } catch {
      toast.error("Failed to generate study plan");
    } finally {
      setPlanningStudy(false);
    }
  }

  // Multi-file upload state
  const [uploadFiles, setUploadFiles] = useState<File[]>([]);
  const [uploadTitle, setUploadTitle] = useState("");

  async function handleUpload(files: File[], title: string) {
    if (!selected || files.length === 0) return;
    const fd = new FormData();
    fd.set("courseId", selected.id);
    if (title.trim()) fd.set("title", title.trim());

    if (files.length === 1) {
      // Single-file path (backwards compat)
      fd.set("file", files[0]);
    } else {
      // Multi-file: append as files[]
      for (const f of files) fd.append("files[]", f);
    }

    setUploading(true);
    setMessage("");
    try {
      const res = await fetch("/api/study/upload", { method: "POST", body: fd });
      const data = await res.json();
      if (!res.ok) {
        toast.error(data.error ?? "Upload failed");
      } else {
        const uploaded = data.uploaded ?? 1;
        const failed   = data.failed ?? 0;
        setUploadFiles([]);
        setUploadTitle("");
        router.refresh();

        if (failed > 0) {
          toast.warning(`${uploaded} uploaded, ${failed} failed. Check file types.`);
        } else {
          toast.success(`${uploaded} file${uploaded !== 1 ? "s" : ""} uploaded! Generating flashcards…`);
        }

        const genRes = await fetch("/api/study/generate", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ courseId: selected.id, action: "flashcards" }),
        });
        const genData = await genRes.json();
        if (genRes.ok && genData.flashcardsCreated > 0) {
          toast.success(`${genData.flashcardsCreated} flashcards generated from your slides`, {
            action: { label: "Exam prep quiz", onClick: requestExamPrep },
          });
          router.refresh();
        } else {
          toast.success("Files uploaded. Use Study Brain to generate flashcards.");
        }
      }
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Unknown error";
      toast.error(`Upload failed: ${msg}`);
    } finally {
      setUploading(false);
    }
  }

  async function handleDeleteMaterial(materialId: string) {
    try {
      const res = await fetch(`/api/study/upload?id=${materialId}`, { method: "DELETE" });
      if (!res.ok) { toast.error("Could not delete file"); return; }
      toast.success("File removed");
      router.refresh();
    } catch {
      toast.error("Delete failed");
    }
  }

  function handleDrop(e: React.DragEvent) {
    e.preventDefault();
    setDragOver(false);
    const dropped = Array.from(e.dataTransfer.files ?? []);
    if (dropped.length > 0) setUploadFiles((prev) => [...prev, ...dropped]);
  }

  const TABS: { key: Tab; label: string; Icon: React.ElementType; badge?: number }[] = [
    { key: "notes",      label: "Notes",      Icon: FileText },
    { key: "summaries",  label: "Summaries",  Icon: BookOpen },
    { key: "handwrite",  label: "Handwrite",  Icon: PenLine },
    { key: "read",       label: "Slides",     Icon: ScanText },
    { key: "materials",  label: "Upload",     Icon: Upload },
    { key: "flashcards", label: "Flashcards", Icon: Layers, badge: dueToday },
    { key: "exams",      label: "Exams",      Icon: GraduationCap },
    { key: "ai-tutor",   label: "AI Tutor",   Icon: Bot },
    { key: "youtube",    label: "Watch",      Icon: Youtube },
    { key: "timetable",  label: "Timetable",  Icon: CalendarDays },
  ];

  return (
    <div className="space-y-6">
      {courses.length > 0 && (
        <div className="flex w-full flex-wrap gap-2">
          <button
            type="button"
            onClick={handleGenerateStudyPlan}
            disabled={planningStudy}
            className="flex flex-1 items-center justify-center gap-1.5 rounded-lg border border-accent/30 bg-accent/10 px-3 py-2 text-xs font-semibold text-accent transition-colors hover:bg-accent/20 disabled:opacity-50 sm:flex-none"
          >
            {planningStudy ? (
              <Loader2 className="h-3.5 w-3.5 animate-spin" />
            ) : (
              <CalendarPlus className="h-3.5 w-3.5" />
            )}
            Build my timetable
          </button>
          <button
            type="button"
            onClick={() => setShowSetup((v) => !v)}
            className="flex flex-1 items-center justify-center rounded-lg border border-border/60 bg-muted/50 px-3 py-2 text-xs font-semibold text-muted-foreground transition-colors hover:bg-muted sm:flex-none"
          >
            {showSetup ? "Hide setup" : "Re-run course setup"}
          </button>
        </div>
      )}

      {/* Study streak banner */}
      {(streak.current > 0 || streak.totalSessions > 0) && (
        <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
          {[
            { label: "Day streak", value: streak.current > 0 ? `${streak.current} 🔥` : "0", sub: `Best: ${streak.longest}d` },
            { label: "Sessions", value: String(streak.totalSessions), sub: "all time" },
            { label: "Time studied", value: streak.totalMinutes >= 60 ? `${Math.floor(streak.totalMinutes / 60)}h ${streak.totalMinutes % 60}m` : `${streak.totalMinutes}m`, sub: "all time" },
            { label: "Courses", value: String(initial.length), sub: `${flashcards.length} cards` },
          ].map(({ label, value, sub }) => (
            <div key={label} className="rounded-xl border border-border/60 bg-card/80 px-3 py-2.5 text-center">
              <p className="text-base font-bold text-foreground sm:text-lg">{value}</p>
              <p className="text-[11px] font-medium text-muted-foreground">{label}</p>
              <p className="text-[9px] text-muted-foreground/50">{sub}</p>
            </div>
          ))}
        </div>
      )}

      {showSetup && (
        <CourseSetupWizard
          onComplete={() => {
            setShowSetup(false);
            setTab("timetable");
          }}
        />
      )}

      {message && (
        <p className="rounded-lg border border-danger/30 bg-danger/10 px-3 py-2 text-sm text-danger">
          {message}
        </p>
      )}

      {/* Timetable tab shows all courses — no course selection needed */}
      {tab === "timetable" ? (
        <div className="space-y-4">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <h2 className="text-lg font-semibold">Weekly Timetable</h2>
            <div className="-mx-1 flex gap-1 overflow-x-auto px-1 pb-1 sm:gap-2">
              {TABS.map(({ key, label, Icon }) => (
                <button
                  key={key}
                  type="button"
                  title={label}
                  onClick={() => setTab(key)}
                  className={cn(
                    "inline-flex shrink-0 flex-col items-center gap-0.5 rounded-xl px-2.5 py-2 text-[10px] font-medium transition-colors sm:flex-row sm:gap-1.5 sm:rounded-lg sm:px-3 sm:py-2 sm:text-sm",
                    tab === key
                      ? "bg-accent text-white"
                      : "bg-muted text-muted-foreground hover:text-foreground"
                  )}
                >
                  <Icon className="h-4 w-4 shrink-0" />
                  <span className="hidden sm:inline">{label}</span>
                  <span className="sm:hidden">{label.split(" ")[0]}</span>
                </button>
              ))}
            </div>
          </div>
          {courses.length === 0 ? (
            <Card className="border-dashed border-border bg-card/50 p-10 text-center">
              <GraduationCap className="mx-auto mb-3 h-8 w-8 text-muted-foreground/40" />
              <p className="text-sm text-muted-foreground">
                Use <strong>Course Setup</strong> above to add your courses and build your timetable.
              </p>
              <button
                type="button"
                onClick={() => setShowSetup(true)}
                className="mt-3 text-sm font-semibold text-accent hover:underline"
              >
                Set up courses now →
              </button>
            </Card>
          ) : (
            <TimetableGrid courses={courses} />
          )}
        </div>
      ) : (
        <div className="grid gap-4 lg:grid-cols-[220px_1fr]">
          {/* Course sidebar — on mobile shows as horizontal scroll list above content */}
          <div className="lg:sticky lg:top-4 lg:h-fit">
            {/* Mobile: horizontal pill list + inline quick-add */}
            <div className="space-y-2 lg:hidden">
              <div className="flex gap-2 overflow-x-auto pb-1">
                {courses.map((c) => (
                  <button
                    key={c.id}
                    type="button"
                    onClick={() => setSelectedId(c.id)}
                    className={cn(
                      "flex shrink-0 items-center gap-1.5 rounded-full border px-3 py-1.5 text-xs font-medium transition-all",
                      selected?.id === c.id
                        ? "border-accent/40 bg-accent/15 text-accent"
                        : "border-border/60 bg-card/80 text-muted-foreground"
                    )}
                  >
                    <span
                      className="h-2 w-2 shrink-0 rounded-full"
                      style={{ backgroundColor: c.color }}
                    />
                    <span className="max-w-[140px] truncate">{c.name}</span>
                  </button>
                ))}
                <button
                  type="button"
                  onClick={() => setShowSetup(true)}
                  className="flex shrink-0 items-center gap-1 rounded-full border border-dashed border-border/60 bg-muted/30 px-3 py-1.5 text-xs font-medium text-muted-foreground"
                >
                  <Plus className="h-3 w-3" />
                  Add course
                </button>
              </div>
            </div>

            {/* Desktop: vertical card */}
            <Card className="hidden border-border/70 bg-card/80 lg:block">
              <CardHeader className="pb-3">
                <CardTitle className="text-base">Courses</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <ul className="space-y-1">
                  {courses.map((c) => (
                    <li key={c.id}>
                      <button
                        type="button"
                        onClick={() => setSelectedId(c.id)}
                        className={cn(
                          "flex w-full items-center gap-2 rounded-lg px-3 py-2 text-left text-sm transition-colors",
                          selected?.id === c.id
                            ? "bg-accent/15 text-accent ring-1 ring-accent/25"
                            : "text-muted-foreground hover:bg-muted hover:text-foreground"
                        )}
                      >
                        <span
                          className="h-2.5 w-2.5 shrink-0 rounded-full"
                          style={{ backgroundColor: c.color }}
                        />
                        <span className="min-w-0 flex-1 truncate font-medium">{c.name}</span>
                        <CourseRing
                          notes={c._count.notes}
                          materials={c._count.materials}
                          cards={flashcardsByCourse[c.id] ?? 0}
                        />
                      </button>
                    </li>
                  ))}
                </ul>

                <form onSubmit={handleCreateCourse} className="space-y-2 border-t border-border pt-3">
                  <Label htmlFor="course-name-desk" className="text-xs">Add class</Label>
                  <Input id="course-name-desk" name="name" placeholder="e.g. Data Structures" required />
                  <Input name="code" placeholder="Code (DSA101)" />
                  <div className="flex items-center gap-2">
                    <label className="text-xs text-muted-foreground">Color</label>
                    <input
                      name="color"
                      type="color"
                      defaultValue="#3b82f6"
                      className="h-7 w-10 cursor-pointer rounded border border-border bg-transparent"
                    />
                  </div>
                  <Button type="submit" size="sm" className="w-full gap-1" disabled={pending}>
                    {pending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Plus className="h-4 w-4" />}
                    Add course
                  </Button>
                </form>
              </CardContent>
            </Card>
          </div>

          {/* Course detail */}
          {selected ? (
            <div className="min-w-0 space-y-4">
              {/* Course header */}
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div className="min-w-0">
                  <h2 className="truncate text-lg font-bold text-foreground sm:text-xl">{selected.name}</h2>
                  {selected.code && (
                    <p className="text-sm text-muted-foreground">{selected.code}</p>
                  )}
                </div>
                <div className="flex shrink-0 items-center gap-2">
                  <Link
                    href={`/session/${selected.id}`}
                    className="flex items-center gap-1.5 rounded-lg bg-accent px-3 py-1.5 text-xs font-semibold text-white transition-opacity hover:opacity-90 sm:px-4 sm:py-2 sm:text-sm"
                  >
                    <Play className="h-3.5 w-3.5" />
                    Study session
                  </Link>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="text-danger hover:text-danger"
                    onClick={() => {
                      if (confirm("Delete this course and all notes?")) {
                        startTransition(async () => {
                          await deleteStudyCourse(selected.id);
                          toast.success("Course deleted");
                          router.refresh();
                        });
                      }
                    }}
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              </div>

              {/* Study tip */}
              <div className="flex items-start gap-3 rounded-xl border border-border/60 bg-muted/30 px-4 py-3">
                <Sparkles className="mt-0.5 h-4 w-4 shrink-0 text-accent" />
                <p className="min-w-0 flex-1 text-sm text-muted-foreground">{getStudyTip(selected)}</p>
              </div>

              <StudyBrainPanel courseId={selected.id} courseName={selected.name} />

              <CourseIntelligence
                courses={courses}
                flashcards={flashcards}
                streak={streak}
                deadlines={deadlines}
                selectedCourseId={selected.id}
              />

              <StudyTimer courseId={selected.id} courseName={selected.name} />

              {/* Tabs — icon-only on mobile, icon+label on desktop */}
              <div className="-mx-1 flex gap-1 overflow-x-auto px-1 pb-1 sm:gap-2">
                {TABS.map(({ key, label, Icon, badge }) => (
                  <button
                    key={key}
                    type="button"
                    title={label}
                    onClick={() => setTab(key)}
                    className={cn(
                      "relative inline-flex shrink-0 flex-col items-center gap-0.5 rounded-xl px-2.5 py-2 text-[10px] font-medium transition-colors sm:flex-row sm:gap-1.5 sm:rounded-lg sm:px-3 sm:py-2 sm:text-sm",
                      tab === key
                        ? "bg-accent text-white"
                        : "bg-muted text-muted-foreground hover:text-foreground"
                    )}
                  >
                    <Icon className="h-4 w-4 shrink-0" />
                    <span className="hidden sm:inline">{label}</span>
                    <span className="sm:hidden">{label.split(" ")[0]}</span>
                    {badge != null && badge > 0 && (
                      <span className={cn(
                        "absolute -right-1 -top-1 flex h-4 min-w-4 items-center justify-center rounded-full px-1 text-[9px] font-bold sm:static sm:rounded-full sm:px-1.5 sm:py-0.5 sm:text-[10px]",
                        tab === key ? "bg-white/30 text-white" : "bg-warning/20 text-warning"
                      )}>
                        {badge}
                      </span>
                    )}
                  </button>
                ))}
              </div>

              {tab === "notes" && (
                <div className="grid gap-4 lg:grid-cols-2">
                  <Card className="border-border/70 bg-card/80">
                    <CardHeader>
                      <CardTitle className="text-base">New lecture note</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <form onSubmit={(e) => handleCreateNote(e, "NOTE")} className="space-y-3">
                        <Input name="title" placeholder="Topic (e.g. Binary trees)" required />
                        <Textarea name="content" placeholder="What was covered in class today..." rows={6} />
                        <Button type="submit" disabled={pending} className="w-full">Save note</Button>
                      </form>
                    </CardContent>
                  </Card>
                  <div className="space-y-3">
                    {notes.length === 0 ? (
                      <p className="text-sm text-muted-foreground">No notes yet for this class.</p>
                    ) : (
                      notes.map((n) => (
                        <Card key={n.id} className="border-border/70 bg-card/80">
                          <CardContent className="pt-4">
                            <div className="flex items-start justify-between gap-2">
                              <p className="font-medium">{n.title}</p>
                              <button
                                type="button"
                                className="text-muted-foreground hover:text-danger"
                                onClick={() =>
                                  startTransition(async () => {
                                    await deleteStudyNote(n.id);
                                    toast.success("Note deleted");
                                    router.refresh();
                                  })
                                }
                              >
                                <Trash2 className="h-4 w-4" />
                              </button>
                            </div>
                            <p className="mt-2 whitespace-pre-wrap text-sm text-muted-foreground">
                              {n.content || "No content"}
                            </p>
                          </CardContent>
                        </Card>
                      ))
                    )}
                  </div>
                </div>
              )}

              {tab === "summaries" && (
                <div className="grid gap-4 lg:grid-cols-2">
                  <Card className="border-border/70 bg-card/80">
                    <CardHeader>
                      <CardTitle className="text-base">Write a summary</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <form onSubmit={(e) => handleCreateNote(e, "SUMMARY")} className="space-y-3">
                        <Input name="title" placeholder="Summary title" required />
                        <Textarea name="content" placeholder="Key ideas in your own words..." rows={8} />
                        <Button type="submit" disabled={pending} className="w-full">Save summary</Button>
                      </form>
                    </CardContent>
                  </Card>
                  <div className="space-y-3">
                    {summaries.length === 0 ? (
                      <p className="text-sm text-muted-foreground">
                        Summaries help you revise before exams. Add one after each session.
                      </p>
                    ) : (
                      summaries.map((n) => (
                        <Card key={n.id} className="border-border/70 bg-card/80">
                          <CardContent className="pt-4">
                            <p className="font-medium">{n.title}</p>
                            <p className="mt-2 whitespace-pre-wrap text-sm text-muted-foreground">
                              {n.content}
                            </p>
                          </CardContent>
                        </Card>
                      ))
                    )}
                  </div>
                </div>
              )}

              {tab === "read" && (
                <SlideReader materials={selected.materials} courseId={selected.id} onRequestExamPrep={requestExamPrep} />
              )}

              {tab === "handwrite" && (
                <HandwritingCanvas
                  courseId={selected.id}
                  onSave={(_dataUrl, transcription) => {
                    if (transcription) {
                      router.refresh();
                    }
                  }}
                />
              )}

              {tab === "ai-tutor" && (
                <AITutorPanel
                  key={`${selected.id}-${examPrepNonce}`}
                  courseId={selected.id}
                  courseName={selected.name}
                  initialMode={examPrepNonce > 0 ? "examPrep" : undefined}
                />
              )}

              {tab === "youtube" && (
                <YouTubePanel courseId={selected.id} />
              )}

              {tab === "flashcards" && (
                <FlashcardsPanel
                  cards={courseCards}
                  courseId={selected.id}
                  courseName={selected.name}
                  onRequestExamPrep={requestExamPrep}
                />
              )}

              {tab === "exams" && (
                <ExamCountdown
                  deadlines={deadlines.filter((d) => d.courseId === selected.id)}
                  courseName={selected.name}
                />
              )}

              {tab === "materials" && (
                <div className="space-y-4">
                  {/* Multi-file upload zone */}
                  <div
                    onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
                    onDragLeave={() => setDragOver(false)}
                    onDrop={handleDrop}
                    className={cn(
                      "rounded-2xl border-2 border-dashed p-6 text-center transition-all",
                      dragOver
                        ? "border-accent bg-accent/10"
                        : uploadFiles.length > 0
                          ? "border-success/50 bg-success/5"
                          : "border-border/60 bg-muted/20 hover:border-accent/40 hover:bg-accent/5"
                    )}
                  >
                    {uploadFiles.length > 0 ? (
                      <div className="space-y-3">
                        {/* File list preview */}
                        <div className="space-y-1.5 max-h-40 overflow-y-auto">
                          {uploadFiles.map((f, i) => (
                            <div key={i} className="flex items-center gap-2 rounded-lg border border-border/50 bg-background/50 px-3 py-2">
                              {f.type.startsWith("image/") ? (
                                <FileImage className="h-4 w-4 shrink-0 text-blue-400" />
                              ) : (
                                <FileText className="h-4 w-4 shrink-0 text-red-400" />
                              )}
                              <span className="min-w-0 flex-1 truncate text-xs font-medium text-foreground">{f.name}</span>
                              <span className="shrink-0 text-[10px] text-muted-foreground/60">{(f.size / 1024).toFixed(0)} KB</span>
                              <button
                                type="button"
                                onClick={() => setUploadFiles((prev) => prev.filter((_, idx) => idx !== i))}
                                className="shrink-0 rounded p-0.5 text-muted-foreground/40 hover:text-danger"
                              >
                                <X className="h-3.5 w-3.5" />
                              </button>
                            </div>
                          ))}
                        </div>
                        {/* Optional label + action buttons */}
                        <div className="flex flex-col items-center gap-2">
                          <Input
                            value={uploadTitle}
                            onChange={(e) => setUploadTitle(e.target.value)}
                            placeholder={uploadFiles.length > 1 ? "Batch label (optional)" : "Label (e.g. Week 4 slides)"}
                            className="h-8 max-w-xs text-sm"
                          />
                          <div className="flex gap-2">
                            <Button
                              size="sm"
                              className="gap-1.5"
                              disabled={uploading}
                              onClick={() => handleUpload(uploadFiles, uploadTitle)}
                            >
                              {uploading
                                ? <Loader2 className="h-3.5 w-3.5 animate-spin" />
                                : <Upload className="h-3.5 w-3.5" />
                              }
                              {uploading
                                ? "Uploading…"
                                : `Upload ${uploadFiles.length} file${uploadFiles.length !== 1 ? "s" : ""}`
                              }
                            </Button>
                            <Button size="sm" variant="outline" onClick={() => setUploadFiles([])}>
                              Clear
                            </Button>
                          </div>
                        </div>
                        {/* Add more files */}
                        <label className="inline-flex cursor-pointer items-center gap-1 text-xs text-accent hover:underline">
                          <Plus className="h-3 w-3" />
                          Add more files
                          <input
                            type="file"
                            accept=".pdf,.png,.jpg,.jpeg,.webp,.ppt,.pptx"
                            multiple
                            className="hidden"
                            onChange={(e) => {
                              const picked = Array.from(e.target.files ?? []);
                              if (picked.length) setUploadFiles((prev) => [...prev, ...picked]);
                            }}
                          />
                        </label>
                      </div>
                    ) : (
                      <>
                        <Upload className="mx-auto h-8 w-8 text-muted-foreground/40" />
                        <p className="mt-2 text-sm font-medium text-muted-foreground">
                          Drag & drop lecture slides here
                        </p>
                        <p className="text-xs text-muted-foreground/50 mt-1">
                          PDF, PNG, JPG, WEBP, PPT, PPTX · up to 12 MB each · up to 20 files at once
                        </p>
                        <label className="mt-4 inline-flex cursor-pointer items-center gap-1.5 rounded-lg border border-border px-3 py-1.5 text-xs font-medium text-muted-foreground hover:border-accent/40 hover:text-foreground transition-colors">
                          <Plus className="h-3.5 w-3.5" />
                          Browse files
                          <input
                            type="file"
                            accept=".pdf,.png,.jpg,.jpeg,.webp,.ppt,.pptx"
                            multiple
                            className="hidden"
                            onChange={(e) => {
                              const picked = Array.from(e.target.files ?? []);
                              if (picked.length) setUploadFiles(picked);
                            }}
                          />
                        </label>
                      </>
                    )}
                  </div>

                  {/* Files list */}
                  {selected.materials.length > 0 && (
                    <div className="space-y-2">
                      <div className="flex items-center justify-between">
                        <p className="text-xs font-semibold uppercase tracking-widest text-muted-foreground/50">
                          {selected.materials.length} file{selected.materials.length !== 1 ? "s" : ""}
                        </p>
                        <div className="flex gap-2">
                          <button
                            onClick={() => setTab("read")}
                            className="flex items-center gap-1.5 rounded-lg bg-accent/10 border border-accent/25 px-3 py-1.5 text-xs font-semibold text-accent hover:bg-accent/20 transition-colors"
                          >
                            <ScanText className="h-3.5 w-3.5" />
                            Read slides
                          </button>
                          <button
                            onClick={() => setTab("ai-tutor")}
                            className="flex items-center gap-1.5 rounded-lg bg-muted border border-border/60 px-3 py-1.5 text-xs font-semibold text-muted-foreground hover:text-foreground transition-colors"
                          >
                            <Bot className="h-3.5 w-3.5" />
                            AI Tutor
                          </button>
                          <button
                            onClick={requestExamPrep}
                            className="flex items-center gap-1.5 rounded-lg bg-rose-500/10 border border-rose-500/30 px-3 py-1.5 text-xs font-semibold text-rose-500 hover:bg-rose-500/20 transition-colors"
                          >
                            <GraduationCap className="h-3.5 w-3.5" />
                            Exam Prep Quiz
                          </button>
                        </div>
                      </div>
                      {selected.materials.map((m) => {
                        const isImg = m.mimeType?.startsWith("image/") || /\.(png|jpg|jpeg|webp)$/i.test(m.fileName);
                        return (
                          <div
                            key={m.id}
                            className="group flex items-center gap-3 rounded-xl border border-border/60 bg-card/80 px-4 py-3 hover:border-border transition-colors"
                          >
                            {isImg ? (
                              <FileImage className="h-5 w-5 shrink-0 text-blue-400" />
                            ) : (
                              <FileText className="h-5 w-5 shrink-0 text-red-400" />
                            )}
                            <div className="min-w-0 flex-1">
                              <p className="truncate text-sm font-medium">{m.title || m.fileName}</p>
                              <p className="truncate text-[11px] text-muted-foreground/60">{m.fileName}</p>
                            </div>
                            <div className="flex shrink-0 items-center gap-1 opacity-0 transition-opacity group-hover:opacity-100">
                              <a
                                href={m.fileUrl}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="rounded px-2 py-1 text-xs text-muted-foreground hover:text-foreground"
                              >
                                Open
                              </a>
                              <button
                                type="button"
                                onClick={() => handleDeleteMaterial(m.id)}
                                className="rounded p-1 text-muted-foreground/40 hover:text-danger"
                                title="Delete file"
                              >
                                <Trash2 className="h-3.5 w-3.5" />
                              </button>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}

                  {selected.materials.length === 0 && uploadFiles.length === 0 && (
                    <p className="text-center text-sm text-muted-foreground">
                      Upload your lecture slides — the AI Tutor can teach, quiz, and predict exam topics from them.
                    </p>
                  )}
                </div>
              )}
            </div>
          ) : (
            <Card className="border-dashed border-border bg-card/50 p-12 text-center">
              <p className="text-muted-foreground">
                Add your first class (e.g. Data Structures & Algorithms) to start taking notes.
              </p>
            </Card>
          )}
        </div>
      )}
    </div>
  );
}

function CourseRing({ notes, materials, cards }: { notes: number; materials: number; cards: number }) {
  const R = 8;
  const C = 2 * Math.PI * R;
  const progress = Math.min((notes / 5 + materials / 3 + cards / 10) / 3, 1);
  const offset = C * (1 - progress);
  return (
    <svg width="20" height="20" viewBox="0 0 20 20" className="-rotate-90 shrink-0" aria-hidden>
      <circle cx="10" cy="10" r={R} fill="none" strokeWidth="2.5" className="stroke-muted/40" />
      <circle
        cx="10" cy="10" r={R}
        fill="none" strokeWidth="2.5"
        strokeLinecap="round"
        strokeDasharray={C}
        strokeDashoffset={offset}
        className="stroke-accent transition-all duration-500"
      />
    </svg>
  );
}
