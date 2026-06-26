import { FileText, Pin } from "lucide-react";

import { DashboardShell } from "@/components/layout/DashboardShell";
import { WorkspaceEditor } from "@/components/workspace/WorkspaceEditor";
import { getWorkspaceDocs } from "@/lib/actions/workspace";
import { requireSession } from "@/lib/session";

export default async function WorkspacePage() {
  const session = await requireSession();
  const docs = await getWorkspaceDocs(session.user.id);

  const folders = [...new Set(docs.map((d) => d.folder))].sort();

  return (
    <DashboardShell>
      <header className="mb-5">
        <h1 className="text-xl font-semibold tracking-tight text-foreground sm:text-2xl">Workspace</h1>
      </header>

      <WorkspaceEditor docs={docs} folders={folders} />

      {docs.length > 0 && (
        <section className="mt-10">
          <h2 className="mb-4 text-sm font-semibold uppercase tracking-wider text-muted-foreground">
            All documents
          </h2>
          <ul className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {docs.map((doc) => (
              <li
                key={doc.id}
                className="rounded-xl border border-border/70 bg-card/80 p-4"
              >
                <div className="flex items-start gap-2">
                  <FileText className="h-4 w-4 shrink-0 text-accent" />
                  <div className="min-w-0 flex-1">
                    <p className="truncate font-medium">{doc.title}</p>
                    <p className="text-xs text-muted-foreground">{doc.folder}</p>
                  </div>
                  {doc.pinned && <Pin className="h-3.5 w-3.5 text-warning" />}
                </div>
                <p className="mt-2 line-clamp-2 text-xs text-muted-foreground">
                  {doc.content.slice(0, 120) || "Empty"}
                </p>
              </li>
            ))}
          </ul>
        </section>
      )}
    </DashboardShell>
  );
}
