"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import Link from "next/link";
import type { LucideIcon } from "lucide-react";
import { ArrowRight } from "lucide-react";

import { modules } from "@/config/product";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

const AUTO_INTERVAL_MS = 4500;
const MODULE_COUNT = modules.length;

function getWrappedOffset(index: number, active: number) {
  let diff = index - active;
  if (diff > MODULE_COUNT / 2) diff -= MODULE_COUNT;
  if (diff < -MODULE_COUNT / 2) diff += MODULE_COUNT;
  return diff;
}

function CarouselGlobe() {
  return (
    <div className="pointer-events-none absolute left-1/2 top-[52%] h-[min(520px,88vw)] w-[min(520px,88vw)] -translate-x-1/2 -translate-y-1/2">
      <div className="modules-globe-pulse absolute inset-[12%] rounded-full bg-accent/10 blur-3xl" />

      <svg
        viewBox="0 0 400 400"
        className="modules-globe-spin relative h-full w-full opacity-55"
        aria-hidden
      >
        <defs>
          <radialGradient id="modulesGlobeGlow" cx="50%" cy="50%" r="50%">
            <stop offset="0%" stopColor="#3b82f6" stopOpacity="0.22" />
            <stop offset="100%" stopColor="#3b82f6" stopOpacity="0" />
          </radialGradient>
        </defs>

        <circle cx="200" cy="200" r="165" fill="url(#modulesGlobeGlow)" />

        {[0, 60, 120].map((angle) => (
          <g key={angle} transform={`rotate(${angle} 200 200)`} opacity="0.12">
            <circle cx="200" cy="200" r="80" fill="none" stroke="#60a5fa" strokeWidth="0.5" />
            <circle cx="280" cy="200" r="80" fill="none" stroke="#60a5fa" strokeWidth="0.5" />
            <circle cx="240" cy="269.28" r="80" fill="none" stroke="#60a5fa" strokeWidth="0.5" />
            <circle cx="160" cy="269.28" r="80" fill="none" stroke="#60a5fa" strokeWidth="0.5" />
            <circle cx="120" cy="200" r="80" fill="none" stroke="#60a5fa" strokeWidth="0.5" />
            <circle cx="160" cy="130.72" r="80" fill="none" stroke="#60a5fa" strokeWidth="0.5" />
            <circle cx="240" cy="130.72" r="80" fill="none" stroke="#60a5fa" strokeWidth="0.5" />
          </g>
        ))}

        {[0, 30, 60, 90, 120, 150].map((rotate) => (
          <ellipse
            key={rotate}
            cx="200"
            cy="200"
            rx="165"
            ry="52"
            fill="none"
            stroke="#3b82f6"
            strokeWidth="0.5"
            opacity="0.28"
            transform={`rotate(${rotate} 200 200)`}
          />
        ))}

        <circle
          cx="200"
          cy="200"
          r="165"
          fill="none"
          stroke="#60a5fa"
          strokeWidth="0.6"
          opacity="0.35"
        />
      </svg>
    </div>
  );
}

function ModuleCarouselCard({
  icon: Icon,
  tag,
  headline,
  description,
  isActive,
  contentKey,
}: {
  icon: LucideIcon;
  tag: string;
  headline: string;
  description: string;
  isActive: boolean;
  contentKey: number;
}) {
  return (
    <div
      className={cn(
        "flex min-h-[300px] flex-col rounded-3xl border p-8 sm:min-h-[320px] sm:p-9",
        "bg-[#0a0f18]/95 backdrop-blur-md",
        isActive
          ? "module-card-active-glow border-accent/30"
          : "border-white/6 shadow-[0_20px_50px_rgba(0,0,0,0.45)]"
      )}
    >
      <div
        className={cn(
          "flex h-11 w-11 items-center justify-center rounded-xl bg-accent/10 text-accent ring-1 ring-accent/20 transition-all duration-700",
          isActive ? "scale-100 opacity-100" : "scale-95 opacity-70"
        )}
      >
        <Icon className="h-5 w-5" strokeWidth={1.75} />
      </div>

      {isActive ? (
        <div key={contentKey}>
          <p className="module-content-in module-content-in-delay-1 mt-6 text-[11px] font-bold uppercase tracking-[0.2em] text-accent">
            {tag}
          </p>
          <h3 className="module-content-in module-content-in-delay-2 mt-3 text-xl font-bold leading-[1.2] tracking-tight text-white sm:text-2xl">
            {headline}
          </h3>
          <p className="module-content-in module-content-in-delay-3 mt-4 text-sm leading-relaxed text-slate-400">
            {description}
          </p>
        </div>
      ) : (
        <>
          <p className="mt-6 text-[11px] font-bold uppercase tracking-[0.2em] text-accent/60">
            {tag}
          </p>
          <h3 className="mt-3 text-xl font-bold leading-[1.2] tracking-tight text-white/60 sm:text-2xl">
            {headline}
          </h3>
          <p className="mt-4 text-sm leading-relaxed text-slate-500">{description}</p>
        </>
      )}
    </div>
  );
}

