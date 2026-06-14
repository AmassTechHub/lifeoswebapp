import { DashboardShell } from "@/components/layout/DashboardShell";
import { FinanceSkeleton } from "@/components/layout/PageSkeleton";

export default function FinanceLoading() {
  return (
    <DashboardShell>
      <FinanceSkeleton />
    </DashboardShell>
  );
}
