"use client";

import Image from "next/image";
import type { CSSProperties } from "react";

const heroMascots = [
  {
    src: "/clay/clay-navigator.webp",
    glow: "clay-orb-glow-violet",
    className:
      "left-[0%] top-[26%] z-10 w-[44%] sm:left-[-2%] sm:top-[22%] sm:w-[50%]",
    delay: "0s",
    duration: "5.8s",
    tilt: -10,
  },
  {
    src: "/clay/clay-hourglass.webp",
    glow: "clay-orb-glow-amber",
    className:
      "left-[28%] top-[2%] z-30 w-[50%] sm:left-[26%] sm:top-[0%] sm:w-[56%]",
    delay: "0.5s",
    duration: "6.2s",
    tilt: 0,
  },
  {
    src: "/clay/clay-director.webp",
    glow: "clay-orb-glow-yellow",
    className:
      "right-[0%] top-[26%] z-20 w-[44%] sm:right-[-4%] sm:top-[24%] sm:w-[48%]",
    delay: "1s",
    duration: "5.5s",
    tilt: 12,
  },
  {
    src: "/clay/clay-sprout.webp",
    glow: "clay-orb-glow-green",
    className:
      "left-[16%] bottom-[4%] z-[25] w-[42%] sm:left-[14%] sm:bottom-[2%] sm:w-[46%]",
    delay: "1.5s",
    duration: "6.4s",
    tilt: -5,
  },
] as const;

export function HeroClayMascots() {
  return (
    <div
      className="relative mx-auto aspect-square w-full min-h-[240px] max-w-[min(100%,280px)] sm:max-w-[380px] sm:min-h-[300px] lg:max-w-[500px] xl:max-w-[560px]"
      aria-hidden
    >
      <div className="pointer-events-none absolute inset-[12%] rounded-full bg-gradient-to-br from-accent/10 via-violet-200/20 to-emerald-100/25 blur-2xl sm:inset-[10%] sm:blur-3xl" />

      {heroMascots.map((mascot) => (
        <div
          key={mascot.src}
          className={`hero-clay-mascot absolute ${mascot.className}`}
          style={
            {
              "--hero-tilt": `${mascot.tilt}deg`,
              animationDelay: mascot.delay,
              animationDuration: mascot.duration,
            } as CSSProperties
          }
        >
          <div className={`hero-clay-mascot-glow ${mascot.glow}`} />
          <Image
            src={mascot.src}
            alt=""
            width={320}
            height={320}
            sizes="(max-width: 640px) 140px, (max-width: 1024px) 200px, 280px"
            className="hero-clay-mascot-image"
            priority
          />
        </div>
      ))}

      <div className="hero-clay-floor pointer-events-none absolute bottom-[8%] left-1/2 h-6 w-[80%] -translate-x-1/2 rounded-[100%] bg-slate-900/[0.05] blur-md sm:bottom-[6%] sm:h-10 sm:w-[78%] sm:blur-lg" />
    </div>
  );
}
