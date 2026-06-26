import { HabitsPanel } from "@/components/habits/HabitsPanel";
import { DashboardShell } from "@/components/layout/DashboardShell";
import { PageHeader } from "@/components/layout/PageHeader";
import { getHabitsWithLogs } from "@/lib/actions/habits";
import { requireSession } from "@/lib/session";

const HEATMAP_DAYS = 28;

export default async function HabitsPage() {
  const session = await requireSession();
  const habits = await getHabitsWithLogs(session.user.id, HEATMAP_DAYS);

  return (
    <DashboardShell>
      <PageHeader title="Habits" />
      <HabitsPanel habits={habits} days={HEATMAP_DAYS} />
    </DashboardShell>
  );
}
