import { SettingsPanel } from "@/components/settings/SettingsPanel";
import { PageHeader } from "@/components/layout/PageHeader";
import { requireSession } from "@/lib/session";

export default async function SettingsPage() {
  const session = await requireSession();

  return (
    <div className="p-8">
      <PageHeader
        title="Settings"
        description="Manage your profile, preferences, and account."
      />
      <div className="mt-8 max-w-2xl">
        <SettingsPanel
          user={{
            id: session.user.id,
            name: session.user.name,
            email: session.user.email,
            createdAt: new Date(session.user.createdAt),
          }}
        />
      </div>
    </div>
  );
}
