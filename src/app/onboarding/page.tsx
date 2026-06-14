"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import { ArrowRight, Check, Loader2 } from "lucide-react";

import { cn } from "@/lib/utils";

type UseCase = "student" | "creator" | "professional" | "personal";

const USE_CASES: { key: UseCase; label: string; detail: string }[] = [
  { key: "student", label: "Student", detail: "Courses, deadlines, exams, and study sessions" },
  { key: "creator", label: "Creator", detail: "Content pipeline, ideas, and audience growth" },
  { key: "professional", label: "Professional", detail: "Projects, clients, and work priorities" },
  { key: "personal", label: "Personal growth", detail: "Habits, goals, finance, and wellbeing" },
];

const GOAL_PLACEHOLDERS = [
  "Finish my CS degree strong",
  "Ship my SaaS by end of year",
  "Get my finances under control",
  "Build a daily writing habit",
];

export default function OnboardingPage() {
  const router = useRouter();
  const [step, setStep] = useState(0);
  const [useCases, setUseCases] = useState<UseCase[]>([]);
  const [goal, setGoal] = useState("");
  const [pending, startTransition] = useTransition();

  const placeholder = GOAL_PLACEHOLDERS[Math.floor(Math.random() * GOAL_PLACEHOLDERS.length)];

  function toggleUseCase(key: UseCase) {
    setUseCases((prev) =>
      prev.includes(key) ? prev.filter((k) => k !== key) : [...prev, key]
    );
  }

  function handleComplete() {
    startTransition(async () => {
      await fetch("/api/onboarding/complete", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ useCases, primaryGoal: goal }),
      });
      router.push(useCases.includes("student") ? "/learning" : "/dashboard");
      router.refresh();
    });
  }

  const steps = [
    {
      key: "usecase",
      heading: "What brings you here?",
      sub: "Pick everything that applies. You can always do all of it.",
    },
    {
      key: "goal",
      heading: "What's your main focus right now?",
      sub: "One sentence. Be specific — it feeds into your daily plan.",
    },
    {
      key: "ready",
      heading: "You're set up.",
      sub: useCases.includes("student")
        ? "Head to Learning first to add your courses and build your timetable."
        : "Your dashboard is ready. The engine will start planning your day.",
    },
  ];

  const current = steps[step];
  const canNext =
    step === 0 ? useCases.length > 0 : step === 1 ? goal.trim().length > 2 : true;

  return (
    <div className="flex min-h-screen flex-col items-center justify-center px-6 py-16">
      {/* Step dots */}
      <div className="mb-14 flex items-center gap-2">
        {steps.map((_, i) => (
          <span
            key={i}
            className={cn(
              "h-1.5 rounded-full transition-all duration-300",
              i === step
                ? "w-8 bg-accent"
                : i < step
                  ? "w-3 bg-accent/40"
                  : "w-3 bg-muted"
            )}
          />
        ))}
      </div>

      <AnimatePresence mode="wait">
        <motion.div
          key={step}
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -12 }}
          transition={{ duration: 0.22, ease: "easeOut" }}
          className="w-full max-w-lg"
        >
          <h1 className="text-3xl font-bold tracking-tight text-foreground">
            {current.heading}
          </h1>
          <p className="mt-2 text-sm text-muted-foreground">{current.sub}</p>

          <div className="mt-10">
            {step === 0 && (
              <div className="grid gap-3 sm:grid-cols-2">
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
                          ? "border-accent bg-accent/8 text-foreground"
                          : "border-border bg-card/60 text-muted-foreground hover:border-border/80 hover:bg-muted/30 hover:text-foreground"
                      )}
                    >
                      <div className="flex w-full items-center justify-between">
                        <span className="text-[13px] font-semibold">{label}</span>
                        {active && (
                          <span className="flex h-4.5 w-4.5 items-center justify-center rounded-full bg-accent">
                            <Check className="h-3 w-3 text-white" />
                          </span>
                        )}
                      </div>
                      <p className="mt-1 text-[12px] leading-snug opacity-70">{detail}</p>
                    </button>
                  );
                })}
              </div>
            )}

            {step === 1 && (
              <div className="space-y-3">
                <input
                  type="text"
                  value={goal}
                  onChange={(e) => setGoal(e.target.value)}
                  maxLength={120}
                  placeholder={placeholder}
                  autoFocus
                  className="flex h-14 w-full rounded-xl border border-border bg-muted/50 px-4 text-base text-foreground outline-none transition-all placeholder:text-muted-foreground/50 focus:border-accent focus:bg-background focus:ring-2 focus:ring-accent/15"
                />
                <p className="text-right text-[11px] text-muted-foreground/40">
                  {goal.length}/120
                </p>
              </div>
            )}

            {step === 2 && (
              <div className="space-y-3">
                <div className="rounded-xl border border-border/50 bg-card/60 px-5 py-4">
                  <p className="text-[11px] font-semibold uppercase tracking-widest text-muted-foreground/50">
                    Focus
                  </p>
                  <p className="mt-1 text-sm font-medium text-foreground">
                    {goal || "Not set"}
                  </p>
                </div>
                <div className="rounded-xl border border-border/50 bg-card/60 px-5 py-4">
                  <p className="text-[11px] font-semibold uppercase tracking-widest text-muted-foreground/50">
                    Using it for
                  </p>
                  <p className="mt-1 text-sm font-medium text-foreground capitalize">
                    {useCases.join(", ") || "Not set"}
                  </p>
                </div>
                {useCases.includes("student") && (
                  <div className="rounded-xl border border-accent/20 bg-accent/5 px-5 py-3">
                    <p className="text-[12px] text-accent">
                      Next: add your courses in Learning so the study planner has your timetable.
                    </p>
                  </div>
                )}
              </div>
            )}
          </div>
        </motion.div>
      </AnimatePresence>

      <div className="mt-10 flex w-full max-w-lg items-center justify-between">
        {step > 0 ? (
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

        {step < steps.length - 1 ? (
          <button
            type="button"
            disabled={!canNext}
            onClick={() => setStep((s) => s + 1)}
            className="flex items-center gap-2 rounded-xl bg-accent px-6 py-3 text-sm font-semibold text-white transition-opacity disabled:opacity-40"
          >
            Continue
            <ArrowRight className="h-4 w-4" />
          </button>
        ) : (
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
            {useCases.includes("student") ? "Go to Learning" : "Open my dashboard"}
          </button>
        )}
      </div>
    </div>
  );
}
