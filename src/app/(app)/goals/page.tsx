import { GoalsPanel } from "@/components/goals/GoalsPanel";
import { DashboardShell } from "@/components/layout/DashboardShell";
import { PageHeader } from "@/components/layout/PageHeader";
import { getGoals } from "@/lib/actions/goals";
import { requireSession } from "@/lib/session";

export default async function GoalsPage() {
  const session = await requireSession();
  const goals = await getGoals(session.user.id);

  return (
    <DashboardShell>
      <PageHeader
        title="Goals"
        description="From vision down to what you do today."
      />
      <GoalsPanel goals={goals} />
    </DashboardShell>
  );
}
