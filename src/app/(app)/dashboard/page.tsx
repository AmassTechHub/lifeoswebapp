import Link from "next/link";
import {
  Briefcase,
  Calendar,
  Clapperboard,
  DollarSign,
  Flame,
  GraduationCap,
  ListChecks,
  Target,
  TrendingUp,
} from "lucide-react";

import { ExamModePanel }         from "@/components/dashboard/ExamModePanel";
import { GettingStarted, getGettingStartedSteps } from "@/components/dashboard/GettingStarted";
import { TodayAgenda }           from "@/components/dashboard/TodayAgenda";
import { TodaysSchedule }        from "@/components/dashboard/TodaysSchedule";
import { XPBadge }               from "@/components/dashboard/XPBadge";
import { AutoPlanButton }        from "@/components/dashboard/AutoPlanButton";
import { DashboardShell }        from "@/components/layout/DashboardShell";
import { DashboardRightPanel }   from "@/components/dashboard/DashboardRightPanel";
import { getTodaySchedule }      from "@/lib/automation/generate-day";
import { getTodayAgenda }        from "@/lib/data/today-agenda";
import { getUpcomingExams }      from "@/lib/study/exam-plan";
import { runLifeEngineIfNeeded } from "@/lib/engine/life-engine";
import { prisma }                from "@/lib/prisma";
import { requireSession }        from "@/lib/session";
import { getFirstName, getGreeting } from "@/lib/user";
import { getUserPrefs }          from "@/lib/user-prefs";

// ── Role-aware quick links ─────────────────────────────────────────────────
type QuickLink = { href: string; label: string; icon: typeof ListChecks; color: string; roles?: string[] };

const ALL_QUICK_LINKS: QuickLink[] = [
  { href: "/tasks",     label: "Tasks",     icon: ListChecks,    color: "text-accent" },
  { href: "/calendar",  label: "Calendar",  icon: Calendar,      color: "text-purple-400" },
  { href: "/goals",     label: "Goals",     icon: Target,        color: "text-pink-400" },
  { href: "/habits",    label: "Habits",    icon: Flame,         color: "text-orange-400" },
  { href: "/finance",   label: "Finance",   icon: DollarSign,    color: "text-green-400" },
  { href: "/learning",  label: "Study",     icon: GraduationCap, color: "text-emerald-400", roles: ["student"] },
  { href: "/grades",    label: "Grades",    icon: TrendingUp,    color: "text-sky-400",     roles: ["student"] },
  { href: "/deadlines", label: "Deadlines", icon: Target,        color: "text-amber-400",   roles: ["student"] },
  { href: "/content",   label: "Content",   icon: Clapperboard,  color: "text-violet-400",  roles: ["creator"] },
  { href: "/clients",   label: "Clients",   icon: Briefcase,     color: "text-amber-400",   roles: ["professional", "creator"] },
];

function getQuickLinks(useCases: string[]): QuickLink[] {
  const noRole = useCases.length === 0;
  return ALL_QUICK_LINKS.filter((l) => {
    if (!l.roles || l.roles.length === 0) return true;
    if (noRole) return true;
    return l.roles.some((r) => useCases.includes(r));
  }).slice(0, 8);
}

