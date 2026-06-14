import { FinancePanel } from "@/components/finance/FinancePanel";
import { DashboardShell } from "@/components/layout/DashboardShell";
import { PageHeader } from "@/components/layout/PageHeader";
import { getFinanceSummary, getMonthlySpending } from "@/lib/actions/finance";
import { requireSession } from "@/lib/session";

export default async function FinancePage() {
  const session = await requireSession();
  const [data, monthlySpending] = await Promise.all([
    getFinanceSummary(session.user.id),
    getMonthlySpending(session.user.id),
  ]);

  return (
    <DashboardShell>
      <PageHeader
        title="Finance"
        description="Track income, expenses, and see where your money goes each month."
      />
      <FinancePanel data={data} monthlySpending={monthlySpending} />
    </DashboardShell>
  );
}
