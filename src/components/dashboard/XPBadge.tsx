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
        "flex items-center gap-2 rounded-lg border border-border/60 bg-card/60 px-3 py-2",
        className
      )}
    >
      <div className="flex items-center gap-1.5">
        <Zap className="h-3.5 w-3.5 text-warning" />
        <span className="text-xs font-bold text-foreground">Lv.{data.level}</span>
      </div>
      <div className="h-1.5 min-w-[60px] flex-1 rounded-full bg-muted/50">
        <div
          className="h-full rounded-full bg-warning transition-all duration-700"
          style={{ width: `${pct}%` }}
        />
      </div>
      <span className="text-[10px] text-muted-foreground">{data.xp}xp</span>
    </div>
  );
}
