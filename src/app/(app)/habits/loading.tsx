import { DashboardShell } from "@/components/layout/DashboardShell";
import { PageSkeleton } from "@/components/layout/PageSkeleton";

export default function HabitsLoading() {
  return (
    <DashboardShell>
      <PageSkeleton cards={4} columns={1} />
    </DashboardShell>
  );
}
