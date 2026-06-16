"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import { ArrowRight, Check, Loader2 } from "lucide-react";

import { CourseSetupWizard } from "@/components/learning/CourseSetupWizard";
import { cn } from "@/lib/utils";

type UseCase = "student" | "creator" | "professional" | "personal";

const USE_CASES: { key: UseCase; label: string; detail: string }[] = [
  { key: "student", label: "Student", detail: "Courses, deadlines, exams, and study sessions" },
  { key: "creator", label: "Creator", detail: "Content pipeline, ideas, and audience growth" },
  { key: "professional", label: "Professional", detail: "Projects, clients, and work priorities" },
  { key: "personal", label: "Personal growth", detail: "Habits, goals, finance, and wellbeing" },
];

const WORK_DAYS = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];

const GOAL_EXAMPLES: Record<UseCase, string> = {
  student: "Finish my CS degree strong this semester",
  creator: "Ship 4 YouTube videos this month",
  professional: "Land two new clients by end of quarter",
  personal: "Build consistent daily habits and get finances in order",
};

export default function OnboardingPage() {
  const router = useRouter();
  const [pending, startTransition] = useTransition();

  // Step data
  const [useCases, setUseCases] = useState<UseCase[]>([]);
  const [goal, setGoal] = useState("");

  // Work schedule (professionals/creators)
  const [workDays, setWorkDays] = useState(["Mon", "Tue", "Wed", "Thu", "Fri"]);
  const [workStart, setWorkStart] = useState("09:00");
  const [workEnd, setWorkEnd] = useState("17:00");

  // Course setup tracking
  const [courseSetupDone, setCourseSetupDone] = useState(false);

  // Steps: 0=usecase, 1=goal, 2=setup (conditional), 3=ready
  const isStudent = useCases.includes("student");
  const needsWorkSchedule =
    !isStudent && (useCases.includes("professional") || useCases.includes("creator"));
  const hasSetupStep = isStudent || needsWorkSchedule;

  const [step, setStep] = useState(0);

  // Map linear step index to semantic key
  function stepKey(i: number) {
    if (i === 0) return "usecase";
    if (i === 1) return "goal";
    if (i === 2 && hasSetupStep) return "setup";
    return "ready";
  }

  const currentKey = stepKey(step);
  const goalPlaceholder =
    useCases.length > 0
      ? GOAL_EXAMPLES[useCases[0]]
      : "What do you want to accomplish?";

  function toggleUseCase(key: UseCase) {
    setUseCases((prev) =>
      prev.includes(key) ? prev.filter((k) => k !== key) : [...prev, key]
    );
  }

  function toggleWorkDay(day: string) {
    setWorkDays((prev) =>
      prev.includes(day) ? prev.filter((d) => d !== day) : [...prev, day]
    );
  }

  function advanceStep() {
    setStep((s) => s + 1);
  }

  const canContinue =
    currentKey === "usecase"
      ? useCases.length > 0
      : currentKey === "goal"
        ? goal.trim().length > 2
        : currentKey === "setup"
          ? true // setup step always has Skip
          : true;

  function handleComplete() {
    startTransition(async () => {
      const workSchedule =
        needsWorkSchedule
          ? JSON.stringify({ days: workDays, startTime: workStart, endTime: workEnd })
          : null;

      await fetch("/api/onboarding/complete", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          useCases,
          primaryGoal: goal.trim() || null,
          workSchedule,
        }),
      });

      router.push(isStudent ? "/learning" : "/dashboard");
      router.refresh();
    });
  }

  const stepLabels = hasSetupStep
    ? ["Who you are", "Your goal", "Setup", "Ready"]
    : ["Who you are", "Your goal", "Ready"];

  return (
    <div className="flex min-h-screen flex-col items-center justify-center px-6 py-16">
      {/* Progress dots */}
      <div className="mb-12 flex items-center gap-2">
        {stepLabels.map((label, i) => (
          <div key={i} className="flex items-center gap-2">
            <div className="flex flex-col items-center gap-1">
              <span
                className={cn(
                  "h-1.5 rounded-full transition-all duration-300",
                  i === step
                    ? "w-8 bg-accent"
                    : i < step
                      ? "w-3 bg-accent/40"
                      : "w-3 bg-muted"
                )}
              />
              <span
                className={cn(
                  "text-[10px] transition-colors",
                  i === step
                    ? "text-accent font-medium"
                    : i < step
                      ? "text-muted-foreground/60"
                      : "text-muted-foreground/30"
                )}
              >
                {label}
              </span>
            </div>
          </div>
        ))}
      </div>

      <AnimatePresence mode="wait">
        <motion.div
          key={step}
          initial={{ opacity: 0, x: 20 }}
          animate={{ opacity: 1, x: 0 }}
          exit={{ opacity: 0, x: -20 }}
          transition={{ duration: 0.2, ease: "easeOut" }}
          className="w-full max-w-xl"
        >
          {/* Step: use case */}
          {currentKey === "usecase" && (
            <>
              <h1 className="text-3xl font-bold tracking-tight">What brings you here?</h1>
              <p className="mt-2 text-sm text-muted-foreground">
                Pick everything that applies. You can always do all of it.
              </p>
              <div className="mt-8 grid gap-3 sm:grid-cols-2">
                {USE_CASES.map(({ key, label, detail }) => {
                  const active = useCases.includes(key);
                  return (
                    <button
                      key={key}
                      type="button"
                      onClick={() => toggleUseCase(key)}
                      className={cn(
                        "flex flex-col items-start rounded-xl border-2 px-5 py-4 text-left transition-all",
                        active
                          ? "border-accent bg-accent/5 text-foreground"
                          : "border-border bg-card/60 text-muted-foreground hover:border-border/80 hover:text-foreground"
                      )}
                    >
                      <div className="flex w-full items-center justify-between">
                        <span className="text-[13px] font-semibold">{label}</span>
                        {active && (
                          <span className="flex h-4 w-4 items-center justify-center rounded-full bg-accent">
                            <Check className="h-2.5 w-2.5 text-white" />
                          </span>
                        )}
                      </div>
                      <p className="mt-1 text-[12px] leading-snug opacity-60">{detail}</p>
                    </button>
                  );
                })}
              </div>
            </>
          )}

          {/* Step: goal */}
          {currentKey === "goal" && (
            <>
              <h1 className="text-3xl font-bold tracking-tight">
                What&apos;s your main focus right now?
              </h1>
              <p className="mt-2 text-sm text-muted-foreground">
                One sentence. The engine uses this to prioritise your day.
              </p>
              <div className="mt-8 space-y-2">
                <input
                  type="text"
                  value={goal}
                  onChange={(e) => setGoal(e.target.value)}
                  maxLength={120}
                  placeholder={goalPlaceholder}
                  autoFocus
                  className="flex h-14 w-full rounded-xl border border-border bg-muted/50 px-4 text-base text-foreground outline-none transition-all placeholder:text-muted-foreground/40 focus:border-accent focus:bg-background focus:ring-2 focus:ring-accent/15"
                />
                <p className="text-right text-[11px] text-muted-foreground/40">{goal.length}/120</p>
              </div>
            </>
          )}

          {/* Step: setup */}
          {currentKey === "setup" && (
            <>
              {isStudent ? (
                <>
                  <h1 className="text-3xl font-bold tracking-tight">Set up your courses</h1>
                  <p className="mt-2 text-sm text-muted-foreground">
                    The planner needs your timetable to schedule study sessions. You can skip and add
                    courses later in Learning.
                  </p>
                  <div className="mt-6">
                    <CourseSetupWizard
                      onComplete={() => {
                        setCourseSetupDone(true);
                        advanceStep();
                      }}
                    />
                  </div>
                  {!courseSetupDone && (
                    <button
                      type="button"
                      onClick={advanceStep}
                      className="mt-3 text-sm text-muted-foreground hover:text-foreground"
                    >
                      Skip for now, I&apos;ll add courses later
                    </button>
                  )}
                </>
              ) : (
                <>
                  <h1 className="text-3xl font-bold tracking-tight">When do you work?</h1>
                  <p className="mt-2 text-sm text-muted-foreground">
                    The engine uses this to block off focus time and avoid scheduling tasks during
                    your off hours.
                  </p>
                  <div className="mt-8 space-y-6">
                    {/* Days */}
                    <div>
                      <p className="mb-3 text-[11px] font-semibold uppercase tracking-widest text-muted-foreground/50">
                        Work days
                      </p>
                      <div className="flex flex-wrap gap-2">
                        {WORK_DAYS.map((d) => (
                          <button
                            key={d}
                            type="button"
                            onClick={() => toggleWorkDay(d)}
                            className={cn(
                              "rounded-lg border-2 px-3.5 py-1.5 text-[13px] font-medium transition-all",
                              workDays.includes(d)
                                ? "border-accent bg-accent/10 text-accent"
                                : "border-border text-muted-foreground hover:border-border/80"
                            )}
                          >
                            {d}
                          </button>
                        ))}
                      </div>
                    </div>

                    {/* Hours */}
                    <div>
                      <p className="mb-3 text-[11px] font-semibold uppercase tracking-widest text-muted-foreground/50">
                        Work hours
                      </p>
                      <div className="flex items-center gap-3">
                        <div className="flex flex-col gap-1">
                          <label className="text-xs text-muted-foreground">Start</label>
                          <input
                            type="time"
                            value={workStart}
                            onChange={(e) => setWorkStart(e.target.value)}
                            className="h-10 rounded-lg border border-border bg-muted/50 px-3 text-sm text-foreground outline-none focus:border-accent focus:ring-1 focus:ring-accent/20"
                          />
                        </div>
                        <span className="mt-5 text-muted-foreground/50">to</span>
                        <div className="flex flex-col gap-1">
                          <label className="text-xs text-muted-foreground">End</label>
                          <input
                            type="time"
                            value={workEnd}
                            onChange={(e) => setWorkEnd(e.target.value)}
                            className="h-10 rounded-lg border border-border bg-muted/50 px-3 text-sm text-foreground outline-none focus:border-accent focus:ring-1 focus:ring-accent/20"
                          />
                        </div>
                      </div>
                    </div>
                  </div>
                </>
              )}
            </>
          )}

          {/* Step: ready */}
          {currentKey === "ready" && (
            <>
              <h1 className="text-3xl font-bold tracking-tight">You&apos;re set up.</h1>
              <p className="mt-2 text-sm text-muted-foreground">
                {isStudent
                  ? "Head to Learning to add your slides and start your first study session."
                  : "Your dashboard is ready. The engine will start planning your day."}
              </p>
              <div className="mt-8 space-y-2.5">
                <div className="rounded-xl border border-border/50 bg-card/60 px-5 py-3.5">
                  <p className="text-[11px] font-semibold uppercase tracking-widest text-muted-foreground/50">
                    Focus
                  </p>
                  <p className="mt-0.5 text-sm font-medium">{goal || "Not set"}</p>
                </div>
                <div className="rounded-xl border border-border/50 bg-card/60 px-5 py-3.5">
                  <p className="text-[11px] font-semibold uppercase tracking-widest text-muted-foreground/50">
                    Using for
                  </p>
                  <p className="mt-0.5 text-sm font-medium capitalize">
                    {useCases.join(", ") || "Not set"}
                  </p>
                </div>
                {needsWorkSchedule && (
                  <div className="rounded-xl border border-border/50 bg-card/60 px-5 py-3.5">
                    <p className="text-[11px] font-semibold uppercase tracking-widest text-muted-foreground/50">
                      Work schedule
                    </p>
                    <p className="mt-0.5 text-sm font-medium">
                      {workDays.join(", ")} &middot; {workStart} to {workEnd}
                    </p>
                  </div>
                )}
                {courseSetupDone && (
                  <div className="rounded-xl border border-success/20 bg-success/5 px-5 py-3.5">
                    <p className="text-sm font-medium text-success">Courses and timetable imported.</p>
                  </div>
                )}
              </div>
            </>
          )}
        </motion.div>
      </AnimatePresence>

      {/* Nav buttons */}
      <div className="mt-10 flex w-full max-w-xl items-center justify-between">
        {step > 0 && currentKey !== "setup" ? (
          <button
            type="button"
            onClick={() => setStep((s) => s - 1)}
            className="text-sm text-muted-foreground hover:text-foreground"
          >
            Back
          </button>
        ) : (
          <span />
        )}

        {currentKey !== "setup" && currentKey !== "ready" && (
          <button
            type="button"
            disabled={!canContinue}
            onClick={advanceStep}
            className="flex items-center gap-2 rounded-xl bg-accent px-6 py-3 text-sm font-semibold text-white transition-opacity disabled:opacity-40"
          >
            Continue
            <ArrowRight className="h-4 w-4" />
          </button>
        )}

        {currentKey === "setup" && !isStudent && (
          <button
            type="button"
            onClick={advanceStep}
            className="flex items-center gap-2 rounded-xl bg-accent px-6 py-3 text-sm font-semibold text-white transition-opacity"
          >
            Continue
            <ArrowRight className="h-4 w-4" />
          </button>
        )}

        {currentKey === "ready" && (
          <button
            type="button"
            onClick={handleComplete}
            disabled={pending}
            className="flex items-center gap-2 rounded-xl bg-accent px-6 py-3 text-sm font-semibold text-white transition-opacity disabled:opacity-70"
          >
            {pending ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Check className="h-4 w-4" />
            )}
            {isStudent ? "Go to Learning" : "Open my dashboard"}
          </button>
        )}
      </div>
    </div>
  );
}
