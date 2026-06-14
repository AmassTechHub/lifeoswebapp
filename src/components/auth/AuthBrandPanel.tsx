"use client";

import Link from "next/link";

const features = [
  { label: "Study system", detail: "Course timetable, flashcards, and AI study coach in one place." },
  { label: "Life tracking", detail: "Tasks, habits, goals, and finance wired into your daily plan." },
  { label: "Daily automation", detail: "Morning setup, evening review, and weekly planning on autopilot." },
];

export function AuthBrandPanel({ mode }: { mode: "login" | "register" }) {
  return (
    <div className="relative hidden h-full flex-col overflow-hidden bg-[#0a0a0a] lg:flex">
      {/* Subtle grid texture */}
      <div
        className="pointer-events-none absolute inset-0 opacity-[0.03]"
        style={{
          backgroundImage:
            "linear-gradient(rgba(255,255,255,.8) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,.8) 1px, transparent 1px)",
          backgroundSize: "48px 48px",
        }}
      />
      {/* Accent glow */}
      <div className="pointer-events-none absolute right-0 top-0 h-96 w-96 translate-x-1/2 -translate-y-1/2 rounded-full bg-accent/20 blur-[120px]" />
      <div className="pointer-events-none absolute bottom-0 left-0 h-64 w-64 -translate-x-1/2 translate-y-1/2 rounded-full bg-accent/10 blur-[100px]" />

      <div className="relative flex h-full flex-col justify-between p-10 xl:p-12">
        {/* Logo */}
        <Link
          href="/"
          className="text-[15px] font-semibold text-white/90 transition-opacity hover:opacity-70"
        >
          Life OS
        </Link>

        {/* Core message */}
        <div className="max-w-sm">
          <p className="mb-4 text-xs font-medium uppercase tracking-[0.2em] text-white/30">
            {mode === "register" ? "Start today" : "Welcome back"}
          </p>
          <h2 className="text-[2.25rem] font-bold leading-[1.15] tracking-tight text-white">
            {mode === "register"
              ? "One system for everything that matters."
              : "Pick up exactly where you left off."}
          </h2>
          <p className="mt-5 text-[14px] leading-relaxed text-white/40">
            {mode === "register"
              ? "Built for students and creators who want structure, not busywork."
              : "Your goals, schedule, and AI coach are ready."}
          </p>

          <div className="mt-10 space-y-6">
            {features.map((f, i) => (
              <div key={i} className="flex gap-4">
                <span className="mt-0.5 text-[11px] font-semibold tabular-nums text-white/20">
                  {String(i + 1).padStart(2, "0")}
                </span>
                <div>
                  <p className="text-[13px] font-semibold text-white/80">{f.label}</p>
                  <p className="mt-0.5 text-[12px] leading-relaxed text-white/35">{f.detail}</p>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Footer */}
        <p className="text-[11px] text-white/20">
          &copy; {new Date().getFullYear()} Life OS. All rights reserved.
        </p>
      </div>
    </div>
  );
}
