import { DeadlineTracker } from "@/components/deadlines/DeadlineTracker";
import { DashboardShell } from "@/components/layout/DashboardShell";
import { PageHeader } from "@/components/layout/PageHeader";
import { getDeadlines } from "@/lib/actions/deadlines";
import { getStudyCourses } from "@/lib/actions/study";
import { requireSession } from "@/lib/session";

export default async function DeadlinesPage() {
  const session = await requireSession();
  const [deadlines, courses] = await Promise.all([
    getDeadlines(),
    getStudyCourses(session.user.id),
  ]);

  const courseList = courses.map((c) => ({
    id: c.id,
    name: c.name,
    code: c.code,
    color: c.color,
  }));

  return (
    <DashboardShell>
      <PageHeader
        title="Deadlines"
        description="Stay on top of every assignment, exam, and project deadline."
      />
      <DeadlineTracker deadlines={deadlines} courses={courseList} />
    </DashboardShell>
  );
}
