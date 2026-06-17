"use client";

import { useEffect, useState } from "react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";

const ENERGY_LABELS = ["", "Drained", "Low", "Okay", "Good", "Energized"];
const ENERGY_EMOJIS = ["", "😴", "😔", "😐", "😊", "💪"];

export function DailyCheckIn() {
  const [done, setDone] = useState<boolean | null>(null);
  const [dismissed, setDismissed] = useState(false);
  const [energy, setEnergy] = useState(0);
  const [priority, setPriority] = useState("");
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    fetch("/api/checkin")
      .then((r) => r.json())
      .then((d: { done: boolean }) => setDone(d.done))
      .catch(() => setDone(true));
  }, []);

  async function handleSubmit() {
    if (!energy) { toast.error("Pick an energy level first"); return; }
    setSubmitting(true);
    try {
      const res = await fetch("/api/checkin", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ energyLevel: energy, topPriority: priority }),
      });
      if (res.ok) {
        setDone(true);
        toast.success("Check-in saved! +5 XP. Have a great day.");
      } else {
        toast.error("Could not save check-in");
      }
    } catch {
      toast.error("Could not save check-in");
    } finally {
      setSubmitting(false);
    }
  }

  if (done === null || done || dismissed) return null;

  return (
    <div className="mb-4 space-y-4 rounded-2xl border border-accent/25 bg-accent/5 p-5">
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="font-semibold text-foreground">Morning check-in</p>
          <p className="mt-0.5 text-sm text-muted-foreground">How are you feeling today?</p>
        </div>
        <button
          type="button"
          onClick={() => setDismissed(true)}
          className="text-xs text-muted-foreground hover:text-foreground"
        >
          Skip
        </button>
      </div>

      <div className="flex gap-2">
        {([1, 2, 3, 4, 5] as const).map((n) => (
          <button
            key={n}
            type="button"
            onClick={() => setEnergy(n)}
            className={cn(
              "flex flex-1 flex-col items-center gap-1 rounded-xl border py-3 text-center transition-all",
              energy === n
                ? "border-accent bg-accent/15 text-accent"
                : "border-border/60 bg-card/60 text-muted-foreground hover:border-accent/40"
            )}
          >
            <span className="text-xl">{ENERGY_EMOJIS[n]}</span>
            <span className="text-[10px] font-medium leading-tight">{ENERGY_LABELS[n]}</span>
          </button>
        ))}
      </div>

      <Input
        value={priority}
        onChange={(e) => setPriority(e.target.value)}
        placeholder="#1 priority for today (e.g. finish DSA assignment)"
        className="bg-card/50"
        onKeyDown={(e) => e.key === "Enter" && handleSubmit()}
      />

      <Button className="w-full" onClick={handleSubmit} disabled={submitting || !energy}>
        {submitting ? "Saving..." : "Start my day →"}
      </Button>
    </div>
  );
}
