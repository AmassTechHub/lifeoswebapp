import {
  CheckCircle2,
  GraduationCap,
  Layers,
  Repeat,
  Target,
  Wallet,
} from "lucide-react";

import { LifeEnginePanel } from "@/components/engine/LifeEnginePanel";
import { AIUsageCard } from "@/components/dashboard/AIUsageCard";
import { DailyCheckIn } from "@/components/dashboard/DailyCheckIn";
import { ExamModePanel } from "@/components/dashboard/ExamModePanel";
import { XPBadge } from "@/components/dashboard/XPBadge";
import { WeeklyAIPlanner } from "@/components/dashboard/WeeklyAIPlanner";
import { DailyScore } from "@/components/dashboard/DailyScore";
import { DeadlineBanner } from "@/components/dashboard/DeadlineBanner";
import { FinanceSnapshot } from "@/components/dashboard/FinanceSnapshot";
import { ProgressOverview } from "@/components/dashboard/ProgressOverview";
import { SmartActions } from "@/components/dashboard/SmartSystem";
import { StudySnapshot } from "@/components/dashboard/StudySnapshot";
import { TodaysClasses } from "@/components/dashboard/TodaysClasses";
import { TodaysFocus } from "@/components/dashboard/TodaysFocus";
import { TodaysSchedule } from "@/components/dashboard/TodaysSchedule";
import { UpcomingDeadlines } from "@/components/dashboard/UpcomingDeadlines";
import { DashboardShell } from "@/components/layout/DashboardShell";
import { buildAutomationPulse } from "@/lib/automation/rules-engine";
import { getDashboardData } from "@/lib/data/dashboard";
import { getUpcomingExams } from "@/lib/study/exam-plan";
import { getUserContextSummary } from "@/lib/ai/user-context";
import { runLifeEngineIfNeeded } from "@/lib/engine/life-engine";
import { requireSession } from "@/lib/session";
import { cn } from "@/lib/utils";
import { getFirstName, getGreeting, getInitials } from "@/lib/user";

function KpiTile({
  icon: Icon,
  label,
  value,
  tone = "default",
}: {
  icon: React.ComponentType<{ className?: string }>;
  label: string;
  value: string;
  tone?: "default" | "accent" | "success" | "danger";
}) {
  const toneClass =
    tone === "accent"
      ? "text-accent"
      : tone === "success"
        ? "text-success"
        : tone === "danger"
          ? "text-danger"
          : "text-foreground";
  return (
    <div className="flex items-center gap-3 rounded-xl border border-border/70 bg-card/80 px-3.5 py-3 shadow-sm">
      <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-accent/10">
        <Icon className="h-4 w-4 text-accent" />
      </div>
      <div className="min-w-0">
        <p className="truncate text-[10px] font-semibold uppercase tracking-wider text-muted-foreground/60">
          {label}
        </p>
        <p className={cn("text-lg font-bold leading-tight tracking-tight", toneClass)}>
          {value}
        </p>
      </div>
    </div>
  );
}

export default async function DashboardPage() {
  const session = await requireSession();
  const firstName = getFirstName(session.user.name);
  const engineRun = await runLifeEngineIfNeeded(session.user.id);
  const data = await getDashboardData(session.user.id);
  const context = await getUserContextSummary(session.user.id);
  const pulse = buildAutomationPulse(context);
  const upcomingExams = await getUpcomingExams(session.user.id);
  const examItems = upcomingExams.map((e) => ({
    id: e.id,
    title: e.title,
    type: e.type,
    dueDate: e.dueDate,
    courseName: e.course?.name ?? null,
  }));

  const today = new Date().toLocaleDateString("en-US", {
    weekday: "long",
    month: "long",
    day: "numeric",
  });

  const net = Math.round(data.finance.net);
  const netLabel = `${net < 0 ? "-" : ""}GHS ${Math.abs(net).toLocaleString()}`;

  return (
    <DashboardShell>
      {/* Slim header */}
      <header className="mb-4 flex items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="hidden h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-linear-to-br from-accent to-accent-2 text-xs font-bold text-white shadow-sm sm:flex">
            {getInitials(session.user.name)}
          </div>
          <div>
            <p className="text-[10px] font-medium uppercase tracking-widest text-muted-foreground/50">
              {today}
            </p>
            <h1 className="text-xl font-bold tracking-tight sm:text-2xl">
              {getGreeting()}, {firstName}
            </h1>
          </div>
        </div>
        <XPBadge className="hidden sm:flex" />
      </header>

      <div className="space-y-4">
        <DailyCheckIn />

        {/* Deadline alert */}
        <DeadlineBanner
          overdueCount={context.tasks.overdueCount}
          dueTodayCount={context.tasks.dueToday.length}
        />

        {/* Compact KPI strip */}
        <div className="grid grid-cols-2 gap-2.5 sm:grid-cols-3 lg:grid-cols-6">
          <KpiTile icon={Target} label="Daily score" value={`${data.dailyScore.average}`} tone="accent" />
          <KpiTile icon={GraduationCap} label="Classes today" value={`${data.coursesToday.length}`} />
          <KpiTile icon={Layers} label="Cards due" value={`${data.flashcardsDue}`} />
          <KpiTile icon={CheckCircle2} label="Tasks due" value={`${context.tasks.dueToday.length}`} />
          <KpiTile icon={Repeat} label="Habits" value={`${data.progress.habits.value}/${data.progress.habits.total}`} />
          <KpiTile icon={Wallet} label="Net (mo)" value={netLabel} tone={net < 0 ? "danger" : "success"} />
        </div>

        {/* Exam mode — only when exams are coming up */}
        {examItems.length > 0 && <ExamModePanel exams={examItems} />}

        {/* Engine status bar */}
        <LifeEnginePanel
          compact
          initialMessage={engineRun?.message ?? "Life OS is ready."}
          autoRan={Boolean(engineRun)}
          pulseStatus={(engineRun?.pulseStatus ?? pulse.status) as "ok" | "warning" | "critical"}
        />

        {/* Dense row 1: focus + schedule + right rail */}
        <div className="grid grid-cols-1 items-start gap-3 lg:grid-cols-12">
          <div className="lg:col-span-5">
            <TodaysFocus items={data.focusItems} />
          </div>
          <div className="lg:col-span-4">
            <TodaysSchedule schedule={data.schedule} />
          </div>
          <div className="space-y-3 lg:col-span-3">
            <TodaysClasses courses={data.coursesToday} flashcardsDue={data.flashcardsDue} />
            <UpcomingDeadlines deadlines={data.deadlines} />
          </div>
        </div>

        {/* Dense row 2: study + finance + score */}
        <div className="grid grid-cols-1 items-start gap-3 lg:grid-cols-3">
          <StudySnapshot courses={data.studyCourses} recentNotes={data.recentNotes} />
          <FinanceSnapshot
            expenses={data.finance.expenses}
            income={data.finance.income}
            net={data.finance.net}
          />
          <DailyScore
            average={data.dailyScore.average}
            scores={data.dailyScore.scores}
            hasSnapshot={data.dailyScore.hasSnapshot}
          />
        </div>

        {/* Dense row 3: progress + actions + AI usage */}
        <div className="grid grid-cols-1 items-start gap-3 lg:grid-cols-3">
          <div className="lg:col-span-2">
            <ProgressOverview progress={data.progress} />
          </div>
          <div className="space-y-3">
            <SmartActions />
            <AIUsageCard />
          </div>
        </div>

        <WeeklyAIPlanner />
      </div>
    </DashboardShell>
  );
}
