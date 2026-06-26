import { JournalPanel } from "@/components/journal/JournalPanel";
import { DashboardShell } from "@/components/layout/DashboardShell";
import { PageHeader } from "@/components/layout/PageHeader";
import { getTodayJournal, getRecentJournals } from "@/lib/actions/journal";
import { requireSession } from "@/lib/session";

export default async function JournalPage() {
  const session = await requireSession();
  const [today, recent] = await Promise.all([
    getTodayJournal(session.user.id),
    getRecentJournals(session.user.id),
  ]);

  return (
    <DashboardShell>
      <PageHeader title="Journal" />
      <JournalPanel today={today} recent={recent} />
    </DashboardShell>
  );
}
