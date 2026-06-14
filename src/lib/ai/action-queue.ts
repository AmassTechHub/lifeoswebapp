import type { UserContextSummary } from "@/lib/ai/user-context";

export type QueuedAction = {
  id: string;
  title: string;
  reason: string;
  priority: number;
  action: {
    type:
      | "run_daily_setup"
      | "rescue_overdue"
      | "schedule_block"
      | "create_task"
      | "complete_task";
    payload: Record<string, string>;
  };
};

export function buildActionQueue(context: UserContextSummary): QueuedAction[] {
  const queue: QueuedAction[] = [];

  if (context.tasks.overdueCount > 0) {
    queue.push({
      id: "rescue-overdue",
      title: "Rescue overdue tasks",
      reason: `${context.tasks.overdueCount} overdue task(s) are blocking momentum.`,
      priority: 100,
      action: { type: "rescue_overdue", payload: {} },
    });
  }

  if (context.schedule.blocksToday.length === 0) {
    queue.push({
      id: "daily-setup",
      title: "Run daily setup",
      reason: "No schedule blocks exist for today.",
      priority: 90,
      action: { type: "run_daily_setup", payload: {} },
    });
  }

  const topTask = context.tasks.dueToday[0];
  if (topTask) {
    queue.push({
      id: `complete-${topTask.id}`,
      title: `Complete: ${topTask.title}`,
      reason: "Highest-impact due task for today.",
      priority: 80,
      action: { type: "complete_task", payload: { taskId: topTask.id } },
    });
  }

  const deliverable = context.clients.deliverablesDueSoon[0];
  if (deliverable) {
    queue.push({
      id: `client-${deliverable.id}`,
      title: `Client follow-up: ${deliverable.title}`,
      reason: `Due soon for ${deliverable.clientName}.`,
      priority: 70,
      action: {
        type: "create_task",
        payload: {
          title: `Follow up: ${deliverable.clientName} - ${deliverable.title}`,
          category: "CLIENTS",
        },
      },
    });
  }

  if (context.finance.net < 0) {
    queue.push({
      id: "budget-review",
      title: "Schedule budget review",
      reason: "Monthly net is negative.",
      priority: 60,
      action: {
        type: "schedule_block",
        payload: {
          title: "Budget review and spending plan",
          startHour: "20",
          durationMin: "45",
          category: "PERSONAL",
        },
      },
    });
  }

  queue.push({
    id: "deep-work",
    title: "Protect deep-work block",
    reason: "Maintain execution quality with focused work time.",
    priority: 40,
    action: {
      type: "schedule_block",
      payload: {
        title: "Deep work block",
        startHour: "18",
        durationMin: "90",
        category: "CODING",
      },
    },
  });

  return queue.sort((a, b) => b.priority - a.priority).slice(0, 5);
}
