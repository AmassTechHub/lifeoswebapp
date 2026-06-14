import { DashboardShell } from "@/components/layout/DashboardShell";
import { DashboardSkeleton } from "@/components/layout/PageSkeleton";

export default function DashboardLoading() {
  return (
    <DashboardShell>
      <DashboardSkeleton />
    </DashboardShell>
  );
}
