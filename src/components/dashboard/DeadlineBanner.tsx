import Link from "next/link";
import { AlertTriangle, Clock } from "lucide-react";

export function DeadlineBanner({
  overdueCount,
  dueTodayCount,
}: {
  overdueCount: number;
  dueTodayCount: number;
}) {
  if (overdueCount === 0 && dueTodayCount === 0) return null;

  if (overdueCount > 0) {
    return (
      <Link
        href="/tasks"
        className="mb-4 flex items-center gap-3 rounded-xl border border-danger/20 bg-danger/5 px-4 py-3 transition-colors hover:bg-danger/10"
      >
        <AlertTriangle className="h-4 w-4 shrink-0 text-danger" />
        <p className="text-sm font-medium text-danger">
          {overdueCount} overdue {overdueCount === 1 ? "task" : "tasks"} — clear them before they pile up
        </p>
        <span className="ml-auto text-xs text-danger/60">View tasks →</span>
      </Link>
    );
  }

  return (
    <Link
      href="/tasks"
      className="mb-4 flex items-center gap-3 rounded-xl border border-warning/20 bg-warning/5 px-4 py-3 transition-colors hover:bg-warning/10"
    >
      <Clock className="h-4 w-4 shrink-0 text-warning" />
      <p className="text-sm font-medium text-warning">
        {dueTodayCount} {dueTodayCount === 1 ? "task" : "tasks"} due today
      </p>
      <span className="ml-auto text-xs text-warning/60">View tasks →</span>
    </Link>
  );
}
