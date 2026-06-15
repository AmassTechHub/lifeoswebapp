import { CGPATracker } from "@/components/grades/CGPATracker";
import { DashboardShell } from "@/components/layout/DashboardShell";
import { PageHeader } from "@/components/layout/PageHeader";
import { getGrades } from "@/lib/actions/grades";
import { requireSession } from "@/lib/session";

export default async function GradesPage() {
  const session = await requireSession();
  const grades = await getGrades(session.user.id);

  return (
    <DashboardShell>
      <PageHeader
        title="CGPA Tracker"
        description="Track your grades semester by semester and watch your CGPA grow."
      />
      <CGPATracker grades={grades} />
    </DashboardShell>
  );
}
