import type { UserContextSummary } from "@/lib/ai/user-context";

export type AutomationSignal = {
  id: string;
  level: "ok" | "warning" | "critical";
  message: string;
};

export type AutomationAction = {
  type: "run_daily_setup" | "rescue_overdue" | "schedule_block";
  label: string;
  payload: Record<string, string>;
};

export type AutomationPulse = {
  status: "ok" | "warning" | "critical";
  signals: AutomationSignal[];
  actions: AutomationAction[];
};

export function buildAutomationPulse(context: UserContextSummary): AutomationPulse {
  const signals: AutomationSignal[] = [];
  const actions: AutomationAction[] = [];

  if (context.tasks.overdueCount > 0) {
    signals.push({
      id: "overdue",
      level: context.tasks.overdueCount >= 3 ? "critical" : "warning",
      message: `${context.tasks.overdueCount} overdue task(s) need recovery.`,
    });
    actions.push({
      type: "rescue_overdue",
      label: "Rescue overdue tasks",
      payload: {},
    });
  }

  if (context.schedule.blocksToday.length === 0) {
    signals.push({
      id: "no-schedule",
      level: "warning",
      message: "No schedule blocks found for today.",
    });
    actions.push({
      type: "run_daily_setup",
      label: "Run daily setup",
      payload: {},
    });
  }

  if (context.habits.total > 0 && context.habits.completedToday === 0) {
    signals.push({
      id: "habits",
      level: "warning",
      message: "No habits completed yet today.",
    });
  }

  if (context.finance.net < 0) {
    signals.push({
      id: "finance",
      level: "warning",
      message: "Monthly net is negative. Consider a spending freeze block.",
    });
    actions.push({
      type: "schedule_block",
      label: "Add 45m budget review block",
      payload: {
        title: "Budget review and spending plan",
        startHour: "20",
        durationMin: "45",
        category: "PERSONAL",
      },
    });
  }

  if (signals.length === 0) {
    signals.push({
      id: "stable",
      level: "ok",
      message: "System stable. Keep focus and protect deep work.",
    });
  }

  return {
    status: signals.some((s) => s.level === "critical")
      ? "critical"
      : signals.some((s) => s.level === "warning")
        ? "warning"
        : "ok",
    signals,
    actions: actions.slice(0, 3),
  };
}
