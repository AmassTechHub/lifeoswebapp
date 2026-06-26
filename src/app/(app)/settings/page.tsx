import { SettingsPanel } from "@/components/settings/SettingsPanel";
import { DashboardShell } from "@/components/layout/DashboardShell";
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
      currency: true,
      gradingSystem: true,
      timezone: true,
    },
  });

  function parseJson<T>(value: string | null | undefined, fallback: T): T {
    if (!value) return fallback;
    try {
      return JSON.parse(value) as T;
    } catch {
      return fallback;
    }
  }

  return (
    <DashboardShell maxWidth="narrow">
      <PageHeader title="Settings" />
      <div className="max-w-2xl">
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
            currency: userRecord?.currency ?? "GHS",
            gradingSystem: userRecord?.gradingSystem ?? "knust",
            timezone: userRecord?.timezone ?? "Africa/Accra",
          }}
        />
      </div>
    </DashboardShell>
  );
}
