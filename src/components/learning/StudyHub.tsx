"use client";

import { useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import {
  BookOpen,
  Bot,
  CalendarDays,
  FileText,
  GraduationCap,
  Layers,
  Loader2,
  Play,
  Plus,
  ScanText,
  Sparkles,
  Trash2,
  Upload,
  CalendarPlus,
} from "lucide-react";

import Link from "next/link";

import { AITutorPanel } from "@/components/learning/AITutorPanel";
import { CourseSetupWizard } from "@/components/learning/CourseSetupWizard";
import { FlashcardsPanel } from "@/components/learning/FlashcardsPanel";
import { SlideReader } from "@/components/learning/SlideReader";
import { StudyBrainPanel } from "@/components/learning/StudyBrainPanel";
import { TimetableGrid } from "@/components/learning/TimetableGrid";

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
};

type Tab = "notes" | "summaries" | "materials" | "read" | "flashcards" | "ai-tutor" | "timetable";

export function StudyHub({
  courses: initial,
  flashcards,
}: {
  courses: Course[];
  flashcards: Flashcard[];
}) {
  const router = useRouter();
  const [courses] = useState(initial);
  const [selectedId, setSelectedId] = useState(initial[0]?.id ?? "");
  const [tab, setTab] = useState<Tab>(initial.length === 0 ? "timetable" : "notes");
  const [pending, startTransition] = useTransition();
  const [uploading, setUploading] = useState(false);
  const [planningStudy, setPlanningStudy] = useState(false);
  const [message, setMessage] = useState("");
  const [showSetup, setShowSetup] = useState(initial.length === 0);

  const selected = useMemo(
    () => courses.find((c) => c.id === selectedId) ?? courses[0],
    [courses, selectedId]
  );

  const notes = selected?.notes.filter((n) => n.type === "NOTE" || n.type === "LECTURE") ?? [];
  const summaries = selected?.notes.filter((n) => n.type === "SUMMARY") ?? [];

  function getStudyTip(course: Course): string {
    const code = course.code?.toUpperCase() ?? "";
    const name = course.name.toLowerCase();
    if (code.startsWith("CSM 388") || name.includes("data struct") || name.includes("algorithm"))
      return "Active recall works best here. After reading, close your notes and explain the concept from memory. Use flashcards for each data structure.";
    if (code.startsWith("CSM 352") || name.includes("architecture"))
      return "Draw diagrams of CPU components and memory hierarchy. Self-quiz on instruction sets. Past exam questions are your best friend.";
    if (code.startsWith("CSM 354") || name.includes("graphics"))
      return "Code every algorithm you learn. Math and implementation go together here. Build small demos to reinforce the theory.";
    if (code.startsWith("CSM 374") || name.includes("embedded") || name.includes("real-time"))
      return "Timing diagrams and state machines are key. Understand the hardware side before the software. Lab exercises are more valuable than notes.";
    if (code.startsWith("CSM 358") || name.includes("commerce"))
      return "Focus on frameworks and real-world examples. Case studies over definitions. The exam tests application, not just recall.";
    if (code.startsWith("CSM 394") || name.includes("operations research"))
      return "Practice problems daily. LP, transportation, and network flow require repetition. Do not just read solutions; solve from scratch.";
    if (code.startsWith("ACF") || name.includes("account") || name.includes("finance"))
      return "Accounting rewards daily practice. Do journal entries and T-accounts every day. Flashcard the debit/credit rules until they are automatic.";
    if (code.startsWith("CSM 376") || name.includes("research") || name.includes("project"))
      return "Break your project into weekly milestones. Write first, refine later. Track progress here so nothing slips through.";
    if (code.startsWith("CSM 366") || name.includes("mini project"))
      return "Treat this like a real product. Document as you build. Consistent weekly commits matter more than last-minute pushes.";
    return "Spaced repetition and active recall are the two most evidence-backed study techniques. Review notes 24h after class and use flashcards to test yourself.";
  }
  const courseCards = useMemo(
    () =>
      selected
        ? flashcards.filter((c) => c.courseId === selected.id || c.courseId === null)
        : flashcards,
    [flashcards, selected]
  );

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
        toast.success(
          data.sessionsCreated > 0
            ? `Study plan ready: ${data.sessionsCreated} sessions added to your calendar for the next 7 days`
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

  async function handleUpload(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (!selected) return;
    const form = e.currentTarget;
    const fd = new FormData(form);
    fd.set("courseId", selected.id);
    setUploading(true);
    setMessage("");
    try {
      const res = await fetch("/api/study/upload", { method: "POST", body: fd });
      const data = await res.json();
      if (!res.ok) {
        toast.error(data.error ?? "Upload failed");
      } else {
        form.reset();
        router.refresh();
        toast.success("Slides uploaded. Generating flashcards...");
        const genRes = await fetch("/api/study/generate", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ courseId: selected.id, action: "flashcards" }),
        });
        const genData = await genRes.json();
        if (genRes.ok && genData.flashcardsCreated > 0) {
          toast.success(`${genData.flashcardsCreated} flashcards created from your slides`);
          router.refresh();
        } else {
          toast.success("File uploaded. Use Study Brain to generate flashcards.");
        }
      }
    } catch {
      toast.error("Upload failed. Check your connection.");
    } finally {
      setUploading(false);
    }
  }

  const TABS: { key: Tab; label: string; Icon: React.ElementType }[] = [
    { key: "notes",     label: "Notes",       Icon: FileText },
    { key: "summaries", label: "Summaries",   Icon: BookOpen },
    { key: "read",      label: "Read Slides", Icon: ScanText },
    { key: "materials", label: "Upload",      Icon: Upload },
    { key: "flashcards",label: "Flashcards",  Icon: Layers },
    { key: "ai-tutor",  label: "AI Tutor",    Icon: Bot },
    { key: "timetable", label: "Timetable",   Icon: CalendarDays },
  ];

  return (
    <div className="space-y-6">
      <div className="flex items-start gap-3 rounded-2xl border border-accent/20 bg-accent/5 p-4 sm:p-5">
        <Sparkles className="mt-0.5 h-5 w-5 shrink-0 text-accent" />
        <div className="flex-1">
          <p className="font-semibold text-foreground">Study Hub</p>
          <p className="mt-1 text-sm text-muted-foreground">
            Notes, summaries, slides, flashcards and your personal timetable. All in one place.
          </p>
        </div>
        {courses.length > 0 && (
          <div className="flex shrink-0 flex-wrap gap-2">
            <button
              type="button"
              onClick={handleGenerateStudyPlan}
              disabled={planningStudy}
              className="flex items-center gap-1.5 rounded-lg border border-accent/30 bg-accent/10 px-3 py-1.5 text-xs font-semibold text-accent transition-colors hover:bg-accent/20 disabled:opacity-50"
            >
              {planningStudy ? (
                <Loader2 className="h-3.5 w-3.5 animate-spin" />
              ) : (
                <CalendarPlus className="h-3.5 w-3.5" />
              )}
              Plan my week
            </button>
            <button
              type="button"
              onClick={() => setShowSetup((v) => !v)}
              className="rounded-lg border border-border/60 bg-muted/50 px-3 py-1.5 text-xs font-semibold text-muted-foreground transition-colors hover:bg-muted"
            >
              {showSetup ? "Hide setup" : "Re-run course setup"}
            </button>
          </div>
        )}
      </div>

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
          <div className="flex items-center justify-between gap-3">
            <h2 className="text-lg font-semibold">Weekly Timetable</h2>
            <div className="flex flex-wrap gap-2">
              {TABS.map(({ key, label, Icon }) => (
                <button
                  key={key}
                  type="button"
                  onClick={() => setTab(key)}
                  className={cn(
                    "inline-flex items-center gap-1.5 rounded-lg px-3 py-2 text-sm font-medium transition-colors",
                    tab === key
                      ? "bg-accent text-white"
                      : "bg-muted text-muted-foreground hover:text-foreground"
                  )}
                >
                  <Icon className="h-4 w-4" />
                  {label}
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
        <div className="grid gap-6 lg:grid-cols-[240px_1fr]">
          {/* Course sidebar */}
          <Card className="h-fit border-border/70 bg-card/80">
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
                      <span className="text-xs opacity-70">{c._count.notes}</span>
                    </button>
                  </li>
                ))}
              </ul>

              <form onSubmit={handleCreateCourse} className="space-y-2 border-t border-border pt-3">
                <Label htmlFor="course-name" className="text-xs">Add class</Label>
                <Input id="course-name" name="name" placeholder="e.g. Data Structures" required />
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

          {/* Course detail */}
          {selected ? (
            <div className="space-y-4">
              <div className="flex items-start gap-3 rounded-xl border border-border/60 bg-muted/30 px-4 py-3">
                <Sparkles className="mt-0.5 h-4 w-4 shrink-0 text-accent" />
                <p className="text-sm text-muted-foreground">{getStudyTip(selected)}</p>
              </div>

              <StudyBrainPanel courseId={selected.id} courseName={selected.name} />

              <div className="flex flex-wrap items-center justify-between gap-3">
                <div>
                  <h2 className="text-xl font-bold text-foreground">{selected.name}</h2>
                  {selected.code && (
                    <p className="text-sm text-muted-foreground">{selected.code}</p>
                  )}
                </div>
                <div className="flex items-center gap-2">
                  <Link
                    href={`/session/${selected.id}`}
                    className="flex items-center gap-1.5 rounded-lg bg-accent px-4 py-2 text-sm font-semibold text-white transition-opacity hover:opacity-90"
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

              {/* Tabs */}
              <div className="flex flex-wrap gap-2">
                {TABS.map(({ key, label, Icon }) => (
                  <button
                    key={key}
                    type="button"
                    onClick={() => setTab(key)}
                    className={cn(
                      "inline-flex items-center gap-1.5 rounded-lg px-3 py-2 text-sm font-medium transition-colors",
                      tab === key
                        ? "bg-accent text-white"
                        : "bg-muted text-muted-foreground hover:text-foreground"
                    )}
                  >
                    <Icon className="h-4 w-4" />
                    {label}
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
                <SlideReader materials={selected.materials} />
              )}

              {tab === "ai-tutor" && (
                <AITutorPanel courseId={selected.id} courseName={selected.name} />
              )}

              {tab === "flashcards" && (
                <FlashcardsPanel
                  cards={courseCards}
                  courseId={selected.id}
                  courseName={selected.name}
                />
              )}

              {tab === "materials" && (
                <div className="grid gap-4 lg:grid-cols-2">
                  <Card className="border-border/70 bg-card/80">
                    <CardHeader>
                      <CardTitle className="text-base">Upload slides or PDF</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <form onSubmit={handleUpload} className="space-y-3">
                        <Input name="title" placeholder="Label (Week 4 slides)" />
                        <Input name="file" type="file" accept=".pdf,.png,.jpg,.jpeg,.webp,.ppt,.pptx" required />
                        <Button type="submit" disabled={uploading} className="w-full gap-2">
                          {uploading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Upload className="h-4 w-4" />}
                          Upload
                        </Button>
                      </form>
                    </CardContent>
                  </Card>
                  <div className="space-y-3">
                    {selected.materials.length === 0 ? (
                      <p className="text-sm text-muted-foreground">
                        Upload lecture slides or PDFs from your professor. Once uploaded, read them inline in the <strong>Read Slides</strong> tab.
                      </p>
                    ) : (
                      <>
                        <button
                          onClick={() => setTab("read")}
                          className="flex w-full items-center gap-2 rounded-xl border border-accent/30 bg-accent/5 px-4 py-2.5 text-sm font-semibold text-accent transition-colors hover:bg-accent/10"
                        >
                          <ScanText className="h-4 w-4" />
                          Read all slides in-app →
                        </button>
                        {selected.materials.map((m) => (
                          <div
                            key={m.id}
                            className="flex items-center gap-3 rounded-xl border border-border/70 bg-card/80 p-4"
                          >
                            <FileText className="h-8 w-8 shrink-0 text-accent" />
                            <div className="min-w-0 flex-1">
                              <p className="font-medium truncate">{m.title}</p>
                              <p className="text-xs text-muted-foreground truncate">{m.fileName}</p>
                            </div>
                            <a href={m.fileUrl} target="_blank" rel="noopener noreferrer"
                              className="shrink-0 text-xs text-muted-foreground hover:text-foreground underline">
                              Open
                            </a>
                          </div>
                        ))}
                      </>
                    )}
                  </div>
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
