export type PlanKey = "pro_monthly" | "pro_yearly";

export type Plan = {
  key: PlanKey;
  label: string;
  amountPesewas: number; // smallest currency unit for GHS
  intervalDays: number;
  description: string;
};

// Pricing is a placeholder default, not a business decision made on the
// founder's behalf — change freely, this is the only place it's defined.
export const PLANS: Record<PlanKey, Plan> = {
  pro_monthly: {
    key: "pro_monthly",
    label: "Pro Monthly",
    amountPesewas: 2000, // GHS 20.00
    intervalDays: 30,
    description: "Unlimited AI messages, Sonnet 4.6, priority support",
  },
  pro_yearly: {
    key: "pro_yearly",
    label: "Pro Yearly",
    amountPesewas: 18000, // GHS 180.00 (~25% off monthly)
    intervalDays: 365,
    description: "Everything in Pro Monthly, ~25% cheaper per month",
  },
};

export function isUserPro(user: { isPro: boolean; proExpiresAt?: Date | null }): boolean {
  if (!user.isPro) return false;
  if (!user.proExpiresAt) return true; // manually granted, no expiry
  return user.proExpiresAt.getTime() > Date.now();
}
