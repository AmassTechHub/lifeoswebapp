import { StudyHub } from "@/components/learning/StudyHub";
import { MidsemPrepBanner } from "@/components/learning/MidsemPrepBanner";
import { LearningModeSwitcher } from "@/components/learning/LearningModeSwitcher";
import { TopicTracker } from "@/components/learning/TopicTracker";
import { DashboardShell } from "@/components/layout/DashboardShell";
import { PageHeader } from "@/components/layout/PageHeader";
import { getFlashcards } from "@/lib/actions/flashcards";
import { getStudyCourses, getStudyStreak, getCourseTimeSecs, getDeadlines } from "@/lib/actions/study";
import { getTopics } from "@/lib/actions/topics";
import { getUpcomingExams } from "@/lib/study/exam-plan";
import { getFlashcardsDueCount } from "@/lib/study/today";
import { getUserPrefs } from "@/lib/user-prefs";
import { requireSession } from "@/lib/session";

export default async function LearningPage() {
  const session = await requireSession();

  let courses: Awaited<ReturnType<typeof getStudyCourses>> = [];
  let flashcards: Awaited<ReturnType<typeof getFlashcards>> = [];
  let streak: Awaited<ReturnType<typeof getStudyStreak>> = { current: 0, longest: 0, totalSessions: 0, totalMinutes: 0 };
  let courseTimeSecs: Record<string, number> = {};
  let deadlines: Awaited<ReturnType<typeof getDeadlines>> = [];
  let upcomingExams: Awaited<ReturnType<typeof getUpcomingExams>> = [];
  let flashcardsDue = 0;
  let topics: Awaited<ReturnType<typeof getTopics>> = [];
  let dbError: string | null = null;

  try {
    [courses, flashcards, streak, courseTimeSecs, deadlines, upcomingExams, flashcardsDue, topics] =
      await Promise.all([
        getStudyCourses(session.user.id),
        getFlashcards(session.user.id),
        getStudyStreak(session.user.id),
        getCourseTimeSecs(session.user.id),
        getDeadlines(session.user.id),
        getUpcomingExams(session.user.id, 14),
        getFlashcardsDueCount(session.user.id),
        getTopics(session.user.id),
      ]);
  } catch (err) {
    console.error("Learning page DB error:", err);
    dbError =
      err instanceof Error && err.message.includes("connect")
        ? "Could not connect to the database. Check your DATABASE_URL environment variable on Vercel."
        : "Failed to load learning data. Please refresh the page.";
  }

  const midsemExams = upcomingExams.map((e) => ({
    id: e.id,
    title: e.title,
    type: e.type,
    dueDate: e.dueDate,
    courseName: e.course?.name ?? null,
    courseColor: e.course?.color ?? null,
    courseId: e.courseId ?? null,
  }));

  return (
    <DashboardShell>
      <PageHeader title="Learning" />
      {dbError ? (
        <div className="rounded-xl border border-danger/20 bg-danger/5 p-6 text-sm text-danger">
          <p className="font-semibold">Something went wrong</p>
          <p className="mt-1 text-danger/70">{dbError}</p>
        </div>
      ) : (
        <div className="space-y-5">
          {/* Midsem prep banner — shows when exams are within 14 days */}
          {midsemExams.length > 0 && (
            <MidsemPrepBanner
              exams={midsemExams}
              flashcardsDue={flashcardsDue}
              studyStreak={streak.current}
            />
          )}

          {/* Mode switcher + content — client component handles the tab state */}
          <LearningModeSwitcher
            hasCourses={courses.length > 0}
            hasTopics={topics.length > 0}
            studyHub={
              <StudyHub
                courses={courses}
                flashcards={flashcards}
                streak={streak}
                courseTimeSecs={courseTimeSecs}
                deadlines={deadlines}
              />
            }
            topicTracker={<TopicTracker topics={topics} />}
          />
        </div>
      )}
    </DashboardShell>
  );
}
