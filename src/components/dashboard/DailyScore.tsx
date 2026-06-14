"use client";

import Link from "next/link";
import { motion } from "framer-motion";

import { dashboardCardClass } from "@/components/dashboard/dashboard-styles";
import type { ScoreBreakdown } from "@/lib/automation/daily-score";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { cn } from "@/lib/utils";

const RADIUS = 42;
const CIRCUMFERENCE = 2 * Math.PI * RADIUS;

function ScoreRing({ value }: { value: number }) {
  const clamped = Math.max(0, Math.min(100, value));
  const offset = CIRCUMFERENCE * (1 - clamped / 100);

  const color =
    clamped >= 80
      ? "stroke-success"
      : clamped >= 55
        ? "stroke-accent"
        : "stroke-warning";

  return (
    <div className="relative flex h-28 w-28 shrink-0 items-center justify-center">
      <svg width="112" height="112" viewBox="0 0 112 112" className="-rotate-90">
        {/* Track */}
        <circle
          cx="56"
          cy="56"
          r={RADIUS}
          fill="none"
          strokeWidth="8"
          className="stroke-muted/40"
        />
        {/* Fill */}
        <motion.circle
          cx="56"
          cy="56"
          r={RADIUS}
          fill="none"
          strokeWidth="8"
          strokeLinecap="round"
          strokeDasharray={CIRCUMFERENCE}
          initial={{ strokeDashoffset: CIRCUMFERENCE }}
          animate={{ strokeDashoffset: offset }}
          transition={{ duration: 1.2, ease: [0.25, 0.46, 0.45, 0.94], delay: 0.2 }}
          className={color}
        />
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        <motion.span
          className="text-2xl font-bold tabular-nums text-foreground"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.5 }}
        >
          {clamped}
        </motion.span>
        <span className="text-[10px] font-medium text-muted-foreground">/ 100</span>
      </div>
    </div>
  );
}

export function DailyScore({
  average,
  scores,
  hasSnapshot,
}: {
  average: number;
  scores: ScoreBreakdown[];
  hasSnapshot: boolean;
}) {
  return (
    <Card className={dashboardCardClass()}>
      <CardHeader>
        <CardTitle>Daily Score</CardTitle>
      </CardHeader>
      <CardContent className="space-y-5">
        <div className="flex items-center gap-5">
          <ScoreRing value={average} />
          <div className="min-w-0 flex-1 space-y-2">
            {!hasSnapshot && (
              <p className="text-xs text-muted-foreground">
                <Link href="/planner" className="text-accent hover:underline">
                  Run daily setup
                </Link>{" "}
                to calculate from real data.
              </p>
            )}
            {scores.slice(0, 3).map((score, i) => (
              <div key={score.label}>
                <div className="flex items-center justify-between text-xs">
                  <span className="text-muted-foreground truncate">{score.label}</span>
                  <span className={cn("font-semibold tabular-nums shrink-0 ml-2", score.color)}>
                    {score.value}%
                  </span>
                </div>
                <div className="mt-1 h-1.5 w-full overflow-hidden rounded-full bg-muted/40">
                  <motion.div
                    className="h-full rounded-full bg-accent"
                    initial={{ width: 0 }}
                    animate={{ width: `${score.value}%` }}
                    transition={{ duration: 0.8, delay: 0.3 + i * 0.1, ease: "easeOut" }}
                  />
                </div>
              </div>
            ))}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
