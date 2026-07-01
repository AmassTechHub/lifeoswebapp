"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Loader2, Sparkles } from "lucide-react";

export function AutoPlanButton() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);

  async function handlePlan() {
    setLoading(true);
    try {
      const res = await fetch("/api/planner/auto-day", { method: "POST" });
      const data = await res.json();
      if (!res.ok) {
        toast.error(data.error ?? "Could not generate your day");
        return;
      }
      toast.success(
        data.blocksCreated > 0
          ? `Your day is planned — ${data.blocksCreated} block${data.blocksCreated !== 1 ? "s" : ""} added to your schedule`
          : "Your schedule is already set for today"
      );
      router.refresh();
    } catch {
      toast.error("Could not plan your day. Try again.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <button
      type="button"
      onClick={handlePlan}
      disabled={loading}
      className="flex items-center gap-1.5 rounded-xl border border-accent/30 bg-accent/10 px-3 py-1.5 text-xs font-semibold text-accent transition-colors hover:bg-accent/20 disabled:opacity-60"
    >
      {loading
        ? <Loader2 className="h-3.5 w-3.5 animate-spin" />
        : <Sparkles className="h-3.5 w-3.5" />
      }
      {loading ? "Planning…" : "Plan my day"}
    </button>
  );
}
