"use client";

import { Briefcase, GraduationCap, Video } from "lucide-react";

const heroTags = [
  {
    icon: GraduationCap,
    title: "Student",
    subtitle: "Study blocks",
    className: "left-0 -top-2",
    tilt: -6,
    delay: "0s",
    duration: "5.2s",
  },
  {
    icon: Video,
    title: "Creator",
    subtitle: "Content hub",
    className: "right-[-4%] top-[4%]",
    tilt: 4,
    delay: "0.6s",
    duration: "6s",
  },
  {
    icon: Briefcase,
    title: "Professional",
    subtitle: "Client work",
    className: "bottom-[22%] left-[6%]",
    tilt: 3,
    delay: "1.2s",
    duration: "5.6s",
  },
];

export function HeroFloatingTags() {
  return (
    <div
      className="pointer-events-none absolute inset-0 hidden lg:block"
      aria-hidden
    >
      {heroTags.map((tag) => {
        const Icon = tag.icon;
        return (
          <div
            key={tag.title}
            className={`drift-float absolute flex items-center gap-2.5 rounded-2xl bg-white px-3.5 py-2.5 shadow-[0_12px_40px_rgba(15,23,42,0.08)] ring-1 ring-slate-200/70 ${tag.className}`}
            style={
              {
                "--drift-tilt": `${tag.tilt}deg`,
                animationDelay: tag.delay,
                animationDuration: tag.duration,
              } as React.CSSProperties
            }
          >
            <div className="flex h-8 w-10 items-center justify-center rounded-lg bg-slate-100">
              <Icon className="h-4 w-4 text-accent" strokeWidth={1.75} />
            </div>
            <div>
              <p className="text-xs font-bold text-slate-900">{tag.title}</p>
              <p className="text-[10px] text-slate-500">{tag.subtitle}</p>
            </div>
          </div>
        );
      })}
    </div>
  );
}
