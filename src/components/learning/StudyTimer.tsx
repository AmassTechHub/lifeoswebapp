"use client";

import { useRef, useState } from "react";
import { Play, Square, Timer } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

export function StudyTimer({ courseId, courseName }: { courseId: string; courseName: string }) {
  const [running, setRunning] = useState(false);
  const [secs, setSecs] = useState(0);
  const [logging, setLogging] = useState(false);
  const startRef = useRef<Date | null>(null);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  function start() {
    startRef.current = new Date();
    setSecs(0);
    setRunning(true);
    intervalRef.current = setInterval(() => setSecs((s) => s + 1), 1000);
  }

  async function stop() {
    if (intervalRef.current) clearInterval(intervalRef.current);
    setRunning(false);
    const elapsed = secs;
    setSecs(0);

    if (elapsed < 60) {
      toast.info("Sessions under 1 minute are not logged");
      return;
    }

    setLogging(true);
    try {
      const res = await fetch("/api/study/session", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          courseId,
          durationSecs: elapsed,
          startedAt: startRef.current?.toISOString(),
          endedAt: new Date().toISOString(),
        }),
      });
      const data = await res.json();
      if (res.ok) {
        const mins = Math.floor(elapsed / 60);
        toast.success(`${mins}m study session logged! +${data.xpEarned as number} XP`);
      } else {
        toast.error((data.error as string) ?? "Failed to log session");
      }
    } catch {
      toast.error("Could not log session");
    } finally {
      setLogging(false);
    }
  }

  const mm = Math.floor(secs / 60).toString().padStart(2, "0");
  const ss = (secs % 60).toString().padStart(2, "0");

  return (
    <div
      className={cn(
        "flex items-center gap-3 rounded-xl border px-4 py-3 transition-all",
        running ? "border-accent/40 bg-accent/10" : "border-border/60 bg-card/60"
      )}
    >
      <Timer
        className={cn("h-4 w-4 shrink-0", running ? "animate-pulse text-accent" : "text-muted-foreground")}
      />
      <div className="min-w-0 flex-1">
        <p className="truncate text-xs text-muted-foreground">
          {running ? `Studying: ${courseName}` : "Study timer"}
        </p>
        {running && (
          <p className="font-mono text-lg font-bold tabular-nums text-foreground">
            {mm}:{ss}
          </p>
        )}
      </div>
      {running ? (
        <Button
          size="sm"
          variant="outline"
          className="gap-1.5 border-accent/40 text-accent hover:bg-accent/10"
          onClick={stop}
          disabled={logging}
        >
          <Square className="h-3.5 w-3.5 fill-current" />
          {logging ? "Logging..." : "Stop & log"}
        </Button>
      ) : (
        <Button size="sm" className="gap-1.5" onClick={start}>
          <Play className="h-3.5 w-3.5 fill-current" />
          Start
        </Button>
      )}
    </div>
  );
}
