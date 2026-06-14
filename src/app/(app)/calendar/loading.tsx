import { DashboardShell } from "@/components/layout/DashboardShell";
import { PageSkeleton } from "@/components/layout/PageSkeleton";

export default function CalendarLoading() {
  return (
    <DashboardShell>
      <PageSkeleton cards={5} columns={1} />
    </DashboardShell>
  );
}
