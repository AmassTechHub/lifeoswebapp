"use client";

import { useEffect, useRef, useState } from "react";
import type { LucideIcon } from "lucide-react";
import {
  Briefcase,
  GraduationCap,
  Rocket,
  Target,
  Video,
  Zap,
} from "lucide-react";

import { cn } from "@/lib/utils";

type DomainCard = {
  icon: LucideIcon;
  title: string;
  subtitle: string;
  tilt: number;
  floatDelay: string;
  floatDuration: string;
  offset: string;
};

const domains: DomainCard[] = [
  {
    icon: GraduationCap,
    title: "Student",
    subtitle: "Lectures and study blocks",
    tilt: -4,
    floatDelay: "0s",
    floatDuration: "5.5s",
    offset: "md:translate-x-2",
  },
  {
    icon: Video,
    title: "Creator",
    subtitle: "Scripts to published content",
    tilt: 3,
    floatDelay: "0.8s",
    floatDuration: "6.2s",
    offset: "md:-translate-x-4 md:translate-y-2",
  },
  {
    icon: Briefcase,
    title: "Professional",
    subtitle: "Calendar and client work",
    tilt: -2,
    floatDelay: "1.4s",
    floatDuration: "5.8s",
    offset: "md:translate-x-6 md:-translate-y-1",
  },
  {
    icon: Rocket,
    title: "Founder",
    subtitle: "Goals, finance, and focus",
    tilt: 4,
    floatDelay: "0.4s",
    floatDuration: "6.5s",
    offset: "md:-translate-x-2 md:translate-y-4",
  },
  {
    icon: Target,
    title: "Planner",
    subtitle: "Vision to daily tasks",
    tilt: -3,
    floatDelay: "1.1s",
    floatDuration: "5.4s",
    offset: "md:translate-x-1 md:translate-y-6",
  },
  {
    icon: Zap,
    title: "Executor",
    subtitle: "Habits and deep work",
    tilt: 2,
    floatDelay: "1.8s",
    floatDuration: "6s",
    offset: "md:-translate-x-6",
  },
];

function FloatPill({
  icon: Icon,
  title,
  subtitle,
  tilt,
  floatDelay,
  floatDuration,
  visible,
}: DomainCard & { visible: boolean }) {
  return (
    <div
      className={cn(
        "drift-float flex items-center gap-3 rounded-2xl bg-white px-4 py-3.5 shadow-[0_10px_40px_rgba(15,23,42,0.07)] ring-1 ring-slate-200/70 transition-all duration-700",
        visible ? "translate-y-0 opacity-100" : "translate-y-6 opacity-0"
      )}
      style={
        {
          "--drift-tilt": `${tilt}deg`,
          animationDelay: floatDelay,
          animationDuration: floatDuration,
        } as React.CSSProperties
      }
    >
      <div className="flex h-10 w-12 shrink-0 items-center justify-center rounded-xl bg-slate-100">
        <Icon className="h-5 w-5 text-accent" strokeWidth={1.75} />
      </div>
      <div className="min-w-0">
        <p className="text-sm font-bold text-slate-900">{title}</p>
        <p className="text-xs text-slate-500">{subtitle}</p>
      </div>
    </div>
  );
}

export function LifeDomainsFloat() {
  const ref = useRef<HTMLElement>(null);
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const node = ref.current;
    if (!node) return;

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setVisible(true);
          observer.disconnect();
        }
      },
      { threshold: 0.2 }
    );

    observer.observe(node);
    return () => observer.disconnect();
  }, []);

  return (
    <section
      ref={ref}
      className="relative overflow-hidden bg-[#f8fafc] px-6 py-24 sm:py-28"
      aria-label="Life OS for every role"
    >
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_at_50%_0%,rgba(59,130,246,0.04),transparent_55%)]" />

      <div className="relative mx-auto max-w-6xl">
        <div
          className={cn(
            "mx-auto mb-16 max-w-xl text-center transition-all duration-700",
            visible ? "translate-y-0 opacity-100" : "translate-y-6 opacity-0"
          )}
        >
          <p className="text-xs font-semibold uppercase tracking-[0.2em] text-accent">
            Built for real lives
          </p>
          <h2 className="mt-4 text-3xl font-bold tracking-tight text-slate-900 sm:text-4xl">
            One OS. Every role you play.
          </h2>
          <p className="mt-4 text-base leading-relaxed text-slate-600">
            Student, creator, founder, or professional. Life OS adapts to how
            you actually work.
          </p>
        </div>

        <div className="mx-auto grid max-w-2xl grid-cols-1 gap-5 sm:grid-cols-2 sm:gap-x-10 sm:gap-y-8">
          {domains.map((domain, index) => (
            <div
              key={domain.title}
              className={cn(
                "transition-all duration-700",
                domain.offset,
                index % 2 === 1 && "sm:mt-8",
                index === 2 && "sm:col-span-2 sm:mx-auto sm:max-w-xs sm:mt-0",
                visible ? "opacity-100" : "opacity-0"
              )}
              style={{ transitionDelay: `${index * 80 + 150}ms` }}
            >
              <FloatPill {...domain} visible={visible} />
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
