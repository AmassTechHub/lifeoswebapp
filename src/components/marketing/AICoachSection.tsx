"use client";

import { useState } from "react";
import Link from "next/link";
import {
  ArrowRight,
  Bot,
  FileUp,
  Loader2,
  Upload,
} from "lucide-react";

import { Button } from "@/components/ui/button";
import { ProductPreviewGlow } from "@/components/marketing/ProductPreviewGlow";

const mockGeneratedSchedule = [
  { time: "07:00", label: "Devotion and planning", source: "AI" },
  { time: "08:00", label: "Software Engineering lecture", source: "Timetable" },
  { time: "10:00", label: "Data Structures lab", source: "Timetable" },
  { time: "14:00", label: "Client work block", source: "AI" },
  { time: "16:00", label: "System Design study block", source: "AI" },
  { time: "19:00", label: "Content recording", source: "AI" },
];

const chatMessages = [
  {
    role: "coach" as const,
    text: "Welcome. Upload your timetable and I will build your week around goals, clients, and study blocks.",
  },
  {
    role: "user" as const,
    text: "Here is my CS timetable. Add client work in the gaps.",
  },
  {
    role: "coach" as const,
    text: "Done. Six blocks merged with your goals. Review your schedule on the right.",
  },
];

export function AICoachSection() {
  const [processing, setProcessing] = useState(false);
  const [generated, setGenerated] = useState(false);

  function handleDemoUpload() {
    setProcessing(true);
    setGenerated(false);
    setTimeout(() => {
      setProcessing(false);
      setGenerated(true);
    }, 2200);
  }

  return (
    <section
      id="ai-coach"
      className="relative overflow-hidden bg-[#f8fafc] px-6 py-28"
    >
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_at_50%_0%,rgba(59,130,246,0.05),transparent_55%)]" />

      <div className="relative mx-auto max-w-6xl">
        <div className="mx-auto mb-16 max-w-2xl text-center">
          <p className="text-xs font-semibold uppercase tracking-[0.2em] text-accent">
            AI Coach
          </p>
          <h2 className="mt-4 text-3xl font-bold tracking-tight text-slate-900 sm:text-4xl lg:text-5xl">
            Accelerate your entire workflow
          </h2>
          <p className="mt-5 text-base leading-relaxed text-slate-600">
            Upload your timetable. Life OS reads it, builds your personal schedule,
            and fills gaps with goals, client work, and study automatically.
          </p>
          <Button className="mt-8 rounded-full px-7" asChild>
            <Link href="/register">
              Try AI Coach free
              <ArrowRight className="h-4 w-4" />
            </Link>
          </Button>
        </div>

        <ProductPreviewGlow className="preview-float">
          <div className="overflow-hidden rounded-2xl border border-slate-200/80 bg-[#0d1117] shadow-[0_40px_100px_rgba(0,0,0,0.35)]">
          <div className="flex items-center gap-2 border-b border-white/5 bg-[#010409] px-4 py-3">
            <div className="h-3 w-3 rounded-full bg-[#ff5f57]" />
            <div className="h-3 w-3 rounded-full bg-[#febc2e]" />
            <div className="h-3 w-3 rounded-full bg-[#28c840]" />
            <span className="ml-3 text-xs text-slate-500">Life OS · AI Coach</span>
          </div>

          <div className="grid lg:grid-cols-[340px_1fr]">
            <aside className="border-b border-white/5 bg-[#010409] p-5 lg:border-b-0 lg:border-r">
              <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-slate-500">
                Life OS AI Coach: Chat
              </p>

              <div className="mt-5 space-y-4">
                {chatMessages.map((msg, i) => (
                  <div key={i} className="flex gap-3">
                    {msg.role === "coach" && (
                      <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-accent/15 text-accent">
                        <Bot className="h-4 w-4" />
                      </div>
                    )}
                    <div
                      className={
                        msg.role === "user"
                          ? "ml-auto max-w-[85%] rounded-xl rounded-tr-sm bg-white/10 px-3.5 py-2.5 text-sm text-slate-200"
                          : "max-w-[90%] text-sm leading-relaxed text-slate-300"
                      }
                    >
                      {msg.text}
                    </div>
                  </div>
                ))}
              </div>

              <div className="mt-6 flex flex-wrap gap-2">
                {["Daily focus", "Weekly review", "Study coach"].map((pill) => (
                  <span
                    key={pill}
                    className="inline-flex rounded-full border border-white/10 bg-white/5 px-2.5 py-1 text-[10px] font-medium text-slate-400"
                  >
                    {pill}
                  </span>
                ))}
              </div>
            </aside>

            <div className="p-5 sm:p-6">
              <div className="mb-5 flex items-center justify-between">
                <p className="text-sm font-semibold text-white">
                  Timetable Intelligence
                </p>
                <span className="rounded-full bg-accent/15 px-2.5 py-1 text-[10px] font-medium text-accent">
                  Live demo
                </span>
              </div>

              {!generated && !processing && (
                <button
                  type="button"
                  onClick={handleDemoUpload}
                  className="flex w-full flex-col items-center justify-center rounded-xl border border-dashed border-white/10 bg-white/3 px-6 py-14 transition-colors hover:border-accent/30 hover:bg-accent/5"
                >
                  <Upload className="h-8 w-8 text-accent" />
                  <p className="mt-4 text-sm font-medium text-white">
                    Upload timetable
                  </p>
                  <p className="mt-1 text-xs text-slate-500">
                    PDF, PNG, or JPG. Click to simulate.
                  </p>
                </button>
              )}

              {processing && (
                <div className="flex flex-col items-center justify-center rounded-xl border border-accent/20 bg-accent/5 py-20">
                  <Loader2 className="h-8 w-8 animate-spin text-accent" />
                  <p className="mt-4 text-sm font-medium text-white">
                    AI reading your timetable...
                  </p>
                  <p className="mt-1 text-xs text-slate-500">
                    Extracting classes, labs, and free blocks
                  </p>
                </div>
              )}

              {generated && (
                <div>
                  <div className="mb-4 flex items-center gap-2 rounded-lg bg-emerald-500/10 px-3 py-2 text-xs text-emerald-400">
                    <FileUp className="h-3.5 w-3.5" />
                    Personal timetable generated and merged with your goals
                  </div>
                  <div className="space-y-2">
                    {mockGeneratedSchedule.map((block) => (
                      <div
                        key={`${block.time}-${block.label}`}
                        className="flex items-center gap-3 rounded-lg border border-white/5 bg-white/3 px-4 py-3"
                      >
                        <span className="w-12 shrink-0 font-mono text-xs text-slate-500">
                          {block.time}
                        </span>
                        <span className="flex-1 text-sm text-white">{block.label}</span>
                        <span
                          className={`shrink-0 rounded-md px-2 py-0.5 text-[10px] font-medium ${
                            block.source === "Timetable"
                              ? "bg-white/10 text-slate-300"
                              : "bg-accent/15 text-accent"
                          }`}
                        >
                          {block.source}
                        </span>
                      </div>
                    ))}
                  </div>
                  <button
                    type="button"
                    onClick={() => setGenerated(false)}
                    className="mt-4 text-xs text-slate-500 transition-colors hover:text-white"
                  >
                    Reset demo
                  </button>
                </div>
              )}
            </div>
          </div>
          </div>
        </ProductPreviewGlow>
      </div>
    </section>
  );
}
