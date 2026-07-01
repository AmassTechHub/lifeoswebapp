"use client";

import {
  BookOpen, Brain, CheckCircle2, Clock, DollarSign,
  Flame, Layers, MessageSquare, Target, TrendingUp, Zap,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { cn } from "@/lib/utils";

type DailyEntry = { date: string; secs: number };
type DailyTaskEntry = { date: string; done: number; total: number };
type AiDay = { date: string; count: number };
type CourseBreakdown = {
  id: string; name: string; code: string | null; color: string;
  flashcardCount: number; noteCount: number; materialCount: number;
  reviewed: number; correct: number; accuracy: number | null;
  durationSecs: number; sessions: number;
};
type HabitSummary = {
  id: string; name: string; color: string;
  last7: boolean[]; streak: number; completionRate30: number;
};
type GradeEntry = { id: string; name: string; code: string | null; grade: string; credits: number; semester: string; year: number };

type Props = {
  totalSessions: number; totalTimeSecs: number; totalReviewed: number;
  overallAccuracy: number | null; flashcardsTotal: number; flashcardsDue: number;
  daily: DailyEntry[]; courses: CourseBreakdown[];
  tasksCreated: number; tasksCompleted: number; taskCompletionRate: number | null;
  dailyTasks: DailyTaskEntry[];
  habits: HabitSummary[];
  totalExpenses30: number; totalIncome30: number; netSavings30: number;
  expensesByCategory: [string, number][];
  latestGrades: GradeEntry[];
  deadlinesDone: number; deadlinesTotal: number;
  aiDays: AiDay[]; totalAiMessages7: number;
};

function fmtTime(secs: number): string {
  if (secs < 60) return `${secs}s`;
  const m = Math.floor(secs / 60);
  if (m < 60) return `${m}m`;
  const h = Math.floor(m / 60);
  const rem = m % 60;
  return rem > 0 ? `${h}h ${rem}m` : `${h}h`;
}

function BarChart({ data, maxVal, colorClass }: { data: number[]; maxVal: number; colorClass: string }) {
  return (
    <div className="flex h-16 items-end gap-0.5">
      {data.map((v, i) => (
        <div
          key={i}
          className={cn("flex-1 rounded-t-sm transition-all", colorClass)}
          style={{ height: `${maxVal > 0 ? Math.max((v / maxVal) * 100, v > 0 ? 4 : 0) : 0}%` }}
        />
      ))}
    </div>
  );
}

function StatCard({ label, value, sub, icon: Icon, color }: {
  label: string; value: string; sub?: string; icon: React.ElementType; color: string;
}) {
  return (
    <div className="rounded-xl border border-border/60 bg-card/80 p-4">
      <Icon className={cn("h-4 w-4 mb-2", color)} />
      <p className="text-xl font-bold tabular-nums sm:text-2xl">{value}</p>
      <p className="text-xs font-medium text-muted-foreground">{label}</p>
      {sub && <p className="text-[10px] text-muted-foreground/50">{sub}</p>}
    </div>
  );
}

function SectionHeader({ icon: Icon, title, color }: { icon: React.ElementType; title: string; color: string }) {
  return (
    <div className="flex items-center gap-2">
      <Icon className={cn("h-4 w-4", color)} />
      <h2 className="text-sm font-semibold text-foreground">{title}</h2>
    </div>
  );
}

export function StudyAnalytics(props: Props) {
  const {
    totalSessions, totalTimeSecs, totalReviewed, overallAccuracy, flashcardsTotal, flashcardsDue,
    daily, courses,
    tasksCompleted, tasksCreated, taskCompletionRate, dailyTasks,
    habits,
    totalExpenses30, totalIncome30, netSavings30, expensesByCategory,
    latestGrades,
    deadlinesDone, deadlinesTotal,
    aiDays, totalAiMessages7,
  } = props;

  const studyDailyChart = daily.slice(-14).map(d => d.secs);
  const maxStudySecs = Math.max(...studyDailyChart, 1);
  const maxAi = Math.max(...aiDays.map(d => d.count), 1);
  const maxExpense = expensesByCategory[0]?.[1] ?? 1;

  return (
    <div className="space-y-8">

      {/* ── Study ─────────────────────────────────────────────────────────── */}
      <section className="space-y-4">
        <SectionHeader icon={BookOpen} title="Study — last 30 days" color="text-accent" />
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
          <StatCard label="Sessions" value={String(totalSessions)} icon={Target} color="text-accent" />
          <StatCard label="Study time" value={fmtTime(totalTimeSecs)} icon={Clock} color="text-blue-500" />
          <StatCard label="Cards reviewed" value={String(totalReviewed)} sub={`${flashcardsTotal} total · ${flashcardsDue} due`} icon={Layers} color="text-purple-500" />
          <StatCard label="Accuracy" value={overallAccuracy != null ? `${overallAccuracy}%` : "—"} icon={TrendingUp} color={overallAccuracy != null && overallAccuracy >= 70 ? "text-success" : "text-warning"} />
        </div>

        <Card className="border-border/70 bg-card/80">
          <CardHeader className="pb-2">
            <CardTitle className="text-xs font-semibold text-muted-foreground">Daily study time — last 14 days</CardTitle>
          </CardHeader>
          <CardContent>
            {studyDailyChart.every(v => v === 0) ? (
              <p className="py-3 text-center text-sm text-muted-foreground">No sessions yet. Start a study session in Learning.</p>
            ) : (
              <>
                <BarChart data={studyDailyChart} maxVal={maxStudySecs} colorClass="bg-accent/60 hover:bg-accent" />
                <div className="mt-1 flex justify-between text-[10px] text-muted-foreground">
                  <span>{daily[daily.length - 14]?.date}</span>
                  <span>{daily[daily.length - 1]?.date}</span>
                </div>
              </>
            )}
          </CardContent>
        </Card>

        {courses.length > 0 && (
          <Card className="border-border/70 bg-card/80">
            <CardHeader className="pb-2">
              <CardTitle className="text-xs font-semibold text-muted-foreground">Course breakdown</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              {courses.sort((a, b) => b.sessions - a.sessions).map(c => (
                <div key={c.id} className="space-y-1.5">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2 min-w-0">
                      <span className="h-2.5 w-2.5 shrink-0 rounded-full" style={{ backgroundColor: c.color }} />
                      <span className="truncate text-sm font-medium">{c.code ?? c.name}</span>
                      {c.code && <span className="truncate text-xs text-muted-foreground hidden sm:inline">{c.name}</span>}
                    </div>
                    <div className="flex shrink-0 items-center gap-3 text-xs text-muted-foreground">
                      {c.sessions > 0 && <span>{c.sessions} session{c.sessions !== 1 ? "s" : ""} · {fmtTime(c.durationSecs)}</span>}
                      <span>{c.flashcardCount} cards · {c.noteCount} notes · {c.materialCount} files</span>
                      {c.accuracy != null && (
                        <span className={cn("font-semibold", c.accuracy >= 80 ? "text-success" : c.accuracy >= 60 ? "text-accent" : "text-warning")}>
                          {c.accuracy}%
                        </span>
                      )}
                    </div>
                  </div>
                  {c.accuracy != null && (
                    <div className="h-1.5 w-full overflow-hidden rounded-full bg-muted/40">
                      <div
                        className={cn("h-full rounded-full", c.accuracy >= 80 ? "bg-success" : c.accuracy >= 60 ? "bg-accent" : "bg-warning")}
                        style={{ width: `${c.accuracy}%` }}
                      />
                    </div>
                  )}
                </div>
              ))}
            </CardContent>
          </Card>
        )}
      </section>

      {/* ── Tasks ─────────────────────────────────────────────────────────── */}
      <section className="space-y-4">
        <SectionHeader icon={CheckCircle2} title="Tasks — last 30 days" color="text-emerald-500" />
        <div className="grid grid-cols-3 gap-3">
          <StatCard label="Created" value={String(tasksCreated)} icon={Target} color="text-muted-foreground" />
          <StatCard label="Completed" value={String(tasksCompleted)} icon={CheckCircle2} color="text-success" />
          <StatCard label="Completion rate" value={taskCompletionRate != null ? `${taskCompletionRate}%` : "—"} icon={TrendingUp} color={taskCompletionRate != null && taskCompletionRate >= 70 ? "text-success" : "text-warning"} />
        </div>
        {deadlinesTotal > 0 && (
          <div className="rounded-xl border border-border/60 bg-card/80 px-4 py-3 flex items-center justify-between">
            <p className="text-sm text-muted-foreground">Deadlines met (30d)</p>
            <p className="text-sm font-bold">{deadlinesDone} / {deadlinesTotal}</p>
          </div>
        )}
      </section>

      {/* ── Habits ────────────────────────────────────────────────────────── */}
      {habits.length > 0 && (
        <section className="space-y-4">
          <SectionHeader icon={Flame} title="Habits — last 7 days" color="text-orange-400" />
          <Card className="border-border/70 bg-card/80">
            <CardContent className="pt-4 space-y-3">
              {habits.map(h => (
                <div key={h.id} className="flex items-center gap-3">
                  <div className="w-28 min-w-0 shrink-0">
                    <p className="truncate text-xs font-medium text-foreground">{h.name}</p>
                    <p className="text-[10px] text-muted-foreground">
                      {h.streak > 0 ? `🔥 ${h.streak}d streak` : "No streak"} · {h.completionRate30}% (30d)
                    </p>
                  </div>
                  <div className="flex flex-1 items-center gap-1 justify-end">
                    {h.last7.map((done, i) => (
                      <div
                        key={i}
                        className={cn("h-6 w-6 rounded-md transition-all", done ? "bg-success/80" : "bg-muted/30")}
                        style={done ? { backgroundColor: h.color + "cc" } : undefined}
                      />
                    ))}
                  </div>
                </div>
              ))}
              <p className="text-[10px] text-muted-foreground/40 text-right">Mon → Sun last 7 days</p>
            </CardContent>
          </Card>
        </section>
      )}

      {/* ── Finance ───────────────────────────────────────────────────────── */}
      {(totalExpenses30 > 0 || totalIncome30 > 0) && (
        <section className="space-y-4">
          <SectionHeader icon={DollarSign} title="Finance — last 30 days" color="text-green-500" />
          <div className="grid grid-cols-3 gap-3">
            <StatCard label="Income" value={totalIncome30.toLocaleString()} icon={TrendingUp} color="text-success" />
            <StatCard label="Expenses" value={totalExpenses30.toLocaleString()} icon={DollarSign} color="text-danger" />
            <StatCard label="Net saved" value={netSavings30.toLocaleString()} icon={Target} color={netSavings30 >= 0 ? "text-success" : "text-danger"} />
          </div>
          {expensesByCategory.length > 0 && (
            <Card className="border-border/70 bg-card/80">
              <CardHeader className="pb-2">
                <CardTitle className="text-xs font-semibold text-muted-foreground">Top spending categories</CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                {expensesByCategory.map(([cat, amt]) => (
                  <div key={cat} className="space-y-1">
                    <div className="flex justify-between text-xs">
                      <span className="text-foreground">{cat}</span>
                      <span className="font-semibold text-muted-foreground">{amt.toLocaleString()}</span>
                    </div>
                    <div className="h-1.5 w-full overflow-hidden rounded-full bg-muted/40">
                      <div className="h-full rounded-full bg-accent/60" style={{ width: `${(amt / maxExpense) * 100}%` }} />
                    </div>
                  </div>
                ))}
              </CardContent>
            </Card>
          )}
        </section>
      )}

      {/* ── Grades ────────────────────────────────────────────────────────── */}
      {latestGrades.length > 0 && (
        <section className="space-y-4">
          <SectionHeader icon={Brain} title="Recent grades" color="text-sky-500" />
          <Card className="border-border/70 bg-card/80">
            <CardContent className="pt-4">
              <div className="space-y-2">
                {latestGrades.map(g => (
                  <div key={g.id} className="flex items-center justify-between rounded-lg border border-border/40 bg-muted/20 px-3 py-2">
                    <div className="min-w-0">
                      <p className="truncate text-sm font-medium">{g.code ?? g.name}</p>
                      <p className="text-[10px] text-muted-foreground">{g.semester} · {g.credits} credits</p>
                    </div>
                    <span className={cn("shrink-0 rounded-lg px-2.5 py-1 text-sm font-bold",
                      g.grade === "A" ? "bg-success/20 text-success" :
                      g.grade.startsWith("B") ? "bg-accent/20 text-accent" :
                      g.grade.startsWith("C") ? "bg-warning/20 text-warning" :
                      "bg-danger/20 text-danger"
                    )}>
                      {g.grade}
                    </span>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </section>
      )}

      {/* ── AI Usage ──────────────────────────────────────────────────────── */}
      <section className="space-y-4">
        <SectionHeader icon={MessageSquare} title="AI usage — last 7 days" color="text-purple-500" />
        <Card className="border-border/70 bg-card/80">
          <CardContent className="pt-4">
            <div className="flex items-end justify-between mb-1">
              <p className="text-2xl font-bold tabular-nums">{totalAiMessages7}</p>
              <p className="text-xs text-muted-foreground">messages this week</p>
            </div>
            <BarChart data={aiDays.map(d => d.count)} maxVal={maxAi} colorClass="bg-purple-500/50 hover:bg-purple-500/80" />
            <div className="mt-1 flex justify-between text-[10px] text-muted-foreground">
              {aiDays.map(d => <span key={d.date}>{d.date}</span>)}
            </div>
          </CardContent>
        </Card>
      </section>

      {/* Empty state */}
      {totalSessions === 0 && tasksCreated === 0 && habits.length === 0 && totalExpenses30 === 0 && (
        <div className="rounded-2xl border border-dashed border-border bg-muted/10 py-16 text-center">
          <Zap className="mx-auto h-10 w-10 text-muted-foreground/30" />
          <p className="mt-3 text-sm font-medium text-muted-foreground">No data yet</p>
          <p className="mt-1 text-xs text-muted-foreground/60">
            Start using the app — study sessions, tasks, habits, and expenses will all show here.
          </p>
        </div>
      )}
    </div>
  );
}
