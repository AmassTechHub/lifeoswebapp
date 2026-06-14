import { LifeEnginePanel } from "@/components/engine/LifeEnginePanel";
import { DailyScore } from "@/components/dashboard/DailyScore";
import { FinanceSnapshot } from "@/components/dashboard/FinanceSnapshot";
import { ProgressOverview } from "@/components/dashboard/ProgressOverview";
import { SmartActions, TimetableUpload } from "@/components/dashboard/SmartSystem";
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
import { getFirstName, getGreeting } from "@/lib/user";

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
      <header className="mb-5 flex items-center justify-between">
        <div>
          <p className="text-[11px] font-medium uppercase tracking-widest text-muted-foreground/50">
            {today}
          </p>
          <h1 className="mt-0.5 text-2xl font-bold tracking-tight">
            {getGreeting()}, {firstName}
          </h1>
        </div>
      </header>

      {/* Engine status bar */}
      <LifeEnginePanel
        compact
        initialMessage={engineRun?.message ?? "Life OS is ready."}
        autoRan={Boolean(engineRun)}
        pulseStatus={(engineRun?.pulseStatus ?? pulse.status) as "ok" | "warning" | "critical"}
      />

      {/* Primary: focus + daily score */}
      <StaggeredGrid className="mb-5 grid gap-5 lg:grid-cols-3">
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

      {/* Secondary: study + finance + deadlines */}
      <StaggeredGrid className="mb-5 grid gap-5 sm:grid-cols-3">
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

      {/* Tertiary: schedule + tools */}
      <StaggeredGrid className="mb-5 grid gap-5 lg:grid-cols-3">
        <StaggerItem className="lg:col-span-2">
          <TodaysSchedule schedule={data.schedule} />
        </StaggerItem>
        <div className="space-y-5">
          <StaggerItem>
            <TimetableUpload />
          </StaggerItem>
          <StaggerItem>
            <SmartActions />
          </StaggerItem>
        </div>
      </StaggeredGrid>

      <ProgressOverview progress={data.progress} />
    </DashboardShell>
  );
}
