import { DashboardShell } from "@/components/layout/DashboardShell";
import { PageSkeleton } from "@/components/layout/PageSkeleton";

export default function ContentLoading() {
  return (
    <DashboardShell>
      <PageSkeleton cards={5} columns={3} />
    </DashboardShell>
  );
}
