"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import { toast } from "sonner";
import {
  BookOpen, Calendar, Check, ChevronRight,
  GraduationCap, Loader2, Sparkles, Upload, Users,
} from "lucide-react";

import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

const KNUST_COURSES = [
  { code: "CSM 388", name: "Data Structures II",               color: "#3b82f6", credits: 3,
    slots: [{ day: "Mon", time: "10:30–11:25", venue: "SCB-SF20" }, { day: "Tue", time: "10:30–11:25", venue: "FF17" }] },
  { code: "CSM 352", name: "Computer Architecture",            color: "#8b5cf6", credits: 3,
    slots: [{ day: "Mon", time: "13:00–13:55", venue: "SCB-SF7" }, { day: "Thu", time: "18:00–18:55", venue: "FF17" }] },
  { code: "CSM 354", name: "Computer Graphics",               color: "#ec4899", credits: 2,
    slots: [{ day: "Mon", time: "17:00–17:55", venue: "SCB-SF19" }, { day: "Tue", time: "15:00–15:55", venue: "FF6" }] },
  { code: "CSM 374", name: "Real-Time and Embedded Systems",  color: "#ef4444", credits: 2,
    slots: [{ day: "Tue", time: "13:00–13:55", venue: "FF17" }, { day: "Fri", time: "17:00–17:55", venue: "SCB-TF1" }] },
  { code: "CSM 358", name: "E-Commerce",                      color: "#f59e0b", credits: 3,
    slots: [{ day: "Wed", time: "15:00–15:55", venue: "SCB-SF19" }] },
  { code: "CSM 394", name: "Operations Research II",          color: "#a855f7", credits: 2,
    slots: [{ day: "Wed", time: "16:00–16:55", venue: "SCB-SF7" }, { day: "Thu", time: "17:00–17:55", venue: "DCB-FF24" }] },
  { code: "ACF 256", name: "Financial Accounting II",         color: "#f97316", credits: 2,
    slots: [{ day: "Thu", time: "08:00–08:55", venue: "SCB-SF19" }] },
  { code: "CSM 376", name: "Research Method and IT Project",  color: "#06b6d4", credits: 2,
    slots: [{ day: "Thu", time: "10:30–11:25", venue: "SCB-SF1" }] },
  { code: "CSM 366", name: "Mini Project",                    color: "#22c55e", credits: 2,
    slots: [{ day: "Fri", time: "10:30–14:55", venue: "—" }] },
] as const;

type Step = "choose" | "confirm" | "done";

interface CourseSetupWizardProps {
  onComplete?: () => void;
}

