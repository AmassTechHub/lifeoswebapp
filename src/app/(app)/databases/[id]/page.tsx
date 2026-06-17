import { notFound } from "next/navigation";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";

import { DashboardShell } from "@/components/layout/DashboardShell";
import { DatabaseView } from "@/components/databases/DatabaseView";
import { getDatabase, type Property, type View } from "@/lib/actions/database";
import { requireSession } from "@/lib/session";

export const dynamic = "force-dynamic";

export default async function DatabaseDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const session = await requireSession();

  const db = await getDatabase(id, session.user.id);
  if (!db) notFound();

  return (
    <DashboardShell>
      <header className="mb-8">
        <Link href="/databases" className="mb-2 inline-flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground">
          <ArrowLeft className="h-3.5 w-3.5" /> All databases
        </Link>
        <h1 className="text-2xl font-bold tracking-tight sm:text-3xl">{db.name}</h1>
      </header>

      <DatabaseView
        database={{
          id: db.id,
          name: db.name,
          properties: db.properties as unknown as Property[],
          views: db.views as unknown as View[],
          rows: db.rows.map((r) => ({ id: r.id, values: r.values as Record<string, unknown> })),
        }}
      />
    </DashboardShell>
  );
}
