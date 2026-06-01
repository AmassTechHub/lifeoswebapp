"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { ArrowRight } from "lucide-react";

import { Button } from "@/components/ui/button";

export function HeroAnimatedContent() {
  const router = useRouter();
  const [email, setEmail] = useState("");

  function handleSignup(e: React.FormEvent) {
    e.preventDefault();
    const trimmed = email.trim();
    if (trimmed) {
      router.push(`/register?email=${encodeURIComponent(trimmed)}`);
      return;
    }
    router.push("/register");
  }

  return (
    <div className="flex flex-col justify-center lg:max-w-xl xl:max-w-[34rem]">
      <h1 className="hero-reveal text-[2.35rem] font-bold leading-[1.1] tracking-tight text-slate-900 sm:text-5xl lg:text-[3.25rem] xl:text-[3.5rem]">
        <span className="hero-reveal-item block" style={{ animationDelay: "0ms" }}>
          Plan Better.
        </span>
        <span
          className="hero-reveal-item block text-accent"
          style={{ animationDelay: "80ms" }}
        >
          Execute Daily.
        </span>
        <span
          className="hero-reveal-item block"
          style={{ animationDelay: "160ms" }}
        >
          Your Life OS.
        </span>
      </h1>

      <p
        className="hero-reveal-item mt-5 max-w-md text-base leading-[1.7] text-slate-600 sm:mt-6 sm:max-w-lg sm:text-lg"
        style={{ animationDelay: "240ms" }}
      >
        Unify goals, tasks, habits, learning, finance, clients, and AI coach in
        one system. Track spending, build streaks, schedule your week, and let
        AI plan what matters most today.
      </p>

      <form
        onSubmit={handleSignup}
        className="hero-reveal-item mt-7 sm:mt-8"
        style={{ animationDelay: "320ms" }}
      >
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
          <input
            type="email"
            name="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="Enter your email"
            autoComplete="email"
            className="h-12 w-full rounded-full border border-slate-200 bg-white px-5 text-sm text-slate-900 outline-none transition-all placeholder:text-slate-400 focus:border-accent focus:ring-2 focus:ring-accent/15 sm:max-w-[280px]"
          />
          <Button
            type="submit"
            size="lg"
            className="hero-cta group h-12 shrink-0 rounded-full bg-accent px-7 shadow-md shadow-accent/20 hover:bg-accent/90"
          >
            Start Your Life OS
            <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-0.5" />
          </Button>
        </div>
        <p className="mt-4 text-sm text-slate-500">
          Already using Life OS?{" "}
          <Link href="/login" className="font-medium text-accent hover:underline">
            Sign in
          </Link>
        </p>
      </form>
    </div>
  );
}
