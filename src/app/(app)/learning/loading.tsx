import { DashboardShell } from "@/components/layout/DashboardShell";
import { StudySkeleton } from "@/components/layout/PageSkeleton";

export default function LearningLoading() {
  return (
    <DashboardShell>
      <StudySkeleton />
    </DashboardShell>
  );
}
