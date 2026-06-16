import { CGPATracker } from "@/components/grades/CGPATracker";
import { DashboardShell } from "@/components/layout/DashboardShell";
import { PageHeader } from "@/components/layout/PageHeader";
import { getGrades, getPreviousRecord } from "@/lib/actions/grades";
import { requireSession } from "@/lib/session";

export default async function GradesPage() {
  const session = await requireSession();
  const [grades, prevRecord] = await Promise.all([
    getGrades(session.user.id),
    getPreviousRecord(),
  ]);

  return (
    <DashboardShell>
      <PageHeader
        title="Grade Tracker"
        description="Track your scores per course. Weighted average and GPA are calculated automatically."
      />
      <CGPATracker
        grades={grades}
        previousCWA={prevRecord.previousCWA}
        previousCredits={prevRecord.previousCredits}
      />
    </DashboardShell>
  );
}
