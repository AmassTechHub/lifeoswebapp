import { DashboardShell } from "@/components/layout/DashboardShell";
import { PageSkeleton } from "@/components/layout/PageSkeleton";

export default function PlannerLoading() {
  return (
    <DashboardShell>
      <PageSkeleton cards={3} columns={2} />
    </DashboardShell>
  );
}
