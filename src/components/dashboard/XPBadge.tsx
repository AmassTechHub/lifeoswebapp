"use client";

import { useEffect, useState } from "react";
import { Zap } from "lucide-react";

import { cn } from "@/lib/utils";

interface XPData {
  xp: number;
  level: number;
  xpInLevel: number;
  xpForNext: number;
}

export function XPBadge({ className }: { className?: string }) {
  const [data, setData] = useState<XPData | null>(null);

  useEffect(() => {
    fetch("/api/user/xp")
      .then((r) => r.json())
      .then((d: XPData) => setData(d))
      .catch(() => {});
  }, []);

  if (!data) return null;

  const pct = Math.min((data.xpInLevel / data.xpForNext) * 100, 100);

  return (
    <div
      className={cn(
        "flex items-center gap-2.5 rounded-lg border border-warning/20 bg-warning/5 px-3 py-2 shadow-sm",
        className
      )}
    >
      <div className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-warning/15">
        <Zap className="h-3.5 w-3.5 text-warning" />
      </div>
      <div className="flex flex-col gap-1">
        <div className="flex items-center gap-2">
          <span className="text-xs font-bold text-foreground">Level {data.level}</span>
          <span className="text-[10px] text-muted-foreground">{data.xp} XP</span>
        </div>
        <div className="h-1.5 min-w-15 flex-1 rounded-full bg-muted/50">
          <div
            className="h-full rounded-full bg-warning transition-all duration-700"
            style={{ width: `${pct}%` }}
          />
        </div>
      </div>
    </div>
  );
}
