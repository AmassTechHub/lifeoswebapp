import { AIInsightsBanner } from "@/components/dashboard/AIInsightsBanner";
import { DailyScore } from "@/components/dashboard/DailyScore";
import { ProgressOverview } from "@/components/dashboard/ProgressOverview";
import { SmartActions, TimetableUpload } from "@/components/dashboard/SmartSystem";
import { TodaysFocus } from "@/components/dashboard/TodaysFocus";
import { TodaysSchedule } from "@/components/dashboard/TodaysSchedule";
import { UpcomingDeadlines } from "@/components/dashboard/UpcomingDeadlines";
import { DashboardShell } from "@/components/layout/DashboardShell";
import { requireSession } from "@/lib/session";
import { getFirstName, getGreeting } from "@/lib/user";

export default async function DashboardPage() {
  const session = await requireSession();
  const firstName = getFirstName(session.user.name);

  const today = new Date().toLocaleDateString("en-US", {
    weekday: "long",
    month: "long",
    day: "numeric",
    year: "numeric",
  });

  return (
    <DashboardShell>
      <header className="mb-8">
        <p className="text-sm text-muted-foreground">{today}</p>
        <h1 className="mt-1 text-3xl font-bold tracking-tight">
          {getGreeting()}, {firstName}
        </h1>
        <p className="mt-2 max-w-2xl text-sm leading-relaxed text-muted-foreground">
          Your smart command center. AI handles the planning so you can execute.
        </p>
      </header>

      <AIInsightsBanner />

      <section className="mb-8">
        <p className="mb-4 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
          Quick actions
        </p>
        <SmartActions />
      </section>

      <div className="grid gap-6 lg:grid-cols-3">
        <div className="space-y-6 lg:col-span-2">
          <TodaysFocus />
          <div className="grid gap-6 md:grid-cols-2">
            <UpcomingDeadlines />
            <TodaysSchedule />
          </div>
        </div>
        <div className="space-y-6">
          <TimetableUpload />
          <DailyScore />
        </div>
      </div>

      <div className="mt-8">
        <ProgressOverview />
      </div>
    </DashboardShell>
  );
}
