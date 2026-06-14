import { SettingsPanel } from "@/components/settings/SettingsPanel";
import { PageHeader } from "@/components/layout/PageHeader";
import { prisma } from "@/lib/prisma";
import { requireSession } from "@/lib/session";

export default async function SettingsPage() {
  const session = await requireSession();
  const userRecord = await prisma.user.findUnique({
    where: { id: session.user.id },
    select: { openAiKey: true },
  });

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
          hasServerKey={!!userRecord?.openAiKey}
        />
      </div>
    </div>
  );
}
