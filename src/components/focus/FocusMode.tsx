"use client";

import Link from "next/link";
import { useEffect, useMemo, useRef, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { ArrowLeft, Coffee, Flame, Pause, Play, RotateCcw, Zap } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

const PRESETS = [
  { label: "Pomodoro", icon: Zap, focus: 25, break: 5, color: "#3b82f6" },
  { label: "Deep work", icon: Flame, focus: 50, break: 10, color: "#8b5cf6" },
  { label: "Exam sprint", icon: Coffee, focus: 90, break: 15, color: "#f59e0b" },
] as const;

const RING_R = 120;
const RING_C = 2 * Math.PI * RING_R;

type Course = { id: string; name: string; code: string | null };

export function FocusMode({ courses = [] }: { courses?: Course[] }) {
  const [presetIdx, setPresetIdx] = useState(0);
  const preset = PRESETS[presetIdx];
  const [isBreak, setIsBreak] = useState(false);
  const [running, setRunning] = useState(false);
  const [secondsLeft, setSecondsLeft] = useState(preset.focus * 60);
  const [label, setLabel] = useState("");
  const [sessions, setSessions] = useState(0);
  const [courseId, setCourseId] = useState("");
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const courseIdRef = useRef("");

  const totalSeconds = (isBreak ? preset.break : preset.focus) * 60;
  const progress = 1 - secondsLeft / totalSeconds;
  const dashOffset = RING_C * (1 - progress);

  // Keep courseIdRef in sync for use inside setInterval callback
  useEffect(() => { courseIdRef.current = courseId; }, [courseId]);

  // Reset when switching preset or mode
  useEffect(() => {
    setRunning(false);
    setIsBreak(false);
    setSecondsLeft(preset.focus * 60);
  }, [presetIdx, preset.focus]);

  // Tick
  useEffect(() => {
    if (!running) {
      if (intervalRef.current) clearInterval(intervalRef.current);
      return;
    }
    intervalRef.current = setInterval(() => {
      setSecondsLeft((prev) => {
        if (prev > 1) return prev - 1;
        // Session complete
        if (!isBreak) {
          setSessions((s) => s + 1);
          // Log focus session to DB (fire and forget)
          void fetch("/api/study/session", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              courseId: courseIdRef.current || null,
              durationSecs: preset.focus * 60,
              startedAt: new Date(Date.now() - preset.focus * 60 * 1000).toISOString(),
              endedAt: new Date().toISOString(),
            }),
          })
            .then((r) => r.json())
            .then((d: { xpEarned?: number }) => {
              if (d.xpEarned) toast.success(`Focus session logged! +${d.xpEarned} XP`);
            })
            .catch(() => {});
        }
        setIsBreak((b) => {
          const next = !b;
          setSecondsLeft((next ? preset.break : preset.focus) * 60);
          return next;
        });
        return 0;
      });
    }, 1000);
    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, [running, isBreak, preset.focus, preset.break]);

  // Browser tab title
  useEffect(() => {
    const label_ = isBreak ? "☕ Break" : "🎯 Focus";
    document.title = running ? `${mmss} — ${label_} | Life OS` : "Focus Mode | Life OS";
    return () => {
      document.title = "Life OS";
    };
  });

  const mmss = useMemo(() => {
    const mm = Math.floor(secondsLeft / 60).toString().padStart(2, "0");
    const ss = (secondsLeft % 60).toString().padStart(2, "0");
    return `${mm}:${ss}`;
  }, [secondsLeft]);

  function reset() {
    setRunning(false);
    setIsBreak(false);
    setSecondsLeft(preset.focus * 60);
  }

  const PresetIcon = preset.icon;

  return (
    <div
      className={cn(
        "flex min-h-screen flex-col transition-colors duration-1000",
        isBreak ? "bg-emerald-950/30" : "bg-background"
      )}
    >
      {/* Ambient glow */}
      <div
        className="pointer-events-none fixed inset-0 transition-opacity duration-1000"
        style={{
          background: `radial-gradient(ellipse at 50% 30%, ${preset.color}20, transparent 65%)`,
          opacity: running ? 1 : 0.4,
        }}
      />

      {/* Header */}
      <header className="relative flex items-center justify-between border-b border-border/60 px-6 py-4">
        <Button variant="ghost" size="sm" className="gap-2" asChild>
          <Link href="/dashboard">
            <ArrowLeft className="h-4 w-4" />
            Back
          </Link>
        </Button>
        <p className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">
          Focus Mode
        </p>
        <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
          <Flame className="h-3.5 w-3.5 text-warning" />
          <span>{sessions} session{sessions !== 1 ? "s" : ""}</span>
        </div>
      </header>

      {/* Main */}
      <div className="relative flex flex-1 flex-col items-center justify-center gap-10 px-6 py-12">
        {/* Preset tabs */}
        <div className="flex gap-2">
          {PRESETS.map((p, i) => {
            const Icon = p.icon;
            return (
              <button
                key={p.label}
                type="button"
                onClick={() => setPresetIdx(i)}
                className={cn(
                  "flex items-center gap-1.5 rounded-full px-4 py-2 text-sm font-medium transition-all",
                  presetIdx === i
                    ? "text-white shadow-lg"
                    : "bg-muted/50 text-muted-foreground hover:text-foreground"
                )}
                style={presetIdx === i ? { backgroundColor: p.color } : undefined}
              >
                <Icon className="h-3.5 w-3.5" />
                {p.label}
              </button>
            );
          })}
        </div>

        {/* Timer ring */}
        <div className="relative">
          <svg
            width="300"
            height="300"
            viewBox="0 0 300 300"
            className="-rotate-90 drop-shadow-xl"
          >
            {/* Track */}
            <circle
              cx="150" cy="150" r={RING_R}
              fill="none"
              strokeWidth="12"
              className="stroke-muted/30"
            />
            {/* Progress */}
            <motion.circle
              cx="150" cy="150" r={RING_R}
              fill="none"
              strokeWidth="12"
              strokeLinecap="round"
              strokeDasharray={RING_C}
              animate={{ strokeDashoffset: dashOffset }}
              transition={{ duration: 0.8, ease: "easeOut" }}
              style={{ stroke: preset.color }}
            />
          </svg>

          {/* Center content */}
          <div className="absolute inset-0 flex flex-col items-center justify-center">
            <AnimatePresence mode="wait">
              <motion.p
                key={isBreak ? "break" : "focus"}
                initial={{ opacity: 0, y: -8 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: 8 }}
                className="mb-1 text-xs font-semibold uppercase tracking-widest"
                style={{ color: preset.color }}
              >
                {isBreak ? "Break" : "Focus"}
              </motion.p>
            </AnimatePresence>
            <p className="font-mono text-6xl font-bold tabular-nums tracking-tight text-foreground">
              {mmss}
            </p>
            <p className="mt-1 text-xs text-muted-foreground">
              {preset.focus}m focus · {preset.break}m break
            </p>
          </div>
        </div>

        {/* Controls */}
        <div className="flex items-center gap-3">
          <Button
            size="lg"
            variant="ghost"
            className="h-12 w-12 rounded-full p-0 text-muted-foreground"
            onClick={reset}
          >
            <RotateCcw className="h-5 w-5" />
          </Button>

          <motion.button
            type="button"
            whileTap={{ scale: 0.95 }}
            onClick={() => setRunning((r) => !r)}
            className="flex h-20 w-20 items-center justify-center rounded-full text-white shadow-2xl transition-transform"
            style={{ backgroundColor: preset.color }}
          >
            {running ? (
              <Pause className="h-7 w-7" />
            ) : (
              <Play className="ml-1 h-7 w-7" />
            )}
          </motion.button>

          <div className="h-12 w-12" />
        </div>

        {/* What are you locking in */}
        <div className="w-full max-w-sm space-y-3">
          <div className="space-y-2">
            <label htmlFor="focus-label" className="block text-xs font-medium text-muted-foreground">
              <PresetIcon className="mr-1 inline h-3.5 w-3.5" />
              What are you locking in on?
            </label>
            <input
              id="focus-label"
              value={label}
              onChange={(e) => setLabel(e.target.value)}
              placeholder="e.g. DSA: binary trees, YouTube script, client proposal..."
              className="w-full rounded-xl border border-border/70 bg-card/50 px-4 py-3 text-sm text-foreground placeholder:text-muted-foreground/60 backdrop-blur-sm focus:border-accent/60 focus:outline-none focus:ring-2 focus:ring-accent/20"
            />
          </div>

          {courses.length > 0 && (
            <div className="space-y-2">
              <label htmlFor="focus-course" className="block text-xs font-medium text-muted-foreground">
                Studying for...
              </label>
              <select
                id="focus-course"
                value={courseId}
                onChange={(e) => setCourseId(e.target.value)}
                className="w-full rounded-xl border border-border/70 bg-card/50 px-4 py-3 text-sm text-foreground backdrop-blur-sm focus:border-accent/60 focus:outline-none focus:ring-2 focus:ring-accent/20"
              >
                <option value="">General study</option>
                {courses.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.code ? `${c.code} — ${c.name}` : c.name}
                  </option>
                ))}
              </select>
            </div>
          )}

          <AnimatePresence>
            {label.trim() && (
              <motion.p
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: "auto" }}
                exit={{ opacity: 0, height: 0 }}
                className="text-center text-sm text-muted-foreground"
              >
                Locked in on:{" "}
                <span className="font-semibold text-foreground">{label}</span>
              </motion.p>
            )}
          </AnimatePresence>
        </div>

        {/* Session dots */}
        {sessions > 0 && (
          <div className="flex gap-2">
            {Array.from({ length: Math.min(sessions, 8) }).map((_, i) => (
              <motion.div
                key={i}
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                className="h-2.5 w-2.5 rounded-full"
                style={{ backgroundColor: preset.color }}
              />
            ))}
            {sessions > 8 && (
              <span className="text-xs text-muted-foreground">+{sessions - 8}</span>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
