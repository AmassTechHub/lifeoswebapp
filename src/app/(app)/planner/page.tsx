import { TimetableUpload } from "@/components/dashboard/TimetableUpload";
import { DashboardShell } from "@/components/layout/DashboardShell";
import { PageHeader } from "@/components/layout/PageHeader";
import { PlannerPanel } from "@/components/planner/PlannerPanel";
import { getPlannerDay } from "@/lib/actions/calendar";
import { requireSession } from "@/lib/session";

export default async function PlannerPage() {
  const session = await requireSession();
  const data = await getPlannerDay(session.user.id);

  return (
    <DashboardShell>
      <PageHeader
        title="Planner"
        description="Automated daily setup. Your schedule, focus, and score built from real data."
      />
      <div className="mb-8">
        <TimetableUpload />
      </div>
      <PlannerPanel data={data} />
    </DashboardShell>
  );
}
