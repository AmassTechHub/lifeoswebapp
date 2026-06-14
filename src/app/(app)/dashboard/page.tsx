import { AIInsightsBanner } from "@/components/dashboard/AIInsightsBanner";
import { AutomationPulse } from "@/components/dashboard/AutomationPulse";
import { TodayOSPanel } from "@/components/dashboard/TodayOSPanel";
import { LifeEnginePanel } from "@/components/engine/LifeEnginePanel";
import { KnowledgeGraphPanel } from "@/components/knowledge/KnowledgeGraphPanel";
import { buildActionQueue } from "@/lib/ai/action-queue";
import { getUserContextSummary } from "@/lib/ai/user-context";
import { buildAutomationPulse } from "@/lib/automation/rules-engine";
import { getLatestCycles, runLifeEngineIfNeeded } from "@/lib/engine/life-engine";
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
import { getDashboardData } from "@/lib/data/dashboard";
import { requireSession } from "@/lib/session";
import { getFirstName, getGreeting } from "@/lib/user";

export default async function DashboardPage() {
  const session = await requireSession();
  const firstName = getFirstName(session.user.name);
  const engineRun = await runLifeEngineIfNeeded(session.user.id);
  const data = await getDashboardData(session.user.id);
  const context = await getUserContextSummary(session.user.id);
  const pulse = buildAutomationPulse(context);
  const actionQueue = buildActionQueue(context);
  const cycleLogs = await getLatestCycles(session.user.id);
  const cycles = {
    morning: cycleLogs.find((l) => l.type === "MORNING")?.summary,
    evening: cycleLogs.find((l) => l.type === "EVENING")?.summary,
    weekly: cycleLogs.find((l) => l.type === "WEEKLY")?.summary,
  };
  const contextSummary = [
    `User: ${firstName}`,
    `Focus items: ${data.focusItems.map((item) => item.title).join(" | ") || "none"}`,
    `Upcoming deadlines: ${data.deadlines.map((item) => item.title).join(" | ") || "none"}`,
    `Schedule blocks today: ${data.schedule.length}`,
    `Daily score: ${data.dailyScore.average}`,
    `Finance net this month: ${Math.round(data.finance.net)}`,
  ].join("\n");

  const today = new Date().toLocaleDateString("en-US", {
    weekday: "long",
    month: "long",
    day: "numeric",
    year: "numeric",
  });

  return (
    <DashboardShell>
      {/* Hero header */}
      <header className="mb-8">
        <p className="text-sm font-medium text-muted-foreground">{today}</p>
        <h1 className="mt-1 text-2xl font-bold tracking-tight sm:text-3xl">
          {getGreeting()}, {firstName} 👋
        </h1>
        <p className="mt-2 max-w-2xl text-sm leading-relaxed text-muted-foreground">
          One automated system for your entire life: tasks, study, finance, and content in one place.
        </p>
      </header>

      <LifeEnginePanel
        initialMessage={engineRun?.message ?? "Life OS is running. Your day is being managed here."}
        autoRan={Boolean(engineRun)}
        pulseStatus={(engineRun?.pulseStatus ?? pulse.status) as "ok" | "warning" | "critical"}
      />

      <TodayOSPanel
        focusItems={data.focusItems}
        schedule={data.schedule.map((b) => ({
          id: b.id,
          title: b.title,
          startAt: b.startAt.toISOString(),
          endAt: b.endAt.toISOString(),
        }))}
        nextAction={actionQueue[0] ?? null}
        dailyScore={data.dailyScore.average}
        cycles={cycles}
      />

      <AIInsightsBanner contextSummary={contextSummary} />

      <section className="mb-8">
        <AutomationPulse data={data} />
      </section>

      <section className="mb-8">
        <p className="mb-4 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
          Quick actions
        </p>
        <SmartActions />
      </section>

      {/* Main dashboard grid with stagger animation */}
      <StaggeredGrid className="grid gap-6 lg:grid-cols-3">
        <div className="space-y-6 lg:col-span-2">
          <StaggerItem>
            <TodaysFocus items={data.focusItems} />
          </StaggerItem>
          <div className="grid gap-6 md:grid-cols-2">
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
          </div>
          <div className="grid gap-6 md:grid-cols-2">
            <StaggerItem>
              <UpcomingDeadlines deadlines={data.deadlines} />
            </StaggerItem>
            <StaggerItem>
              <TodaysSchedule schedule={data.schedule} />
            </StaggerItem>
          </div>
        </div>
        <div className="space-y-6">
          <StaggerItem>
            <KnowledgeGraphPanel />
          </StaggerItem>
          <StaggerItem>
            <TimetableUpload />
          </StaggerItem>
          <StaggerItem>
            <DailyScore
              average={data.dailyScore.average}
              scores={data.dailyScore.scores}
              hasSnapshot={data.dailyScore.hasSnapshot}
            />
          </StaggerItem>
        </div>
      </StaggeredGrid>

      <div className="mt-8">
        <ProgressOverview progress={data.progress} />
      </div>
    </DashboardShell>
  );
}
