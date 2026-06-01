"use client";

import { useEffect, useState } from "react";
import { Pause, Play } from "lucide-react";

const items = [
  "Goals",
  "Planner",
  "Calendar",
  "Tasks",
  "Habits",
  "Learning",
  "Content Hub",
  "Clients",
  "Finance",
  "AI Coach",
  "Smart Focus",
  "Timetable AI",
];

export function LogoMarquee() {
  const [paused, setPaused] = useState(false);
  const [reducedMotion, setReducedMotion] = useState(false);
  const track = [...items, ...items];

  useEffect(() => {
    const media = window.matchMedia("(prefers-reduced-motion: reduce)");
    const update = () => setReducedMotion(media.matches);
    update();
    media.addEventListener("change", update);
    return () => media.removeEventListener("change", update);
  }, []);

  const isScrolling = !paused && !reducedMotion;
  const displayItems = isScrolling ? track : items;

  return (
    <section
      className="border-y border-white/5 bg-[#0d1117]"
      aria-label="Life OS modules"
    >
      <div className="mx-auto flex max-w-6xl items-center gap-4 px-6 py-5">
        <div className="relative min-w-0 flex-1 overflow-hidden">
          <div className="pointer-events-none absolute inset-y-0 left-0 z-10 w-16 bg-linear-to-r from-[#0d1117] to-transparent" />
          <div className="pointer-events-none absolute inset-y-0 right-0 z-10 w-16 bg-linear-to-l from-[#0d1117] to-transparent" />

          <div
            className={`marquee-track flex w-max items-center gap-14 ${!isScrolling ? "marquee-static" : ""}`}
            style={{ animationPlayState: isScrolling ? "running" : "paused" }}
            aria-live="off"
          >
            {displayItems.map((item, i) => (
              <a
                key={`${item}-${i}`}
                href="#modules"
                className="whitespace-nowrap text-sm font-semibold tracking-wide text-white/35 transition-colors hover:text-white/70"
              >
                {item}
              </a>
            ))}
          </div>
        </div>

        <div className="flex shrink-0 items-center gap-3 border-l border-white/10 pl-4">
          <p className="hidden text-[11px] font-medium text-white/40 sm:block">
            {reducedMotion
              ? "Motion off"
              : paused
                ? "Scroll paused"
                : "Scrolling"}
          </p>
          <button
            type="button"
            onClick={() => setPaused((p) => !p)}
            disabled={reducedMotion}
            title={
              reducedMotion
                ? "Scrolling disabled in reduced motion mode"
                : paused
                  ? "Resume module scroll"
                  : "Pause module scroll"
            }
            aria-label={
              reducedMotion
                ? "Scrolling disabled"
                : paused
                  ? "Resume module scroll"
                  : "Pause module scroll"
            }
            aria-pressed={paused}
            className="flex h-9 w-9 items-center justify-center rounded-full border border-white/10 text-white/50 transition-colors hover:border-white/25 hover:bg-white/5 hover:text-white disabled:cursor-not-allowed disabled:opacity-40"
          >
            {paused || reducedMotion ? (
              <Play className="h-3.5 w-3.5" />
            ) : (
              <Pause className="h-3.5 w-3.5" />
            )}
          </button>
        </div>
      </div>
    </section>
  );
}
