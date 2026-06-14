import { DashboardShell } from "@/components/layout/DashboardShell";
import { ChatSkeleton } from "@/components/layout/PageSkeleton";

export default function CoachLoading() {
  return (
    <DashboardShell>
      <div className="space-y-2 mb-6">
        <div className="h-7 w-32 animate-pulse rounded-md bg-muted/60" />
        <div className="h-4 w-64 animate-pulse rounded-md bg-muted/60" />
      </div>
      <ChatSkeleton />
    </DashboardShell>
  );
}
