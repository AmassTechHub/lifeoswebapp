"use client";

import { BarChart3, Flame, Target, Zap } from "lucide-react";

import { AnimatedStat } from "@/components/marketing/AnimatedStat";

const stats = [
  { label: "Tasks Done", value: 18, suffix: "", icon: Zap },
  { label: "Habit Streak", value: 5, suffix: "d", icon: Flame },
  { label: "Learning Hrs", value: 8, suffix: "", icon: BarChart3 },
  { label: "Active Goals", value: 12, suffix: "", icon: Target },
];

export function LiveStatsWidget() {
  return (
    <div className="widget-float widget-slide-in rounded-2xl border border-slate-200 bg-white p-5 shadow-[0_4px_24px_rgba(15,23,42,0.05)] [animation-fill-mode:forwards]">
      <div className="mb-4 flex items-center justify-between">
        <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-slate-500">
          Today&apos;s Pulse
        </p>
        <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-50 px-2.5 py-1 text-[11px] font-medium text-emerald-600">
          <span className="relative flex h-2 w-2">
            <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-400 opacity-50" />
            <span className="relative inline-flex h-2 w-2 rounded-full bg-emerald-500" />
          </span>
          Live
        </span>
      </div>

      <div className="grid grid-cols-2 gap-3">
        {stats.map(({ label, value, suffix, icon: Icon }, index) => (
          <div
            key={label}
            className="stat-tile rounded-xl border border-slate-100 bg-slate-50/50 p-3 transition-all duration-300 hover:-translate-y-0.5 hover:border-slate-200 hover:bg-white hover:shadow-sm"
            style={{ animationDelay: `${index * 75}ms` }}
          >
            <Icon className="mb-3 h-4 w-4 text-slate-400" />
            <p className="text-2xl font-bold tracking-tight text-slate-900">
              <AnimatedStat value={value} suffix={suffix} duration={900 + index * 120} />
            </p>
            <p className="mt-0.5 text-xs text-slate-500">{label}</p>
          </div>
        ))}
      </div>
    </div>
  );
}
