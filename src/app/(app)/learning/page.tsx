import { StudyHub } from "@/components/learning/StudyHub";
import { DashboardShell } from "@/components/layout/DashboardShell";
import { PageHeader } from "@/components/layout/PageHeader";
import { getFlashcards } from "@/lib/actions/flashcards";
import { getStudyCourses } from "@/lib/actions/study";
import { requireSession } from "@/lib/session";

export default async function LearningPage() {
  const session = await requireSession();
  const [courses, flashcards] = await Promise.all([
    getStudyCourses(session.user.id),
    getFlashcards(session.user.id),
  ]);

  return (
    <DashboardShell>
      <PageHeader
        title="Learning"
        description="Notes, summaries, slides, and flashcards. Your full study stack in one place."
      />
      <StudyHub courses={courses} flashcards={flashcards} />
    </DashboardShell>
  );
}
