import Link from "next/link";
import { ArrowRight, Check } from "lucide-react";

import { Button } from "@/components/ui/button";

const plans = [
  {
    name: "Personal",
    price: "Free",
    period: "during beta",
    description: "For students, creators, and founders building their Life OS.",
    highlighted: true,
    features: [
      "Full dashboard and all 12 modules",
      "AI Coach with daily focus and planning",
      "Timetable upload and schedule generation",
      "Goals, tasks, habits, and learning tracker",
      "Unlimited personal use",
    ],
  },
  {
    name: "Pro",
    price: "Soon",
    period: "coming later",
    description: "For power users and teams who need advanced automation.",
    highlighted: false,
    features: [
      "Everything in Personal",
      "Advanced AI agents and weekly reviews",
      "Client hub and finance integrations",
      "Priority AI processing",
      "Custom automations",
    ],
  },
];

export function PricingSection() {
  return (
    <section id="pricing" className="relative bg-[#0d1117] px-6 py-28">
      <div className="pointer-events-none absolute inset-x-0 top-0 h-px bg-linear-to-r from-transparent via-white/10 to-transparent" />
      <div className="mx-auto max-w-6xl">
        <div className="mx-auto mb-16 max-w-2xl text-center">
          <p className="text-xs font-semibold uppercase tracking-[0.2em] text-accent">
            Pricing
          </p>
          <h2 className="mt-4 text-3xl font-bold tracking-tight text-white sm:text-4xl lg:text-5xl">
            Start free. Execute better today.
          </h2>
          <p className="mt-5 text-base leading-relaxed text-slate-400">
            Life OS is free while we build the smartest personal operating
            system. No credit card and no template hunting.
          </p>
        </div>

        <div className="mx-auto grid max-w-4xl gap-6 md:grid-cols-2">
          {plans.map((plan) => (
            <article
              key={plan.name}
              className={`flex flex-col rounded-3xl border p-8 sm:p-10 ${
                plan.highlighted
                  ? "border-accent/30 bg-[#0c1222] shadow-[0_0_80px_rgba(59,130,246,0.1),0_24px_60px_rgba(0,0,0,0.4)]"
                  : "border-white/8 bg-[#010409]"
              }`}
            >
              {plan.highlighted && (
                <span className="mb-5 inline-flex w-fit rounded-full bg-accent px-3 py-1 text-xs font-semibold text-white">
                  Recommended
                </span>
              )}

              <p className="text-[11px] font-bold uppercase tracking-[0.18em] text-accent">
                {plan.name} plan
              </p>
              <div className="mt-4 flex items-baseline gap-2">
                <span className="text-4xl font-bold tracking-tight text-white sm:text-5xl">
                  {plan.price}
                </span>
                <span className="text-sm text-slate-500">{plan.period}</span>
              </div>
              <p className="mt-4 text-sm leading-relaxed text-slate-400">
                {plan.description}
              </p>

              <ul className="mt-8 flex-1 space-y-3.5">
                {plan.features.map((feature) => (
                  <li
                    key={feature}
                    className="flex items-start gap-3 text-sm text-slate-300"
                  >
                    <Check className="mt-0.5 h-4 w-4 shrink-0 text-accent" />
                    {feature}
                  </li>
                ))}
              </ul>

              {plan.highlighted ? (
                <Button className="mt-10 w-full rounded-xl py-6 text-base" asChild>
                  <Link href="/register">
                    Get started free
                    <ArrowRight className="h-4 w-4" />
                  </Link>
                </Button>
              ) : (
                <Button
                  variant="outline"
                  className="mt-10 w-full rounded-xl border-white/10 bg-transparent py-6 text-base text-slate-400"
                  disabled
                >
                  Coming soon
                </Button>
              )}
            </article>
          ))}
        </div>
      </div>
    </section>
  );
}
