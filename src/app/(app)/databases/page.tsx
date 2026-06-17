import { DashboardShell } from "@/components/layout/DashboardShell";
import { DatabaseList } from "@/components/databases/DatabaseList";
import { getDatabases } from "@/lib/actions/database";
import { requireSession } from "@/lib/session";

export default async function DatabasesPage() {
  const session = await requireSession();
  const databases = await getDatabases(session.user.id);

  return (
    <DashboardShell>
      <header className="mb-8">
        <h1 className="text-2xl font-bold tracking-tight sm:text-3xl">Databases</h1>
        <p className="mt-2 max-w-2xl text-sm text-muted-foreground">
          Build your own structured trackers — table, board, and calendar views over the same data.
        </p>
      </header>

      <DatabaseList databases={databases} />
    </DashboardShell>
  );
}