export default async function DashboardPage() {
  const session = await requireSession();
  const firstName = getFirstName(session.user.name);

  await runLifeEngineIfNeeded(session.user.id);

  const [agenda, scheduleRaw, upcomingExams, prefs, manualEventCount, userCounts, topicCount] = await Promise.all([
    getTodayAgenda(session.user.id),
    getTodaySchedule(session.user.id),
    getUpcomingExams(session.user.id, 14),
    getUserPrefs(session.user.id),
    // Only count MANUAL events — system events are created on first load
    // and would falsely mark "Add a calendar event" as done
    prisma.calendarEvent.count({
      where: { userId: session.user.id, source: "MANUAL" },
    }),
    prisma.user.findUnique({
      where: { id: session.user.id },
      select: {
        _count: { select: { tasks: true, habits: true, goals: true, studyCourses: true, expenses: true } },
      },
    }),
    // Count LearningTopics so "Set up courses or topics" works for self-learners too
    prisma.learningTopic.count({ where: { userId: session.user.id } }),
  ]);

  const schedule = scheduleRaw.map((e) => ({
    id:       e.id,
    title:    e.title,
    startAt:  e.startAt,
    category: e.category,
  }));

  const examPanelItems = upcomingExams.map((e) => ({
    id:         e.id,
    title:      e.title,
    type:       e.type,
    dueDate:    e.dueDate,
    courseName: e.course?.name ?? null,
  }));

  const today = new Date().toLocaleDateString("en-US", {
    weekday: "long",
    month:   "long",
    day:     "numeric",
  });

  const quickLinks = getQuickLinks(prefs.useCases);

  const contextHint = prefs.useCases.includes("student")
    ? " 📚"
    : prefs.useCases.includes("professional")
    ? " 💼"
    : prefs.useCases.includes("creator")
    ? " 🎬"
    : " 👋";

  // Build getting-started steps
  const c = userCounts?._count;
  const gettingStartedSteps = await getGettingStartedSteps({
    hasTask:    (c?.tasks ?? 0) > 0,
    hasHabit:   (c?.habits ?? 0) > 0,
    hasGoal:    (c?.goals ?? 0) > 0,
    hasCourse:  (c?.studyCourses ?? 0) > 0 || topicCount > 0,
    hasExpense: (c?.expenses ?? 0) > 0,
    hasEvent:   manualEventCount > 0,
  });
  const totalDone = gettingStartedSteps.filter((s) => s.done).length;
  const showGettingStarted = totalDone < gettingStartedSteps.length;

  // Show auto-plan prompt if no SYSTEM schedule events today
  const hasAutoSchedule = schedule.some((e) => e.title.startsWith("Study:") || e.title.startsWith("Task:"));

  return (
    <DashboardShell>
      {/* ── Header ──────────────────────────────────────────────── */}
      <header className="mb-5 flex items-start justify-between gap-4">
        <div>
          <p className="text-[10px] font-semibold uppercase tracking-[0.12em] text-muted-foreground/40">
            {today}
          </p>
          <h1 className="mt-0.5 text-[22px] font-bold tracking-tight text-foreground sm:text-2xl">
            {getGreeting()}, {firstName}{contextHint}
          </h1>
          {prefs.useCases.length > 0 && (
            <p className="mt-0.5 text-xs text-muted-foreground/50 capitalize">
              {prefs.useCases.join(" · ")}
            </p>
          )}
        </div>
        <div className="flex items-center gap-2 shrink-0">
          {/* Auto-plan CTA — shown when day has no auto blocks yet */}
          {!hasAutoSchedule && <AutoPlanButton />}
          <XPBadge className="hidden sm:flex" />
        </div>
      </header>

      {/* ── Getting started (new users only) ────────────────────── */}
      {showGettingStarted && (
        <div className="mb-5">
          <GettingStarted steps={gettingStartedSteps} />
        </div>
      )}

      {/* ── Quick-access shortcuts (role-aware) ─────────────────── */}
      <div className={`mb-5 grid gap-2 grid-cols-4 ${quickLinks.length > 4 ? "sm:grid-cols-8" : "sm:grid-cols-4"}`}>
        {quickLinks.map(({ href, label, icon: Icon, color }) => (
          <Link
            key={href}
            href={href}
            className="group flex flex-col items-center gap-1.5 rounded-xl border border-border/50 bg-card/60 px-2 py-3 text-center transition-all hover:border-accent/20 hover:bg-accent/5 hover:shadow-sm"
          >
            <span className={`flex h-8 w-8 items-center justify-center rounded-lg bg-muted/50 transition-colors group-hover:bg-accent/10 ${color}`}>
              <Icon className="h-4 w-4" />
            </span>
            <span className="text-[11px] font-medium text-muted-foreground group-hover:text-foreground">
              {label}
            </span>
          </Link>
        ))}
      </div>

      {/* ── Main 2-column grid ──────────────────────────────────── */}
      <div className="grid gap-4 lg:grid-cols-[1fr_300px] xl:grid-cols-[1fr_320px]">
        <div className="space-y-4 min-w-0">
          <TodayAgenda overdue={agenda.overdue} today={agenda.today} />
          {examPanelItems.length > 0 && <ExamModePanel exams={examPanelItems} />}
          <TodaysSchedule schedule={schedule} />
        </div>
        <div className="hidden lg:block">
          <DashboardRightPanel userId={session.user.id} />
        </div>
      </div>

      <div className="mt-4 lg:hidden">
        <DashboardRightPanel userId={session.user.id} />
      </div>
    </DashboardShell>
  );
}
