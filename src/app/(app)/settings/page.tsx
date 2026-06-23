import { SettingsPanel } from "@/components/settings/SettingsPanel";
import { PageHeader } from "@/components/layout/PageHeader";
import { prisma } from "@/lib/prisma";
import { requireSession } from "@/lib/session";

export default async function SettingsPage() {
  const session = await requireSession();
  const userRecord = await prisma.user.findUnique({
    where: { id: session.user.id },
    select: {
      openAiKey: true,
      useCase: true,
      primaryGoal: true,
      workSchedule: true,
    },
  });

  function parseJson<T>(value: string | null, fallback: T): T {
    if (!value) return fallback;
    try {
      return JSON.parse(value) as T;
    } catch {
      return fallback;
    }
  }

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
          lifePreferences={{
            useCases: parseJson<string[]>(userRecord?.useCase ?? null, []),
            primaryGoal: userRecord?.primaryGoal ?? "",
            workSchedule: parseJson<{
              days: string[];
              startTime: string;
              endTime: string;
            } | null>(userRecord?.workSchedule ?? null, null),
          }}
        />
      </div>
    </div>
  );
}
