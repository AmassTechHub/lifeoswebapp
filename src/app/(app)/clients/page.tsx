import { ClientsPanel } from "@/components/clients/ClientsPanel";
import { DashboardShell } from "@/components/layout/DashboardShell";
import { PageHeader } from "@/components/layout/PageHeader";
import { getClientsWithDeliverables } from "@/lib/actions/clients";
import { requireSession } from "@/lib/session";
import { getUserPrefs } from "@/lib/user-prefs";

export default async function ClientsPage() {
  const session = await requireSession();
  const [clients, prefs] = await Promise.all([
    getClientsWithDeliverables(session.user.id),
    getUserPrefs(session.user.id),
  ]);

  return (
    <DashboardShell>
      <PageHeader title="Clients" />
      <ClientsPanel clients={clients} currency={prefs.currency} />
    </DashboardShell>
  );
}
