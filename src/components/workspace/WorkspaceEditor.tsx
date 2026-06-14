"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Loader2, Plus, Trash2 } from "lucide-react";

import {
  createWorkspaceDoc,
  deleteWorkspaceDoc,
  updateWorkspaceDoc,
} from "@/lib/actions/workspace";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";

type Doc = {
  id: string;
  title: string;
  content: string;
  folder: string;
  pinned: boolean;
};

export function WorkspaceEditor({
  docs,
  folders,
}: {
  docs: Doc[];
  folders: string[];
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [selectedId, setSelectedId] = useState<string | null>(docs[0]?.id ?? null);
  const selected = docs.find((d) => d.id === selectedId);

  return (
    <div className="grid gap-6 lg:grid-cols-3">
      <Card className="border-border/70 bg-card/80 lg:col-span-1">
        <CardHeader>
          <CardTitle className="text-base">New document</CardTitle>
        </CardHeader>
        <CardContent>
          <form
            onSubmit={(e) => {
              e.preventDefault();
              startTransition(async () => {
                await createWorkspaceDoc(new FormData(e.currentTarget));
                toast.success("Document created");
                router.refresh();
              });
            }}
            className="space-y-3"
          >
            <div>
              <Label>Title</Label>
              <Input name="title" required placeholder="Week plan, client brief…" />
            </div>
            <div>
              <Label>Folder</Label>
              <Input
                name="folder"
                list="workspace-folders"
                defaultValue="General"
                placeholder="General"
              />
              <datalist id="workspace-folders">
                {folders.map((f) => (
                  <option key={f} value={f} />
                ))}
              </datalist>
            </div>
            <Textarea name="content" rows={4} placeholder="Start writing…" />
            <Button type="submit" disabled={pending} className="w-full gap-1">
              {pending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Plus className="h-4 w-4" />}
              Create
            </Button>
          </form>
        </CardContent>
      </Card>

      <Card className="border-border/70 bg-card/80 lg:col-span-2">
        <CardHeader className="flex flex-row items-center justify-between gap-2">
          <CardTitle className="text-base">Edit</CardTitle>
          {selected && (
            <Button
              type="button"
              variant="ghost"
              size="sm"
              className="text-danger"
              disabled={pending}
              onClick={() => {
                if (!confirm("Delete this document?")) return;
                startTransition(async () => {
                  await deleteWorkspaceDoc(selected.id);
                  toast.success("Document deleted");
                  router.refresh();
                });
              }}
            >
              <Trash2 className="h-4 w-4" />
            </Button>
          )}
        </CardHeader>
        <CardContent>
          {docs.length === 0 && (
            <p className="text-sm text-muted-foreground">
              Create your first doc to replace scattered Notion pages.
            </p>
          )}
          {docs.length > 0 && (
            <>
              <select
                className="mb-4 w-full rounded-lg border border-border bg-background px-3 py-2 text-sm"
                value={selectedId ?? ""}
                onChange={(e) => setSelectedId(e.target.value)}
              >
                {docs.map((d) => (
                  <option key={d.id} value={d.id}>
                    {d.title} ({d.folder})
                  </option>
                ))}
              </select>
              {selected && (
                <form
                  key={selected.id}
                  onSubmit={(e) => {
                    e.preventDefault();
                    startTransition(async () => {
                      await updateWorkspaceDoc(selected.id, new FormData(e.currentTarget));
                    });
                  }}
                  className="space-y-3"
                >
                  <Input name="title" defaultValue={selected.title} required />
                  <Input name="folder" defaultValue={selected.folder} />
                  <Textarea
                    name="content"
                    rows={12}
                    defaultValue={selected.content}
                    className="font-mono text-sm"
                  />
                  <Button type="submit" disabled={pending}>
                    {pending ? <Loader2 className="h-4 w-4 animate-spin" /> : "Save"}
                  </Button>
                </form>
              )}
            </>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
