import { FinancePanel } from "@/components/finance/FinancePanel";
import { DashboardShell } from "@/components/layout/DashboardShell";
import { PageHeader } from "@/components/layout/PageHeader";
import { getFinanceSummary, getMonthlySpending } from "@/lib/actions/finance";
import { getBudgetData } from "@/lib/actions/budget";
import { requireSession } from "@/lib/session";
import { getUserPrefs } from "@/lib/user-prefs";

export default async function FinancePage() {
  const session = await requireSession();
  const [data, monthlySpending, budgetData, prefs] = await Promise.all([
    getFinanceSummary(session.user.id),
    getMonthlySpending(session.user.id),
    getBudgetData(session.user.id),
    getUserPrefs(session.user.id),
  ]);

  return (
    <DashboardShell>
      <PageHeader title="Finance" />
      <FinancePanel
        data={data}
        monthlySpending={monthlySpending}
        budgets={budgetData.budgets}
        budgetSpending={budgetData.spending}
        savingsGoals={budgetData.savingsGoals}
        currency={prefs.currency}
      />
    </DashboardShell>
  );
}
