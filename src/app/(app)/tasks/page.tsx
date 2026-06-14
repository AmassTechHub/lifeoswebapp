import { TasksPanel } from "@/components/tasks/TasksPanel";
import { DashboardShell } from "@/components/layout/DashboardShell";
import { PageHeader } from "@/components/layout/PageHeader";
import { getTasks } from "@/lib/actions/tasks";
import { requireSession } from "@/lib/session";

export default async function TasksPage() {
  const session = await requireSession();
  const tasks = await getTasks(session.user.id);

  return (
    <DashboardShell>
      <PageHeader
        title="Tasks"
        description="Academics, clients, content, and personal work in one list."
      />
      <TasksPanel tasks={tasks} />
    </DashboardShell>
  );
}
