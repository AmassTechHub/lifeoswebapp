"use client";

import { useEffect, useState } from "react";
import {
  Bot,
  Calendar,
  CheckSquare,
  Flame,
  LayoutDashboard,
  Play,
  Target,
} from "lucide-react";

import { LightWindowChrome } from "@/components/marketing/LightWindowChrome";
import { ProductPreviewGlow } from "@/components/marketing/ProductPreviewGlow";

const sidebar = [
  { icon: LayoutDashboard, label: "Dashboard", active: true },
  { icon: Target, label: "Goals", active: false },
  { icon: CheckSquare, label: "Tasks", active: false },
  { icon: Calendar, label: "Calendar", active: false },
  { icon: Flame, label: "Habits", active: false },
  { icon: Bot, label: "AI Coach", active: false },
];

const focusItems = [
  "Finish React assignment before 4 PM",
  "Record AmassTechHub script (15 min)",
  "Review LPG Travels deliverables",
];

export function DashboardWindowPreview() {
  const [activeIndex, setActiveIndex] = useState(0);
  const [executing, setExecuting] = useState(false);
  const [completed, setCompleted] = useState<number[]>([]);

  useEffect(() => {
    if (!executing) return;

    const timer = setInterval(() => {
      setActiveIndex((i) => {
        setCompleted((done) => (done.includes(i) ? done : [...done, i]));
        const next = i + 1;
        if (next >= focusItems.length) {
          setExecuting(false);
          return i;
        }
        return next;
      });
    }, 1200);

    return () => clearInterval(timer);
  }, [executing]);

  function handleExecute() {
    setCompleted([]);
    setActiveIndex(0);
    setExecuting(true);
  }

  function handleReset() {
    setExecuting(false);
    setCompleted([]);
    setActiveIndex(0);
  }

  return (
    <section className="bg-[#f8fafc] px-6 py-20 sm:py-24">
      <div className="mx-auto max-w-6xl">
        <div className="mb-10 max-w-xl">
          <p className="text-xs font-semibold uppercase tracking-[0.2em] text-accent">
            Dashboard
          </p>
          <h2 className="mt-3 text-3xl font-bold tracking-tight text-slate-900 sm:text-4xl">
            Your command center.
            <span className="mt-1 block text-accent">Clean. Focused. Yours.</span>
          </h2>
          <p className="mt-4 text-base leading-relaxed text-slate-600">
            Inside Life OS: a premium dashboard built for deep work, not
            distraction.
          </p>
        </div>

        <ProductPreviewGlow className="preview-float">
          <LightWindowChrome title="Life OS · dashboard">
            <div className="grid md:grid-cols-[210px_1fr]">
              <aside className="hidden border-r border-slate-200/80 bg-slate-50/80 p-4 md:block">
                <p className="mb-4 text-sm font-semibold text-slate-900">Life OS</p>
                <nav className="space-y-1">
                  {sidebar.map(({ icon: Icon, label, active }) => (
                    <div
                      key={label}
                      className={`flex items-center gap-2 rounded-lg px-3 py-2 text-sm ${
                        active
                          ? "bg-accent/10 font-medium text-accent"
                          : "text-slate-500"
                      }`}
                    >
                      <Icon className="h-4 w-4" />
                      {label}
                    </div>
                  ))}
                </nav>
              </aside>

              <div className="p-5 sm:p-6">
                <p className="text-sm text-slate-500">Good morning, Theophilus</p>
                <div className="mt-4 flex items-center justify-between gap-4">
                  <h3 className="text-lg font-semibold text-slate-900">
                    Today&apos;s Focus
                  </h3>
                  <span className="rounded-full bg-accent/10 px-2.5 py-1 text-[10px] font-medium text-accent">
                    {completed.length}/{focusItems.length} done
                  </span>
                </div>

                <ol className="mt-4 space-y-2.5">
                  {focusItems.map((item, index) => {
                    const isDone = completed.includes(index);
                    const isCurrent = index === activeIndex && executing;
                    return (
                      <li
                        key={item}
                        className={`flex items-start gap-3 rounded-xl border px-4 py-3 text-sm transition-all duration-500 ${
                          isDone
                            ? "border-emerald-200/80 bg-emerald-50/80 text-slate-500 line-through"
                            : isCurrent
                              ? "border-accent/30 bg-accent/5 text-slate-900 shadow-sm"
                              : "border-slate-200/80 bg-white text-slate-700"
                        }`}
                      >
                        <span
                          className={`flex h-6 w-6 shrink-0 items-center justify-center rounded-full text-xs font-semibold ${
                            isDone
                              ? "bg-emerald-100 text-emerald-600"
                              : isCurrent
                                ? "bg-accent text-white"
                                : "bg-slate-100 text-slate-500"
                          }`}
                        >
                          {isDone ? "✓" : index + 1}
                        </span>
                        {item}
                      </li>
                    );
                  })}
                </ol>

                <div className="mt-5 flex items-center gap-3">
                  <button
                    type="button"
                    onClick={handleExecute}
                    disabled={executing}
                    className="inline-flex items-center gap-2 rounded-full bg-accent px-5 py-2.5 text-sm font-medium text-white transition-colors hover:bg-accent/90 disabled:opacity-60"
                  >
                    <Play className="h-3.5 w-3.5 fill-current" />
                    {executing ? "Executing..." : "Execute focus"}
                  </button>
                  {completed.length > 0 && !executing && (
                    <button
                      type="button"
                      onClick={handleReset}
                      className="text-sm text-slate-500 transition-colors hover:text-slate-800"
                    >
                      Reset
                    </button>
                  )}
                </div>
              </div>
            </div>
          </LightWindowChrome>
        </ProductPreviewGlow>
      </div>
    </section>
  );
}
