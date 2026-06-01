"use client";

import { useState } from "react";
import { Check } from "lucide-react";

import { dashboardCardClass } from "@/components/dashboard/dashboard-styles";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { cn } from "@/lib/utils";

const focusItems = [
  "Finish React assignment before 4 PM",
  "Record AmassTechHub script (15 min)",
  "Review LPG Travels deliverables",
  "30 minutes of System Design study",
];

export function TodaysFocus() {
  const [done, setDone] = useState<number[]>([]);

  function toggle(index: number) {
    setDone((prev) =>
      prev.includes(index) ? prev.filter((i) => i !== index) : [...prev, index]
    );
  }

  return (
    <Card id="todays-focus" className={cn(dashboardCardClass(true), "scroll-mt-24")}>
      <CardHeader>
        <div className="flex items-center justify-between gap-3">
          <CardTitle>Today&apos;s Focus</CardTitle>
          <Badge variant="secondary" className="bg-accent/15 text-accent">
            AI Generated
          </Badge>
        </div>
      </CardHeader>
      <CardContent>
        <p className="mb-4 text-sm leading-relaxed text-muted-foreground">
          What matters most today. Execute these before anything else.
        </p>
        <ol className="space-y-2.5">
          {focusItems.map((item, index) => {
            const isDone = done.includes(index);
            return (
              <li key={item}>
                <button
                  type="button"
                  onClick={() => toggle(index)}
                  className={cn(
                    "flex w-full items-start gap-3 rounded-lg border px-4 py-3 text-left text-sm transition-all",
                    isDone
                      ? "border-success/20 bg-success/5 text-muted-foreground line-through"
                      : "border-border/60 bg-background/40 hover:border-accent/25 hover:bg-accent/5"
                  )}
                >
                  <span
                    className={cn(
                      "flex h-6 w-6 shrink-0 items-center justify-center rounded-full text-xs font-semibold",
                      isDone
                        ? "bg-success/15 text-success"
                        : "bg-accent/15 text-accent"
                    )}
                  >
                    {isDone ? <Check className="h-3.5 w-3.5" /> : index + 1}
                  </span>
                  <span className="pt-0.5">{item}</span>
                </button>
              </li>
            );
          })}
        </ol>
        <p className="mt-4 text-xs text-muted-foreground">
          {done.length} of {focusItems.length} completed
        </p>
      </CardContent>
    </Card>
  );
}
