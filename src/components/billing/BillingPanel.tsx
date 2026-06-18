"use client";

import { useEffect, useState, useTransition } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { toast } from "sonner";
import { Check, Crown, Loader2 } from "lucide-react";

import { PLANS, type PlanKey } from "@/lib/billing/plans";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { cn } from "@/lib/utils";

const PRO_FEATURES = [
  "Unlimited AI messages every day",
  "Full Sonnet 4.6 model (not the lighter free-tier model)",
  "Priority response speed",
  "All AI Tutor modes: audio overviews, study guides, mind maps, exam prep",
];

export function BillingPanel({ isPro, proExpiresAt }: { isPro: boolean; proExpiresAt: string | null }) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [pending, startTransition] = useTransition();
  const [loadingPlan, setLoadingPlan] = useState<PlanKey | null>(null);
  const [verifying, setVerifying] = useState(false);

  useEffect(() => {
    const reference = searchParams.get("reference");
    if (!reference) return;
    setVerifying(true);
    fetch(`/api/billing/verify?reference=${encodeURIComponent(reference)}`)
      .then((r) => r.json())
      .then((data) => {
        if (data.status === "success") {
          toast.success("You're on Pro! Enjoy unlimited AI.");
          router.replace("/billing");
          router.refresh();
        } else {
          toast.info("Payment still processing — check back in a moment.");
        }
      })
      .catch(() => toast.error("Could not confirm payment status"))
      .finally(() => setVerifying(false));
  }, [searchParams, router]);

  function handleUpgrade(planKey: PlanKey) {
    setLoadingPlan(planKey);
    startTransition(async () => {
      try {
        const res = await fetch("/api/billing/checkout", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ plan: planKey }),
        });
        const data = await res.json();
        if (data.url) {
          window.location.href = data.url;
        } else {
          toast.error(data.error ?? "Could not start checkout");
          setLoadingPlan(null);
        }
      } catch {
        toast.error("Could not start checkout");
        setLoadingPlan(null);
      }
    });
  }

  if (isPro) {
    return (
      <Card className="border-accent/30 bg-accent/5">
        <CardContent className="flex items-center gap-4 pt-6">
          <Crown className="h-10 w-10 text-accent" />
          <div>
            <p className="text-lg font-bold text-foreground">You&apos;re on Pro</p>
            <p className="text-sm text-muted-foreground">
              {proExpiresAt
                ? `Renews/expires ${new Date(proExpiresAt).toLocaleDateString("en", { month: "long", day: "numeric", year: "numeric" })}`
                : "No expiry — enjoy unlimited AI."}
            </p>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      {verifying && (
        <div className="flex items-center gap-2 rounded-xl border border-border/60 bg-muted/30 px-4 py-3 text-sm text-muted-foreground">
          <Loader2 className="h-4 w-4 animate-spin" />
          Confirming your payment…
        </div>
      )}

      <div className="grid gap-4 sm:grid-cols-2">
        {(Object.values(PLANS)).map((plan) => (
          <Card
            key={plan.key}
            className={cn(
              "relative border-border/70 bg-card/80",
              plan.key === "pro_yearly" && "border-accent/40"
            )}
          >
            {plan.key === "pro_yearly" && (
              <span className="absolute -top-2.5 right-4 rounded-full bg-accent px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-wide text-white">
                Best value
              </span>
            )}
            <CardContent className="space-y-4 pt-6">
              <div>
                <p className="text-sm font-semibold text-muted-foreground">{plan.label}</p>
                <p className="mt-1 text-3xl font-bold text-foreground">
                  ₵{(plan.amountPesewas / 100).toFixed(0)}
                  <span className="text-sm font-medium text-muted-foreground">
                    /{plan.intervalDays >= 365 ? "year" : "month"}
                  </span>
                </p>
              </div>
              <Button
                className="w-full gap-1.5"
                disabled={pending}
                onClick={() => handleUpgrade(plan.key)}
              >
                {loadingPlan === plan.key ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
                Upgrade
              </Button>
            </CardContent>
          </Card>
        ))}
      </div>

      <Card className="border-border/70 bg-card/80">
        <CardContent className="space-y-2.5 pt-6">
          {PRO_FEATURES.map((f) => (
            <div key={f} className="flex items-start gap-2.5 text-sm text-foreground">
              <Check className="mt-0.5 h-4 w-4 shrink-0 text-success" />
              {f}
            </div>
          ))}
        </CardContent>
      </Card>
    </div>
  );
}
