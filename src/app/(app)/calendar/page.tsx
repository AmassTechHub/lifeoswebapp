import { CalendarPanel } from "@/components/calendar/CalendarPanel";
import { DashboardShell } from "@/components/layout/DashboardShell";
import { PageHeader } from "@/components/layout/PageHeader";
import { getWeekEvents } from "@/lib/actions/calendar";
import { requireSession } from "@/lib/session";

export default async function CalendarPage() {
  const session = await requireSession();
  const events = await getWeekEvents(session.user.id);

  return (
    <DashboardShell>
      <PageHeader
        title="Calendar"
        description="Every class, client call, and personal block in one timeline."
      />
      <CalendarPanel events={events} />
    </DashboardShell>
  );
}
