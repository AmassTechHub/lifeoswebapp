"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { toast } from "sonner";
import {
  BookOpen, CalendarDays, CheckSquare, Database as DatabaseIcon,
  Loader2, Plus, Repeat, Table as TableIcon, Trash2, Users,
} from "lucide-react";

import { createDatabase, deleteDatabase, type DatabaseTemplateKey } from "@/lib/actions/database";
import { DATABASE_TEMPLATES } from "@/lib/database-templates";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";

const TEMPLATE_ICONS: Record<string, typeof TableIcon> = {
  Table: TableIcon,
  CheckSquare,
  BookOpen,
  Repeat,
  CalendarDays,
  Users,
};

type DatabaseSummary = {
  id: string;
  name: string;
  updatedAt: Date;
  _count: { rows: number };
};

export function DatabaseList({ databases }: { databases: DatabaseSummary[] }) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [name, setName] = useState("");
  const [templateKey, setTemplateKey] = useState<DatabaseTemplateKey>("tasks");

  function handleCreate(e: React.FormEvent) {
    e.preventDefault();
    if (!name.trim()) return;
    startTransition(async () => {
      const res = await createDatabase(name, templateKey);
      if (res.error) { toast.error(res.error); return; }
      toast.success("Database created");
      setName("");
      if (res.id) router.push(`/databases/${res.id}`);
    });
  }

  return (
    <div className="space-y-6">
      <Card className="border-border/70 bg-card/80">
        <CardHeader>
          <CardTitle className="text-base">New database</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
            {DATABASE_TEMPLATES.map((t) => {
              const Icon = TEMPLATE_ICONS[t.icon] ?? TableIcon;
              return (
                <button
                  key={t.key}
                  type="button"
                  onClick={() => setTemplateKey(t.key)}
                  title={t.description}
                  className={cn(
                    "flex items-center gap-2 rounded-xl border px-3 py-2 text-left text-sm transition-colors",
                    templateKey === t.key
                      ? "border-accent/50 bg-accent/10 text-foreground"
                      : "border-border/60 text-muted-foreground hover:border-accent/30 hover:text-foreground"
                  )}
                >
                  <Icon className="h-4 w-4 shrink-0" />
                  <span className="truncate font-medium">{t.label}</span>
                </button>
              );
            })}
          </div>
          <form onSubmit={handleCreate} className="flex gap-2">
            <Input
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Projects, Reading list, CRM…"
              className="flex-1"
            />
            <Button type="submit" disabled={pending} className="gap-1.5 shrink-0">
              {pending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Plus className="h-4 w-4" />}
              Create
            </Button>
          </form>
        </CardContent>
      </Card>

      {databases.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-border bg-muted/20 px-6 py-14 text-center">
          <DatabaseIcon className="mx-auto h-10 w-10 text-muted-foreground/30" />
          <p className="mt-3 text-sm font-medium text-muted-foreground">No databases yet</p>
          <p className="mt-1 text-xs text-muted-foreground/60">
            Build custom trackers with table, board, and calendar views — like a Notion database.
          </p>
        </div>
      ) : (
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {databases.map((db) => (
            <div key={db.id} className="group relative">
              <Link
                href={`/databases/${db.id}`}
                className="flex flex-col gap-2 rounded-xl border border-border/60 bg-card/80 p-4 transition-all hover:border-accent/30 hover:bg-accent/5"
              >
                <DatabaseIcon className="h-5 w-5 text-accent" />
                <p className="truncate font-semibold text-foreground text-sm">{db.name}</p>
                <p className="text-xs text-muted-foreground">{db._count.rows} row{db._count.rows === 1 ? "" : "s"}</p>
              </Link>
              <button
                onClick={() => {
                  if (!confirm(`Delete "${db.name}"? This cannot be undone.`)) return;
                  startTransition(async () => {
                    await deleteDatabase(db.id);
                    toast.success("Database deleted");
                    router.refresh();
                  });
                }}
                className="absolute right-2 top-2 rounded-lg bg-card/90 p-1.5 text-muted-foreground/50 opacity-0 transition-opacity hover:text-danger group-hover:opacity-100"
              >
                <Trash2 className="h-3.5 w-3.5" />
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
