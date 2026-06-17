import { StudyHub } from "@/components/learning/StudyHub";
import { DashboardShell } from "@/components/layout/DashboardShell";
import { PageHeader } from "@/components/layout/PageHeader";
import { getFlashcards } from "@/lib/actions/flashcards";
import { getStudyCourses, getStudyStreak, getCourseTimeSecs, getDeadlines } from "@/lib/actions/study";
import { requireSession } from "@/lib/session";

export default async function LearningPage() {
  const session = await requireSession();

  let courses: Awaited<ReturnType<typeof getStudyCourses>> = [];
  let flashcards: Awaited<ReturnType<typeof getFlashcards>> = [];
  let streak: Awaited<ReturnType<typeof getStudyStreak>> = { current: 0, longest: 0, totalSessions: 0, totalMinutes: 0 };
  let courseTimeSecs: Record<string, number> = {};
  let deadlines: Awaited<ReturnType<typeof getDeadlines>> = [];
  let dbError: string | null = null;

  try {
    [courses, flashcards, streak, courseTimeSecs, deadlines] = await Promise.all([
      getStudyCourses(session.user.id),
      getFlashcards(session.user.id),
      getStudyStreak(session.user.id),
      getCourseTimeSecs(session.user.id),
      getDeadlines(session.user.id),
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
        <StudyHub courses={courses} flashcards={flashcards} streak={streak} courseTimeSecs={courseTimeSecs} deadlines={deadlines} />
      )}
    </DashboardShell>
  );
}
