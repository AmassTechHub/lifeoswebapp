import { DashboardShell } from "@/components/layout/DashboardShell";
import { PageSkeleton } from "@/components/layout/PageSkeleton";

export default function GoalsLoading() {
  return (
    <DashboardShell>
      <PageSkeleton cards={6} columns={1} />
    </DashboardShell>
  );
}
