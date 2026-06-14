import { DashboardShell } from "@/components/layout/DashboardShell";
import { PageSkeleton } from "@/components/layout/PageSkeleton";

export default function ClientsLoading() {
  return (
    <DashboardShell>
      <PageSkeleton cards={4} columns={2} />
    </DashboardShell>
  );
}
