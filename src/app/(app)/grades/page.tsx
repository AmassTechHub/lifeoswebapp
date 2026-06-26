import { CGPATracker } from "@/components/grades/CGPATracker";
import { DashboardShell } from "@/components/layout/DashboardShell";
import { PageHeader } from "@/components/layout/PageHeader";
import { getGrades, getPreviousRecord } from "@/lib/actions/grades";
import { requireSession } from "@/lib/session";
import { getUserPrefs } from "@/lib/user-prefs";
import { GRADING_SYSTEMS } from "@/lib/grades-constants";

export default async function GradesPage() {
  const session = await requireSession();
  const [grades, prevRecord, prefs] = await Promise.all([
    getGrades(session.user.id),
    getPreviousRecord(),
    getUserPrefs(session.user.id),
  ]);

  // Validate that the user's saved grading system key exists; fall back to knust
  const gradingSystemKey = Object.keys(GRADING_SYSTEMS).includes(prefs.gradingSystem)
    ? prefs.gradingSystem
    : "knust";

  return (
    <DashboardShell>
      <PageHeader title="Grades" />
      <CGPATracker
        grades={grades}
        previousCWA={prevRecord.previousCWA}
        previousCredits={prevRecord.previousCredits}
        defaultGradingSystem={gradingSystemKey}
      />
    </DashboardShell>
  );
}
