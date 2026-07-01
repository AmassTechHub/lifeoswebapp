import { DashboardShell } from "@/components/layout/DashboardShell";
import { BillingPanel } from "@/components/billing/BillingPanel";
import { isUserPro } from "@/lib/billing/plans";
import { prisma } from "@/lib/prisma";
import { requireSession } from "@/lib/session";

export default async function BillingPage() {
  const session = await requireSession();
  const user = await prisma.user.findUnique({
    where: { id: session.user.id },
    select: { isPro: true, proExpiresAt: true },
  });

  return (
    <DashboardShell>
      <header className="mb-6">
        <h1 className="text-2xl font-bold tracking-tight sm:text-3xl">Upgrade to Pro</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Unlimited AI messages, the full Claude 3.5 Sonnet model, and priority support.
        </p>
      </header>
      <BillingPanel
        isPro={user ? isUserPro(user) : false}
        proExpiresAt={user?.proExpiresAt?.toISOString() ?? null}
      />
    </DashboardShell>
  );
}
