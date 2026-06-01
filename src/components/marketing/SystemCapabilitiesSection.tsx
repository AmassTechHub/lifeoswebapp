"use client";

import Image from "next/image";
import { useEffect, useRef, useState } from "react";

import { landingCapabilities } from "@/config/product";
import { cn } from "@/lib/utils";

const glowClass: Record<(typeof landingCapabilities)[number]["glow"], string> = {
  violet: "clay-orb-glow-violet",
  amber: "clay-orb-glow-amber",
  orange: "clay-orb-glow-orange",
  green: "clay-orb-glow-green",
  pink: "clay-orb-glow-pink",
  yellow: "clay-orb-glow-yellow",
};

function ClayFeatureOrb({
  src,
  alt,
  glow,
  delay,
  visible,
}: {
  src: string;
  alt: string;
  glow: (typeof landingCapabilities)[number]["glow"];
  delay: string;
  visible: boolean;
}) {
  return (
    <div
      className={cn(
        "clay-orb-shell transition-all duration-700",
        visible ? "scale-100 opacity-100" : "scale-90 opacity-0"
      )}
      style={{ animationDelay: delay }}
    >
      <div className={cn("clay-orb-glow", glowClass[glow])} />
      <div className="clay-orb-float" style={{ animationDelay: delay }}>
        <Image
          src={src}
          alt={alt}
          width={220}
          height={220}
          sizes="(max-width: 640px) 112px, (max-width: 1024px) 136px, 152px"
          className="clay-orb-image"
          priority={delay === "0s"}
        />
      </div>
    </div>
  );
}

export function SystemCapabilitiesSection() {
  const sectionRef = useRef<HTMLElement>(null);
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const node = sectionRef.current;
    if (!node) return;

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setVisible(true);
          observer.disconnect();
        }
      },
      { threshold: 0.1 }
    );

    observer.observe(node);
    return () => observer.disconnect();
  }, []);

  return (
    <section
      id="capabilities"
      ref={sectionRef}
      className="relative overflow-hidden bg-[#f8fafc] px-4 py-16 sm:px-6 sm:py-24 lg:py-28"
    >
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_at_50%_0%,rgba(59,130,246,0.06),transparent_55%)]" />

      <div className="relative mx-auto max-w-6xl">
        <div
          className={cn(
            "mx-auto mb-16 max-w-3xl text-center transition-all duration-700",
            visible ? "translate-y-0 opacity-100" : "translate-y-8 opacity-0"
          )}
        >
          <p className="text-xs font-semibold uppercase tracking-[0.2em] text-accent">
            What you get
          </p>
          <h2 className="mt-4 text-2xl font-bold tracking-tight text-slate-900 sm:text-4xl lg:text-5xl">
            One system for planning, habits, money,
            <span className="mt-1 block text-accent">and everything in between.</span>
          </h2>
          <p className="mx-auto mt-5 max-w-2xl text-base leading-relaxed text-slate-600">
            Life OS is not a blank template. It is a full operating system: AI
            automation, smart scheduling, habit tracking, expense control, and
            modules for learning, clients, and content.
          </p>
        </div>

        <div className="grid gap-5 sm:grid-cols-2 sm:gap-6 lg:grid-cols-3">
          {landingCapabilities.map((cap, index) => (
            <article
              key={cap.title}
              className={cn(
                "group flex flex-col rounded-2xl border border-slate-200/80 bg-white p-5 shadow-sm transition-all duration-500 sm:rounded-3xl sm:p-7",
                "hover:-translate-y-1 hover:border-accent/25 hover:shadow-[0_20px_50px_rgba(59,130,246,0.08)]",
                visible ? "translate-y-0 opacity-100" : "translate-y-8 opacity-0"
              )}
              style={{ transitionDelay: `${index * 80 + 120}ms` }}
            >
              <div className="flex justify-center sm:justify-start">
                <ClayFeatureOrb
                  src={cap.clayImage}
                  alt={cap.title}
                  glow={cap.glow}
                  delay={cap.orbDelay}
                  visible={visible}
                />
              </div>

              <p className="mt-4 text-center text-[11px] font-bold uppercase tracking-[0.18em] text-accent sm:mt-5 sm:text-left">
                {cap.tag}
              </p>
              <h3 className="mt-2 text-center text-lg font-bold tracking-tight text-slate-900 sm:text-left sm:text-xl">
                {cap.title}
              </h3>
              <p className="mt-3 text-sm leading-relaxed text-slate-600">
                {cap.description}
              </p>

              <ul className="mt-4 space-y-2 border-t border-slate-100 pt-4">
                {cap.bullets.map((bullet) => (
                  <li
                    key={bullet}
                    className="flex items-start gap-2 text-sm text-slate-600"
                  >
                    <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-accent" />
                    {bullet}
                  </li>
                ))}
              </ul>

              {"comingSoon" in cap && (
                <p className="mt-4 rounded-xl border border-accent/20 bg-accent/5 px-3 py-2.5 text-xs leading-relaxed text-slate-700">
                  <span className="font-semibold text-accent">Coming soon: </span>
                  {cap.comingSoon}
                </p>
              )}
            </article>
          ))}
        </div>
      </div>
    </section>
  );
}