export function CourseSetupWizard({ onComplete }: CourseSetupWizardProps) {
  const router = useRouter();
  const [step, setStep] = useState<Step>("choose");
  const [loading, setLoading] = useState(false);
  const [selected, setSelected] = useState<Set<string>>(
    new Set(KNUST_COURSES.map((c) => c.code))
  );
  const [result, setResult] = useState<{ courses: number; events: number } | null>(null);

  function toggle(code: string) {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(code)) next.delete(code);
      else next.add(code);
      return next;
    });
  }

  async function applyKnustPreset() {
    setLoading(true);
    try {
      const preset = await fetch("/api/setup/courses").then((r) => r.json());
      const selectedCourses = preset.preset.courses.filter(
        (c: { code: string }) => selected.has(c.code)
      );

      const res = await fetch("/api/setup/courses", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ courses: selectedCourses, group: 1 }),
      });
      const data = await res.json();

      if (!res.ok) throw new Error(data.error ?? "Setup failed");

      setResult({ courses: data.coursesCreated, events: data.generatedEvents });
      setStep("done");
      router.refresh();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Setup failed");
    } finally {
      setLoading(false);
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
            <p className="text-xs text-muted-foreground">
              KNUST B.Sc. Computer Science · Year 3, Semester 2
            </p>
          </div>
        </div>
      </div>

      <AnimatePresence mode="wait">
        {step === "choose" && (
          <motion.div
            key="choose"
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            transition={{ duration: 0.2 }}
            className="p-6"
          >
            <div className="mb-5 flex items-center gap-2 rounded-xl border border-accent/20 bg-accent/5 px-4 py-3 text-sm text-accent">
              <Sparkles className="h-4 w-4 shrink-0" />
              <span>
                We detected your KNUST CS3 timetable. Select your courses below and we&apos;ll set everything up automatically.
              </span>
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
                  <button
                    key={course.code}
                    type="button"
                    onClick={() => toggle(course.code)}
                    className={cn(
                      "flex w-full items-start gap-3 rounded-xl border p-3 text-left transition-all",
                      isSelected
                        ? "border-accent/30 bg-accent/5"
                        : "border-border/50 bg-background/50 opacity-60 hover:opacity-80"
                    )}
                  >
                    <div
                      className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full"
                      style={{ backgroundColor: isSelected ? course.color : "transparent", border: `2px solid ${course.color}` }}
                    >
                      {isSelected && <Check className="h-3 w-3 text-white" />}
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2">
                        <span
                          className="rounded px-1.5 py-0.5 text-[10px] font-bold tracking-wide text-white"
                          style={{ backgroundColor: course.color }}
                        >
                          {course.code}
                        </span>
                        <span className="text-xs text-muted-foreground">{course.credits} cr</span>
                      </div>
                      <p className="mt-0.5 text-sm font-medium text-foreground">{course.name}</p>
                      <div className="mt-1 flex flex-wrap gap-2">
                        {course.slots.map((s, i) => (
                          <span key={i} className="flex items-center gap-1 text-[11px] text-muted-foreground">
                            <Calendar className="h-3 w-3" />
                            {s.day} {s.time}
                            {s.venue && s.venue !== "—" && (
                              <span className="rounded bg-muted px-1 text-[10px]">{s.venue}</span>
                            )}
                          </span>
                        ))}
                      </div>
                    </div>
                  </button>
                );
              })}
            </div>

            <div className="mt-5 flex items-center justify-between">
              <p className="text-xs text-muted-foreground">
                {selected.size} of {KNUST_COURSES.length} courses selected
              </p>
              <Button
                onClick={() => setStep("confirm")}
                disabled={selected.size === 0}
                className="gap-2"
              >
                Continue
                <ChevronRight className="h-4 w-4" />
              </Button>
            </div>
          </motion.div>
        )}

        {step === "confirm" && (
          <motion.div
            key="confirm"
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            transition={{ duration: 0.2 }}
            className="p-6"
          >
            <h3 className="mb-1 text-sm font-semibold text-foreground">Ready to apply</h3>
            <p className="mb-5 text-sm text-muted-foreground">
              This will create <strong>{selected.size} courses</strong> in your Study Hub, build
              your timetable grid, and schedule your next 14 days of classes on your calendar.
            </p>

            <div className="mb-5 grid grid-cols-3 gap-3">
              {[
                { icon: BookOpen, label: "Courses", value: String(selected.size) },
                { icon: Calendar, label: "Calendar events", value: `${selected.size * 3}+` },
                { icon: GraduationCap, label: "Timetable slots", value: `${selected.size * 2}+` },
              ].map(({ icon: Icon, label, value }) => (
                <div key={label} className="rounded-xl border border-border/60 bg-muted/30 p-3 text-center">
                  <Icon className="mx-auto mb-1 h-4 w-4 text-accent" />
                  <p className="text-lg font-bold text-foreground">{value}</p>
                  <p className="text-[10px] text-muted-foreground">{label}</p>
                </div>
              ))}
            </div>

            <div className="flex gap-2">
              <Button variant="outline" onClick={() => setStep("choose")}>
                Back
              </Button>
              <Button onClick={applyKnustPreset} disabled={loading} className="flex-1 gap-2">
                {loading ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" />
                    Setting up...
                  </>
                ) : (
                  <>
                    <Sparkles className="h-4 w-4" />
                    Apply and set up my timetable
                  </>
                )}
              </Button>
            </div>
          </motion.div>
        )}

        {step === "done" && result && (
          <motion.div
            key="done"
            initial={{ opacity: 0, scale: 0.97 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.25 }}
            className="flex flex-col items-center p-8 text-center"
          >
            <motion.div
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              transition={{ type: "spring", delay: 0.1 }}
              className="flex h-16 w-16 items-center justify-center rounded-full bg-success/15 text-success"
            >
              <Check className="h-8 w-8" />
            </motion.div>
            <h3 className="mt-4 text-lg font-bold text-foreground">You&apos;re all set!</h3>
            <p className="mt-2 max-w-xs text-sm text-muted-foreground">
              {result.courses} courses created, {result.events} class events scheduled for the next 14 days, and your Timetable tab is ready.
            </p>
            <div className="mt-6 flex flex-wrap justify-center gap-2">
              <Button
                size="sm"
                onClick={() => {
                  onComplete?.();
                  router.refresh();
                }}
              >
                Go to Timetable
              </Button>
              <Button
                size="sm"
                variant="outline"
                onClick={() => router.push("/calendar")}
              >
                View Calendar
              </Button>
            </div>
            <div className="mt-4 flex items-center gap-2 rounded-lg bg-accent/5 px-3 py-2 text-xs text-accent">
              <Upload className="h-3.5 w-3.5" />
              Upload slides for each course in the Materials tab to enable AI study help
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
