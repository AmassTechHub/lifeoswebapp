import { DashboardShell } from "@/components/layout/DashboardShell";
import { KanbanSkeleton } from "@/components/layout/PageSkeleton";

export default function TasksLoading() {
  return (
    <DashboardShell>
      <KanbanSkeleton />
    </DashboardShell>
  );
}
