import { ContentPanel } from "@/components/content/ContentPanel";
import { DashboardShell } from "@/components/layout/DashboardShell";
import { PageHeader } from "@/components/layout/PageHeader";
import { getContentItems } from "@/lib/actions/content";
import { requireSession } from "@/lib/session";

export default async function ContentPage() {
  const session = await requireSession();
  const items = await getContentItems(session.user.id);

  return (
    <DashboardShell maxWidth="full">
      <PageHeader title="Content Hub" />
      <ContentPanel items={items} />
    </DashboardShell>
  );
}
