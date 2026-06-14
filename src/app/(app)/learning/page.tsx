import { StudyHub } from "@/components/learning/StudyHub";
import { DashboardShell } from "@/components/layout/DashboardShell";
import { PageHeader } from "@/components/layout/PageHeader";
import { getFlashcards } from "@/lib/actions/flashcards";
import { getStudyCourses } from "@/lib/actions/study";
import { requireSession } from "@/lib/session";

export default async function LearningPage() {
  const session = await requireSession();

  let courses: Awaited<ReturnType<typeof getStudyCourses>> = [];
  let flashcards: Awaited<ReturnType<typeof getFlashcards>> = [];
  let dbError: string | null = null;

  try {
    [courses, flashcards] = await Promise.all([
      getStudyCourses(session.user.id),
      getFlashcards(session.user.id),
    ]);
  } catch (err) {
    console.error("Learning page DB error:", err);
    dbError =
      err instanceof Error && err.message.includes("connect")
        ? "Could not connect to the database. Check your DATABASE_URL environment variable on Vercel."
        : "Failed to load learning data. Please refresh the page.";
  }

  return (
    <DashboardShell>
      <PageHeader
        title="Learning"
        description="Notes, summaries, slides, and flashcards. Your full study stack in one place."
      />
      {dbError ? (
        <div className="rounded-xl border border-danger/20 bg-danger/5 p-6 text-sm text-danger">
          <p className="font-semibold">Something went wrong</p>
          <p className="mt-1 text-danger/70">{dbError}</p>
        </div>
      ) : (
        <StudyHub courses={courses} flashcards={flashcards} />
      )}
    </DashboardShell>
  );
}
