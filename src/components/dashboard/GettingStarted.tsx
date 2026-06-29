import Link from "next/link";
import {
  Bot, Calendar, CheckSquare, DollarSign, Flame,
  GraduationCap, Target, X,
} from "lucide-react";

type Step = {
  id: string;
  title: string;
  description: string;
  href: string;
  icon: React.ComponentType<{ className?: string }>;
  color: string;
  done: boolean;
};

export function GettingStarted({
  steps,
  onDismiss,
}: {
  steps: Step[];
  onDismiss?: () => void;
}) {
  const doneCount = steps.filter((s) => s.done).length;
  const allDone = doneCount === steps.length;
  if (allDone) return null;

  const pct = Math.round((doneCount / steps.length) * 100);

  return (
    <div className="rounded-2xl border border-accent/25 bg-accent/5 p-4">
      <div className="mb-3 flex items-center justify-between gap-3">
        <div className="flex items-center gap-2.5">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-accent/15 text-accent text-sm font-black">
            {pct}%
          </div>
          <div>
            <p className="text-sm font-semibold text-foreground">Get started with Life OS</p>
            <p className="text-[11px] text-muted-foreground/60">
              {doneCount} of {steps.length} steps done
            </p>
          </div>
        </div>
        {onDismiss && (
          <button
            type="button"
            onClick={onDismiss}
            className="rounded-lg p-1 text-muted-foreground/40 hover:text-muted-foreground transition-colors"
          >
            <X className="h-4 w-4" />
          </button>
        )}
      </div>

      {/* Progress bar */}
      <div className="mb-4 h-1.5 w-full overflow-hidden rounded-full bg-muted/50">
        <div
          className="h-full rounded-full bg-accent transition-all duration-700"
          style={{ width: `${pct}%` }}
        />
      </div>

      <div className="grid gap-2 sm:grid-cols-2">
        {steps.map((step) => {
          const Icon = step.icon;
          return (
            <Link
              key={step.id}
              href={step.done ? "#" : step.href}
              className={`flex items-start gap-3 rounded-xl border px-3 py-2.5 transition-all ${
                step.done
                  ? "border-border/30 bg-background/30 opacity-50 cursor-default"
                  : "border-border/50 bg-background/50 hover:border-accent/30 hover:bg-accent/5"
              }`}
            >
              <div className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-lg mt-0.5 ${
                step.done ? "bg-emerald-500/15" : "bg-muted/50"
              }`}>
                {step.done ? (
                  <div className="h-2.5 w-2.5 rounded-full bg-emerald-500" />
                ) : (
                  <Icon className={`h-3.5 w-3.5 ${step.color}`} />
                )}
              </div>
              <div className="min-w-0">
                <p className={`text-xs font-semibold ${step.done ? "line-through text-muted-foreground" : "text-foreground"}`}>
                  {step.title}
                </p>
                <p className="text-[10px] text-muted-foreground/60 truncate">{step.description}</p>
              </div>
            </Link>
          );
        })}
      </div>
    </div>
  );
}

// Server-side helper — checks which steps are done
export async function getGettingStartedSteps(data: {
  hasTask: boolean;
  hasHabit: boolean;
  hasGoal: boolean;
  hasCourse: boolean;
  hasExpense: boolean;
  hasEvent: boolean;
}): Promise<Step[]> {
  return [
    {
      id: "task",
      title: "Add your first task",
      description: "What needs to get done today?",
      href: "/tasks",
      icon: CheckSquare,
      color: "text-accent",
      done: data.hasTask,
    },
    {
      id: "habit",
      title: "Set a daily habit",
      description: "Build consistency with habits you track daily",
      href: "/habits",
      icon: Flame,
      color: "text-orange-400",
      done: data.hasHabit,
    },
    {
      id: "goal",
      title: "Write down a goal",
      description: "Start with your biggest vision or this week's focus",
      href: "/goals",
      icon: Target,
      color: "text-pink-400",
      done: data.hasGoal,
    },
    {
      id: "study",
      title: "Set up your courses or topics",
      description: "Add what you're learning to track progress",
      href: "/learning",
      icon: GraduationCap,
      color: "text-emerald-400",
      done: data.hasCourse,
    },
    {
      id: "finance",
      title: "Log an expense",
      description: "Start tracking your spending",
      href: "/finance",
      icon: DollarSign,
      color: "text-green-400",
      done: data.hasExpense,
    },
    {
      id: "calendar",
      title: "Add a calendar event",
      description: "Block time for what matters",
      href: "/calendar",
      icon: Calendar,
      color: "text-purple-400",
      done: data.hasEvent,
    },
  ];
}
