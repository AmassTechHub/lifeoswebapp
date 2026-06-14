import { ClientsPanel } from "@/components/clients/ClientsPanel";
import { DashboardShell } from "@/components/layout/DashboardShell";
import { PageHeader } from "@/components/layout/PageHeader";
import { getClientsWithDeliverables } from "@/lib/actions/clients";
import { requireSession } from "@/lib/session";

export default async function ClientsPage() {
  const session = await requireSession();
  const clients = await getClientsWithDeliverables(session.user.id);

  return (
    <DashboardShell>
      <PageHeader
        title="Clients"
        description="Deliverables, deadlines, and payments. Wired into your daily automation."
      />
      <ClientsPanel clients={clients} />
    </DashboardShell>
  );
}
