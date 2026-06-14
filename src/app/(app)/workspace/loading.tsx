import { DashboardShell } from "@/components/layout/DashboardShell";
import { PageSkeleton } from "@/components/layout/PageSkeleton";

export default function WorkspaceLoading() {
  return (
    <DashboardShell>
      <PageSkeleton cards={2} columns={2} hasHeader={false} />
    </DashboardShell>
  );
}
