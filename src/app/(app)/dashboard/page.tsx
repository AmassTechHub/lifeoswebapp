import { LifeEnginePanel } from "@/components/engine/LifeEnginePanel";
import { AIUsageCard } from "@/components/dashboard/AIUsageCard";
import { DailyCheckIn } from "@/components/dashboard/DailyCheckIn";
import { XPBadge } from "@/components/dashboard/XPBadge";
import { WeeklyAIPlanner } from "@/components/dashboard/WeeklyAIPlanner";
import { DailyScore } from "@/components/dashboard/DailyScore";
import { DeadlineBanner } from "@/components/dashboard/DeadlineBanner";
import { FinanceSnapshot } from "@/components/dashboard/FinanceSnapshot";
import { ProgressOverview } from "@/components/dashboard/ProgressOverview";
import { SmartActions } from "@/components/dashboard/SmartSystem";
import { StudySnapshot } from "@/components/dashboard/StudySnapshot";
import { TodaysFocus } from "@/components/dashboard/TodaysFocus";
import { TodaysSchedule } from "@/components/dashboard/TodaysSchedule";
import { UpcomingDeadlines } from "@/components/dashboard/UpcomingDeadlines";
import { DashboardShell } from "@/components/layout/DashboardShell";
import { StaggeredGrid, StaggerItem } from "@/components/layout/StaggeredGrid";
import { buildAutomationPulse } from "@/lib/automation/rules-engine";
import { getDashboardData } from "@/lib/data/dashboard";
import { getUserContextSummary } from "@/lib/ai/user-context";
import { runLifeEngineIfNeeded } from "@/lib/engine/life-engine";
import { requireSession } from "@/lib/session";
import { getFirstName, getGreeting, getInitials } from "@/lib/user";

export default async function DashboardPage() {
  const session = await requireSession();
  const firstName = getFirstName(session.user.name);
  const engineRun = await runLifeEngineIfNeeded(session.user.id);
  const data = await getDashboardData(session.user.id);
  const context = await getUserContextSummary(session.user.id);
  const pulse = buildAutomationPulse(context);

  const today = new Date().toLocaleDateString("en-US", {
    weekday: "long",
    month: "long",
    day: "numeric",
  });

  return (
    <DashboardShell>
      {/* Header */}
      <header className="mb-6 flex items-center justify-between gap-4">
        <div className="flex items-center gap-3.5">
          <div className="hidden h-11 w-11 shrink-0 items-center justify-center rounded-full bg-linear-to-br from-accent to-accent/60 text-sm font-bold text-white shadow-sm sm:flex">
            {getInitials(session.user.name)}
          </div>
          <div>
            <p className="text-[11px] font-medium uppercase tracking-widest text-muted-foreground/50">
              {today}
            </p>
            <h1 className="mt-0.5 text-2xl font-bold tracking-tight sm:text-3xl">
              {getGreeting()}, {firstName}
            </h1>
          </div>
        </div>
        <XPBadge className="hidden sm:flex" />
      </header>

      <div className="space-y-6">
        <DailyCheckIn />

        {/* Deadline alert */}
        <DeadlineBanner
          overdueCount={context.tasks.overdueCount}
          dueTodayCount={context.tasks.dueToday.length}
        />

        {/* Engine status bar */}
        <LifeEnginePanel
          compact
          initialMessage={engineRun?.message ?? "Life OS is ready."}
          autoRan={Boolean(engineRun)}
          pulseStatus={(engineRun?.pulseStatus ?? pulse.status) as "ok" | "warning" | "critical"}
        />

        {/* Section: Today's priorities */}
        <section>
          <p className="mb-2.5 text-xs font-semibold uppercase tracking-wider text-muted-foreground/60">
            Today&apos;s Priorities
          </p>
          <StaggeredGrid className="grid grid-cols-1 gap-4 lg:grid-cols-3">
            <StaggerItem className="lg:col-span-2">
              <TodaysFocus items={data.focusItems} />
            </StaggerItem>
            <StaggerItem>
              <DailyScore
                average={data.dailyScore.average}
                scores={data.dailyScore.scores}
                hasSnapshot={data.dailyScore.hasSnapshot}
              />
            </StaggerItem>
          </StaggeredGrid>
        </section>

        {/* Section: Quick overview */}
        <section>
          <p className="mb-2.5 text-xs font-semibold uppercase tracking-wider text-muted-foreground/60">
            Quick Overview
          </p>
          <StaggeredGrid className="grid grid-cols-1 gap-4 sm:grid-cols-3">
            <StaggerItem>
              <StudySnapshot courses={data.studyCourses} recentNotes={data.recentNotes} />
            </StaggerItem>
            <StaggerItem>
              <FinanceSnapshot
                expenses={data.finance.expenses}
                income={data.finance.income}
                net={data.finance.net}
              />
            </StaggerItem>
            <StaggerItem>
              <UpcomingDeadlines deadlines={data.deadlines} />
            </StaggerItem>
          </StaggeredGrid>
        </section>

        {/* Section: Your day */}
        <section>
          <p className="mb-2.5 text-xs font-semibold uppercase tracking-wider text-muted-foreground/60">
            Your Day
          </p>
          <StaggeredGrid className="grid grid-cols-1 gap-4 lg:grid-cols-3">
            <StaggerItem className="lg:col-span-2">
              <TodaysSchedule schedule={data.schedule} />
            </StaggerItem>
            <div className="space-y-4">
              <StaggerItem>
                <AIUsageCard />
              </StaggerItem>
              <StaggerItem>
                <SmartActions />
              </StaggerItem>
            </div>
          </StaggeredGrid>
        </section>

        {/* Section: This week */}
        <section>
          <p className="mb-2.5 text-xs font-semibold uppercase tracking-wider text-muted-foreground/60">
            This Week
          </p>
          <div className="space-y-4">
            <ProgressOverview progress={data.progress} />
            <WeeklyAIPlanner />
          </div>
        </section>
      </div>
    </DashboardShell>
  );
}
