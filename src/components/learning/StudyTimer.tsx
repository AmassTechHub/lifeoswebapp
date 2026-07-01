"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { CheckCircle2, Coffee, Play, RotateCcw, Settings2, Square, Timer, Zap } from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

type Mode = "work" | "break" | "longBreak";

const PRESETS = {
  pomodoro: { work: 25, shortBreak: 5, longBreak: 15, label: "Pomodoro" },
  short:    { work: 15, shortBreak: 3, longBreak: 10, label: "Short" },
  deep:     { work: 50, shortBreak: 10, longBreak: 20, label: "Deep Work" },
};
type Preset = keyof typeof PRESETS;

function fmt(secs: number) {
  const m = Math.floor(secs / 60).toString().padStart(2, "0");
  const s = (secs % 60).toString().padStart(2, "0");
  return `${m}:${s}`;
}

export function StudyTimer({ courseId, courseName }: { courseId: string; courseName: string }) {
  const [preset, setPreset] = useState<Preset>("pomodoro");
  const [mode, setMode] = useState<Mode>("work");
  const [running, setRunning] = useState(false);
  const [secs, setSecs] = useState(PRESETS.pomodoro.work * 60);
  const [pomodorosDone, setPomodorosDone] = useState(0);
  const [showSettings, setShowSettings] = useState(false);
  const [logging, setLogging] = useState(false);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const sessionStartRef = useRef<Date | null>(null);
  const workSecsRef = useRef(0);

  const config = PRESETS[preset];

  const totalSecs = mode === "work"
    ? config.work * 60
    : mode === "break" ? config.shortBreak * 60 : config.longBreak * 60;

  const pct = ((totalSecs - secs) / totalSecs) * 100;

  function resetTimer(newMode: Mode = mode, newPreset: Preset = preset) {
    if (intervalRef.current) clearInterval(intervalRef.current);
    setRunning(false);
    const c = PRESETS[newPreset];
    const t = newMode === "work" ? c.work * 60 : newMode === "break" ? c.shortBreak * 60 : c.longBreak * 60;
    setSecs(t);
  }

  const logWorkSession = useCallback(async (workSecs: number) => {
    if (workSecs < 60) return;
    setLogging(true);
    try {
      const res = await fetch("/api/study/session", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          courseId,
          durationSecs: workSecs,
          startedAt: sessionStartRef.current?.toISOString(),
          endedAt: new Date().toISOString(),
        }),
      });
      const data = await res.json();
      if (res.ok) toast.success(`+${data.xpEarned as number} XP — session logged`);
    } catch { /* silent */ }
    finally { setLogging(false); }
  }, [courseId]);

  // Tick
  useEffect(() => {
    if (!running) return;
    intervalRef.current = setInterval(() => {
      setSecs(prev => {
        if (prev <= 1) {
          // Timer finished
          clearInterval(intervalRef.current!);
          setRunning(false);

          if (mode === "work") {
            const elapsed = workSecsRef.current;
            workSecsRef.current = 0;
            logWorkSession(elapsed);

            const next = pomodorosDone + 1;
            setPomodorosDone(next);
            const isLong = next % 4 === 0;
            const nextMode: Mode = isLong ? "longBreak" : "break";
            setMode(nextMode);
            const c = PRESETS[preset];
            const t = isLong ? c.longBreak * 60 : c.shortBreak * 60;

            toast.success(`🍅 Pomodoro ${next} done! ${isLong ? "Long break time." : "Take a 5-min break."}`, {
              action: { label: "Start break", onClick: () => { setSecs(t); setRunning(true); sessionStartRef.current = new Date(); } },
            });
            return t;
          } else {
            const nextMode: Mode = "work";
            setMode(nextMode);
            const t = PRESETS[preset].work * 60;
            toast.info("Break over — ready for the next pomodoro?", {
              action: { label: "Start", onClick: () => { setSecs(t); setRunning(true); sessionStartRef.current = new Date(); workSecsRef.current = 0; } },
            });
            return t;
          }
        }
        if (mode === "work") workSecsRef.current++;
        return prev - 1;
      });
    }, 1000);
    return () => clearInterval(intervalRef.current!);
  }, [running, mode, preset, pomodorosDone, logWorkSession]);

  // Update page title while running
  useEffect(() => {
    if (running) {
      document.title = `${fmt(secs)} — ${mode === "work" ? courseName : "Break"} | Life OS`;
    } else {
      document.title = "Life OS";
    }
    return () => { document.title = "Life OS"; };
  }, [running, secs, mode, courseName]);

  function handleStart() {
    if (!running) {
      sessionStartRef.current = new Date();
      workSecsRef.current = 0;
    }
    setRunning(v => !v);
  }

  async function handleStop() {
    if (intervalRef.current) clearInterval(intervalRef.current);
    setRunning(false);
    if (mode === "work" && workSecsRef.current >= 60) {
      await logWorkSession(workSecsRef.current);
    }
    workSecsRef.current = 0;
    resetTimer();
  }

  const modeLabel = mode === "work" ? "Focus" : mode === "break" ? "Short break" : "Long break";
  const modeColor = mode === "work" ? "text-accent" : mode === "break" ? "text-success" : "text-blue-400";
  const ringColor = mode === "work" ? "stroke-accent" : mode === "break" ? "stroke-success" : "stroke-blue-400";

  const r = 36;
  const circumference = 2 * Math.PI * r;
  const dashOffset = circumference * (1 - pct / 100);

  return (
    <div className={cn(
      "rounded-2xl border px-4 py-4 transition-all",
      running && mode === "work" ? "border-accent/30 bg-accent/5" :
      running && mode !== "work" ? "border-success/30 bg-success/5" :
      "border-border/60 bg-card/60"
    )}>
      <div className="flex items-center gap-4">
        {/* Circular progress ring */}
        <div className="relative shrink-0">
          <svg width="88" height="88" className="-rotate-90">
            {/* Track */}
            <circle cx="44" cy="44" r={r} fill="none" strokeWidth="4" className="stroke-muted/30" />
            {/* Progress */}
            <circle
              cx="44" cy="44" r={r}
              fill="none" strokeWidth="4"
              className={cn("transition-all duration-1000", ringColor)}
              strokeLinecap="round"
              strokeDasharray={circumference}
              strokeDashoffset={dashOffset}
            />
          </svg>
          <div className="absolute inset-0 flex flex-col items-center justify-center">
            <p className="font-mono text-lg font-bold tabular-nums leading-none text-foreground">
              {fmt(secs)}
            </p>
            <p className={cn("text-[9px] font-semibold uppercase tracking-wide mt-0.5", modeColor)}>
              {modeLabel}
            </p>
          </div>
        </div>

        {/* Info + controls */}
        <div className="min-w-0 flex-1 space-y-2">
          <div className="flex items-center justify-between gap-2">
            <div>
              <p className="truncate text-sm font-medium text-foreground">{courseName}</p>
              <div className="mt-0.5 flex items-center gap-2">
                {pomodorosDone > 0 && (
                  <div className="flex items-center gap-1 text-[11px] text-accent">
                    <CheckCircle2 className="h-3 w-3" />
                    {pomodorosDone} pomodoro{pomodorosDone !== 1 ? "s" : ""}
                  </div>
                )}
                <div className="flex gap-0.5">
                  {Array.from({ length: 4 }).map((_, i) => (
                    <div
                      key={i}
                      className={cn("h-1.5 w-1.5 rounded-full",
                        i < (pomodorosDone % 4) ? "bg-accent" : "bg-muted/40"
                      )}
                    />
                  ))}
                </div>
              </div>
            </div>
            <button
              type="button"
              onClick={() => setShowSettings(v => !v)}
              className="rounded-lg p-1.5 text-muted-foreground/40 hover:bg-muted/50 hover:text-muted-foreground"
            >
              <Settings2 className="h-3.5 w-3.5" />
            </button>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={handleStart}
              className={cn(
                "flex flex-1 items-center justify-center gap-1.5 rounded-xl px-3 py-2 text-sm font-semibold transition-colors",
                running
                  ? "border border-amber-500/30 bg-amber-500/10 text-amber-400 hover:bg-amber-500/20"
                  : "bg-accent text-white hover:opacity-90"
              )}
            >
              {running ? (
                <><Coffee className="h-3.5 w-3.5" /> Pause</>
              ) : (
                <><Play className="h-3.5 w-3.5 fill-current" /> {secs === totalSecs ? "Start" : "Resume"}</>
              )}
            </button>
            {(running || secs !== totalSecs) && (
              <button
                type="button"
                onClick={handleStop}
                disabled={logging}
                className="flex items-center gap-1 rounded-xl border border-border/60 px-3 py-2 text-xs font-medium text-muted-foreground hover:text-foreground"
              >
                <Square className="h-3.5 w-3.5 fill-current" />
                Stop
              </button>
            )}
            <button
              type="button"
              onClick={() => { workSecsRef.current = 0; resetTimer(); }}
              className="rounded-xl border border-border/60 p-2 text-muted-foreground/40 hover:text-muted-foreground"
            >
              <RotateCcw className="h-3.5 w-3.5" />
            </button>
          </div>
        </div>
      </div>

      {/* Settings panel */}
      {showSettings && (
        <div className="mt-3 space-y-3 border-t border-border/40 pt-3">
          <p className="text-xs font-semibold text-muted-foreground">Timer preset</p>
          <div className="flex gap-2">
            {(Object.entries(PRESETS) as [Preset, typeof PRESETS.pomodoro][]).map(([key, p]) => (
              <button
                key={key}
                type="button"
                onClick={() => {
                  setPreset(key);
                  setMode("work");
                  workSecsRef.current = 0;
                  resetTimer("work", key);
                  setShowSettings(false);
                }}
                className={cn(
                  "flex-1 rounded-xl border px-2 py-2 text-center text-xs font-medium transition-all",
                  preset === key
                    ? "border-accent bg-accent/10 text-accent"
                    : "border-border/60 text-muted-foreground hover:border-accent/30"
                )}
              >
                <p className="font-semibold">{p.label}</p>
                <p className="text-[10px] opacity-60">{p.work}m / {p.shortBreak}m</p>
              </button>
            ))}
          </div>
          <div className="flex items-center gap-2 rounded-lg border border-accent/15 bg-accent/5 px-3 py-2">
            <Zap className="h-3.5 w-3.5 text-accent" />
            <p className="text-[11px] text-muted-foreground">
              Each completed pomodoro logs a study session and awards XP automatically.
            </p>
          </div>
        </div>
      )}
    </div>
  );
}
