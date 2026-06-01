"use client";

import { useEffect, useState } from "react";
import { CheckCircle2, X } from "lucide-react";

import { smartAutomations } from "@/config/product";
import { LightWindowChrome } from "@/components/marketing/LightWindowChrome";
import { ProductPreviewGlow } from "@/components/marketing/ProductPreviewGlow";

export function SmartSystemSection() {
  const [activeCard, setActiveCard] = useState(0);

  useEffect(() => {
    const timer = setInterval(() => {
      setActiveCard((i) => (i + 1) % smartAutomations.length);
    }, 4000);
    return () => clearInterval(timer);
  }, []);

  return (
    <section id="features" className="bg-[#f8fafc] px-6 py-28">
      <div className="mx-auto max-w-6xl">
        <div className="grid items-center gap-14 lg:grid-cols-2">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.2em] text-accent">
              Smart System
            </p>
            <h2 className="mt-4 text-3xl font-bold tracking-tight text-slate-900 sm:text-4xl">
              Not another blank canvas.
              <span className="mt-1 block text-accent">An OS that runs itself.</span>
            </h2>
            <p className="mt-5 text-base leading-relaxed text-slate-600">
              Notion, Trello, and Calendar make you search templates, build
              boards, and manually wire everything together. Life OS is
              different. AI automates planning, scheduling, and focus so you
              execute instead of administrate.
            </p>

            <div className="mt-10 space-y-4">
              <div className="flex items-start gap-4 rounded-2xl border border-slate-200/80 bg-white p-5 shadow-sm">
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-slate-100">
                  <X className="h-4 w-4 text-slate-400" />
                </div>
                <div>
                  <p className="text-sm font-semibold text-slate-800">
                    Old way: hunt templates, copy setups, edit manually
                  </p>
                  <p className="mt-1.5 text-sm leading-relaxed text-slate-500">
                    Hours lost before you even start working.
                  </p>
                </div>
              </div>
              <div className="flex items-start gap-4 rounded-2xl border border-accent/20 bg-white p-5 shadow-sm">
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-accent/10">
                  <CheckCircle2 className="h-4 w-4 text-accent" />
                </div>
                <div>
                  <p className="text-sm font-semibold text-slate-900">
                    Life OS: upload context, AI builds your system
                  </p>
                  <p className="mt-1.5 text-sm leading-relaxed text-slate-600">
                    Timetables, goals, and tasks are generated and updated for you.
                  </p>
                </div>
              </div>
            </div>
          </div>

          <ProductPreviewGlow>
            <LightWindowChrome title="Life OS · Smart System">
            <div className="grid gap-3 p-4 sm:grid-cols-2 sm:p-5">
              {smartAutomations.map((item, index) => {
                const Icon = item.icon;
                const isActive = index === activeCard;
                return (
                  <article
                    key={item.title}
                    className={`flex min-h-[148px] flex-col rounded-xl border p-4 transition-all duration-500 ${
                      isActive
                        ? "border-accent/30 bg-accent/5 shadow-[0_8px_24px_rgba(59,130,246,0.08)]"
                        : "border-slate-200/80 bg-slate-50/50"
                    }`}
                    onMouseEnter={() => setActiveCard(index)}
                  >
                    <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-blue-50 text-accent">
                      <Icon className="h-[18px] w-[18px]" strokeWidth={1.75} />
                    </div>
                    <h3 className="mt-3 text-sm font-semibold leading-snug text-slate-900">
                      {item.title}
                    </h3>
                    <p className="mt-1.5 flex-1 text-xs leading-relaxed text-slate-500">
                      {item.description}
                    </p>
                  </article>
                );
              })}
            </div>
            </LightWindowChrome>
          </ProductPreviewGlow>
        </div>
      </div>
    </section>
  );
}