export function ModulesSection() {
  const sectionRef = useRef<HTMLElement>(null);
  const pausedRef = useRef(false);
  const cycleStartRef = useRef(Date.now());
  const rafProgressRef = useRef<number | null>(null);

  const [active, setActive] = useState(0);
  const [inView, setInView] = useState(false);
  const [revealed, setRevealed] = useState(false);
  const [cycleProgress, setCycleProgress] = useState(0);

  const activeModule = modules[active];

  const resetCycle = useCallback(() => {
    cycleStartRef.current = Date.now();
    setCycleProgress(0);
  }, []);

  useEffect(() => {
    const node = sectionRef.current;
    if (!node) return;

    const observer = new IntersectionObserver(
      ([entry]) => {
        setInView(entry.isIntersecting);
        if (entry.isIntersecting) setRevealed(true);
      },
      { threshold: 0.15 }
    );
    observer.observe(node);
    return () => observer.disconnect();
  }, []);

  useEffect(() => {
    if (!inView) return;

    const timer = setInterval(() => {
      if (pausedRef.current) return;
      setActive((i) => (i + 1) % MODULE_COUNT);
      resetCycle();
    }, AUTO_INTERVAL_MS);

    return () => clearInterval(timer);
  }, [inView, resetCycle]);

  useEffect(() => {
    if (!inView || pausedRef.current) {
      if (rafProgressRef.current) cancelAnimationFrame(rafProgressRef.current);
      return;
    }

    const tick = () => {
      const elapsed = Date.now() - cycleStartRef.current;
      setCycleProgress(Math.min(1, elapsed / AUTO_INTERVAL_MS));
      rafProgressRef.current = requestAnimationFrame(tick);
    };

    rafProgressRef.current = requestAnimationFrame(tick);
    return () => {
      if (rafProgressRef.current) cancelAnimationFrame(rafProgressRef.current);
    };
  }, [inView, active]);

  function handlePick(index: number) {
    setActive(index);
    resetCycle();
    pausedRef.current = true;
    setTimeout(() => {
      pausedRef.current = false;
      resetCycle();
    }, AUTO_INTERVAL_MS);
  }

  return (
    <section
      id="modules"
      ref={sectionRef}
      className="relative overflow-hidden bg-[#0d1117] px-6 py-28"
    >
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_at_center,rgba(59,130,246,0.08),transparent_65%)]" />

      <div className="relative mx-auto max-w-6xl">
        <div
          className={cn(
            "mb-10 flex flex-col gap-8 transition-all duration-700 lg:mb-12 lg:flex-row lg:items-end lg:justify-between",
            revealed ? "translate-y-0 opacity-100" : "translate-y-8 opacity-0"
          )}
        >
          <div className="max-w-2xl">
            <p className="text-xs font-semibold uppercase tracking-[0.2em] text-accent">
              Modules
            </p>
            <h2 className="mt-3 text-3xl font-bold tracking-tight text-white sm:text-4xl">
              Every part of your life.
              <span className="mt-1 block text-accent">One connected system.</span>
            </h2>
              <p className="mt-4 max-w-xl text-base leading-relaxed text-slate-400">
                Ten connected modules cycle automatically. Each one handles a
                real part of your life, from goals and habits to finance and AI.
              </p>
          </div>
          <Button
            className="h-11 shrink-0 rounded-full bg-accent px-6 hover:bg-accent/90"
            asChild
          >
            <Link href="/register">
              Start building
              <ArrowRight className="h-4 w-4" />
            </Link>
          </Button>
        </div>

        <div
          className={cn(
            "relative transition-all duration-1000 delay-150",
            revealed ? "opacity-100" : "opacity-0"
          )}
        >
          <CarouselGlobe />

          <div
            className="relative mx-auto flex h-[380px] max-w-4xl items-center justify-center sm:h-[420px]"
            style={{
              perspective: "1600px",
              perspectiveOrigin: "50% 50%",
              transformStyle: "preserve-3d",
            }}
          >
            {modules.map((mod, index) => {
              const offset = getWrappedOffset(index, active);
              const isActive = offset === 0;
              const visible = Math.abs(offset) <= 1;

              return (
                <article
                  key={mod.name}
                  className={cn(
                    "module-carousel-card absolute w-[min(92vw,400px)] cursor-pointer",
                    isActive ? "z-30" : "z-10",
                    !visible && "pointer-events-none opacity-0"
                  )}
                  style={{
                    transform: `
                      translateX(${offset * 68}%)
                      translateZ(${isActive ? 48 : -80}px)
                      scale(${isActive ? 1 : 0.76})
                      rotateY(${offset * -18}deg)
                    `,
                    opacity: isActive ? 1 : visible ? 0.38 : 0,
                    filter: isActive ? "none" : visible ? "blur(2.5px)" : "blur(4px)",
                  }}
                  onClick={() => !isActive && handlePick(index)}
                >
                  <ModuleCarouselCard
                    {...mod}
                    isActive={isActive}
                    contentKey={active}
                  />
                </article>
              );
            })}
          </div>

          <div className="relative z-40 mt-8 flex flex-col items-center gap-4">
            <div
              className="flex max-w-full flex-wrap items-center justify-center gap-1.5 px-4"
              role="tablist"
              aria-label="Life OS modules"
            >
              {modules.map((mod, i) => (
                <button
                  key={mod.name}
                  type="button"
                  role="tab"
                  aria-selected={i === active}
                  onClick={() => handlePick(i)}
                  aria-label={`Show ${mod.name} module`}
                  className={cn(
                    "rounded-full px-2.5 py-1 text-[10px] font-medium transition-all duration-500 ease-out",
                    i === active
                      ? "scale-105 bg-accent/15 text-accent ring-1 ring-accent/30"
                      : "text-slate-500 hover:scale-105 hover:bg-white/5 hover:text-slate-300"
                  )}
                >
                  {mod.name}
                </button>
              ))}
            </div>

            <div className="flex w-full max-w-xs flex-col items-center gap-2">
              <div
                className="h-0.5 w-full overflow-hidden rounded-full bg-white/8"
                aria-hidden
              >
                <div
                  className="h-full rounded-full bg-accent"
                  style={{ width: `${cycleProgress * 100}%` }}
                />
              </div>
              <p className="text-xs text-slate-600">
                {active + 1} of {MODULE_COUNT} · {activeModule.name} · auto cycling
              </p>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
