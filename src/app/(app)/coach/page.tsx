import { CoachPanel } from "@/components/coach/CoachPanel";
import { DashboardShell } from "@/components/layout/DashboardShell";
import { PageHeader } from "@/components/layout/PageHeader";
import { requireSession } from "@/lib/session";

export default async function CoachPage() {
  await requireSession();

  return (
    <DashboardShell>
      <PageHeader title="AI Coach" />
      <CoachPanel />
    </DashboardShell>
  );
}
