"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import {
  ArrowRight,
  Bot,
  CheckCircle2,
  LayoutDashboard,
  Target,
} from "lucide-react";

const highlights = [
  {
    icon: LayoutDashboard,
    title: "One dashboard for your entire life",
    detail: "Focus, deadlines, schedule, and progress, unified.",
  },
  {
    icon: Target,
    title: "Goals that connect top to bottom",
    detail: "Vision to daily tasks in one hierarchy.",
  },
  {
    icon: Bot,
    title: "AI Coach when you need direction",
    detail: "Daily planner, weekly review, study and content coach.",
  },
];

const bullets = [
  "Track tasks, habits, and learning",
  "Manage clients and content pipelines",
  "Execute with clarity every single day",
];

export function AuthBrandPanel({ mode }: { mode: "login" | "register" }) {
  const [active, setActive] = useState(0);
  const [visible, setVisible] = useState(true);

  useEffect(() => {
    const interval = setInterval(() => {
      setVisible(false);
      setTimeout(() => {
        setActive((i) => (i + 1) % highlights.length);
        setVisible(true);
      }, 250);
    }, 4000);
    return () => clearInterval(interval);
  }, []);

  const item = highlights[active];

  return (
    <div className="relative hidden h-full overflow-hidden bg-[#0f172a] lg:flex lg:flex-col">
      <div className="auth-panel-glow pointer-events-none absolute inset-0" />
      <div className="pointer-events-none absolute -left-20 top-20 h-64 w-64 rounded-full bg-accent/20 blur-3xl" />
      <div className="pointer-events-none absolute bottom-10 right-0 h-48 w-48 rounded-full bg-accent/10 blur-3xl" />

      <div className="relative flex h-full flex-col p-10 xl:p-12">
        <div>
          <Link href="/" className="text-lg font-semibold text-white transition-opacity hover:opacity-80">
            Life OS
          </Link>

          <div className="mt-10 max-w-md">
            <p className="inline-flex rounded-full border border-accent/20 bg-accent/10 px-3 py-1 text-xs font-medium text-accent">
              The Operating System For Your Life
            </p>
            <h2 className="mt-6 text-3xl font-bold leading-tight tracking-tight text-white xl:text-4xl">
              {mode === "register"
                ? "Design your life. Execute your vision."
                : "Welcome back. Pick up where you left off."}
            </h2>
            <p className="mt-4 text-sm leading-relaxed text-slate-400">
              {mode === "register"
                ? "Join ambitious students, creators, and founders who run their life from one system."
                : "Your dashboard, goals, and AI coach are ready when you are."}
            </p>
          </div>
        </div>

        <div className="mt-10 flex flex-1 flex-col justify-center gap-10 xl:mt-12">
          <div
            className={`rounded-2xl border border-white/10 bg-white/5 p-5 backdrop-blur-sm transition-all duration-500 ${
              visible ? "translate-y-0 opacity-100" : "translate-y-2 opacity-0"
            }`}
          >
            <div className="flex items-start gap-4">
              <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-accent/15 text-accent">
                <item.icon className="h-5 w-5" />
              </div>
              <div>
                <p className="font-semibold text-white">{item.title}</p>
                <p className="mt-1 text-sm text-slate-400">{item.detail}</p>
              </div>
            </div>
            <div className="mt-4 flex gap-1.5">
              {highlights.map((_, i) => (
                <span
                  key={i}
                  className={`h-1 rounded-full transition-all duration-300 ${
                    i === active ? "w-6 bg-accent" : "w-2 bg-white/20"
                  }`}
                />
              ))}
            </div>
          </div>

          <ul className="space-y-4">
            {bullets.map((bullet, i) => (
              <li
                key={bullet}
                className="auth-bullet flex items-center gap-3 text-sm text-slate-300"
                style={{ animationDelay: `${i * 100 + 200}ms` }}
              >
                <CheckCircle2 className="h-4 w-4 shrink-0 text-emerald-400" />
                {bullet}
              </li>
            ))}
          </ul>
        </div>

        <Link
          href="/"
          className="group mt-10 inline-flex items-center gap-2 border-t border-white/10 pt-8 text-sm text-slate-500 transition-colors hover:text-white xl:mt-12 xl:pt-10"
        >
          Explore the homepage
          <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-0.5" />
        </Link>
      </div>
    </div>
  );
}
