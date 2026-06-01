"use client";

import { useEffect, useState } from "react";

const activities = [
  {
    tag: "CS",
    action: "Assignment due tonight",
    detail: "Data Structures: Problem Set 4",
  },
  {
    tag: "CL",
    action: "Client review scheduled",
    detail: "LPG Travels: Website deliverables",
  },
  {
    tag: "CT",
    action: "Content block added",
    detail: "AmassTechHub: Record 15 min script",
  },
  {
    tag: "LD",
    action: "Learning session logged",
    detail: "System Design: 45 minutes",
  },
];

export function RecentActivityWidget() {
  const [mounted, setMounted] = useState(false);
  const [activeIndex, setActiveIndex] = useState(0);

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    const interval = setInterval(() => {
      setActiveIndex((i) => (i + 1) % activities.length);
    }, 3000);
    return () => clearInterval(interval);
  }, []);

  return (
    <div className="widget-float widget-slide-in rounded-2xl border border-slate-200 bg-white p-5 shadow-[0_4px_24px_rgba(15,23,42,0.05)] [animation-delay:0.7s] [animation-fill-mode:forwards]">
      <p className="mb-4 text-[11px] font-semibold uppercase tracking-[0.16em] text-slate-500">
        Today&apos;s Focus
      </p>

      <div className="space-y-4">
        {activities.map((item, index) => (
          <div
            key={item.detail}
            className={`focus-list-item flex items-start gap-3 transition-all duration-500 ${
              mounted ? "focus-list-item-visible" : ""
            } ${
              index === activeIndex
                ? "translate-x-0.5 opacity-100"
                : "opacity-80"
            }`}
          >
            <span className="mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-blue-50 text-[10px] font-bold text-blue-700">
              {item.tag}
            </span>
            <div className="min-w-0 flex-1">
              <p
                className={`text-sm text-slate-800 transition-all duration-300 ${
                  index === activeIndex ? "font-semibold" : "font-medium"
                }`}
              >
                {item.action}
              </p>
              <p
                className={`mt-0.5 text-xs font-medium transition-colors duration-300 ${
                  index === activeIndex ? "text-accent" : "text-accent/75"
                }`}
              >
                {item.detail}
              </p>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
