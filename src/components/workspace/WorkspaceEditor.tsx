"use client";

import { useCallback, useEffect, useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import {
  Bold,
  Code,
  Eye,
  EyeOff,
  Heading1,
  Heading2,
  Italic,
  List,
  ListOrdered,
  Loader2,
  Plus,
  Save,
  Trash2,
} from "lucide-react";

import {
  createWorkspaceDoc,
  deleteWorkspaceDoc,
  updateWorkspaceDoc,
} from "@/lib/actions/workspace";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { cn } from "@/lib/utils";

type Doc = {
  id: string;
  title: string;
  content: string;
  folder: string;
  pinned: boolean;
};

function renderMarkdown(text: string): string {
  return text
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/^### (.+)$/gm, '<h3 class="mt-3 mb-1 text-base font-bold">$1</h3>')
    .replace(/^## (.+)$/gm, '<h2 class="mt-4 mb-1.5 text-lg font-bold">$1</h2>')
    .replace(/^# (.+)$/gm, '<h1 class="mt-5 mb-2 text-xl font-bold">$1</h1>')
    .replace(/\*\*(.+?)\*\*/g, "<strong>$1</strong>")
    .replace(/\*(.+?)\*/g, "<em>$1</em>")
    .replace(/`(.+?)`/g, '<code class="rounded bg-muted px-1 py-0.5 font-mono text-[12px]">$1</code>')
    .replace(/^- (.+)$/gm, '<li class="ml-4 list-disc text-sm">$1</li>')
    .replace(/^(\d+)\. (.+)$/gm, '<li class="ml-4 list-decimal text-sm">$2</li>')
    .replace(/\n\n/g, '<div class="mt-3"></div>')
    .replace(/\n/g, "<br/>");
}

function useDebounce<T extends (...args: Parameters<T>) => void>(fn: T, delay: number): T {
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  return useCallback(
    ((...args) => {
      if (timerRef.current) clearTimeout(timerRef.current);
      timerRef.current = setTimeout(() => fn(...args), delay);
    }) as T,
    [fn, delay]
  );
}

type ToolbarAction =
  | { type: "wrap"; before: string; after: string }
  | { type: "linePrefix"; prefix: string };

function applyToolbar(
  textarea: HTMLTextAreaElement,
  action: ToolbarAction,
  setValue: (v: string) => void
) {
  const start = textarea.selectionStart;
  const end = textarea.selectionEnd;
  const val = textarea.value;
  const selected = val.slice(start, end);

  let newVal: string;
  let newStart: number;
  let newEnd: number;

  if (action.type === "wrap") {
    newVal =
      val.slice(0, start) + action.before + selected + action.after + val.slice(end);
    newStart = start + action.before.length;
    newEnd = end + action.before.length;
  } else {
    // linePrefix: prepend to the line
    const lineStart = val.lastIndexOf("\n", start - 1) + 1;
    const currentLine = val.slice(lineStart, end);
    newVal = val.slice(0, lineStart) + action.prefix + currentLine + val.slice(end);
    newStart = start + action.prefix.length;
    newEnd = end + action.prefix.length;
  }

  setValue(newVal);
  requestAnimationFrame(() => {
    textarea.setSelectionRange(newStart, newEnd);
    textarea.focus();
  });
}

const TOOLBAR_ITEMS: { label: string; icon: React.ReactNode; action: ToolbarAction }[] = [
  { label: "Bold", icon: <Bold className="h-3.5 w-3.5" />, action: { type: "wrap", before: "**", after: "**" } },
  { label: "Italic", icon: <Italic className="h-3.5 w-3.5" />, action: { type: "wrap", before: "*", after: "*" } },
  { label: "Code", icon: <Code className="h-3.5 w-3.5" />, action: { type: "wrap", before: "`", after: "`" } },
  { label: "H1", icon: <Heading1 className="h-3.5 w-3.5" />, action: { type: "linePrefix", prefix: "# " } },
  { label: "H2", icon: <Heading2 className="h-3.5 w-3.5" />, action: { type: "linePrefix", prefix: "## " } },
  { label: "Bullet", icon: <List className="h-3.5 w-3.5" />, action: { type: "linePrefix", prefix: "- " } },
  { label: "Numbered", icon: <ListOrdered className="h-3.5 w-3.5" />, action: { type: "linePrefix", prefix: "1. " } },
];

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
  const [editContent, setEditContent] = useState<string>(docs[0]?.content ?? "");
  const [editTitle, setEditTitle] = useState<string>(docs[0]?.title ?? "");
  const [preview, setPreview] = useState(false);
  const [saveState, setSaveState] = useState<"saved" | "unsaved" | "saving">("saved");
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const selected = docs.find((d) => d.id === selectedId);

  useEffect(() => {
    if (selected) {
      setEditContent(selected.content);
      setEditTitle(selected.title);
      setSaveState("saved");
    }
  }, [selectedId, selected]);

  const doAutoSave = useCallback(
    async (id: string, title: string, content: string) => {
      setSaveState("saving");
      const fd = new FormData();
      fd.set("title", title);
      fd.set("folder", selected?.folder ?? "General");
      fd.set("content", content);
      await updateWorkspaceDoc(id, fd);
      setSaveState("saved");
    },
    [selected?.folder]
  );

  const debouncedSave = useDebounce(doAutoSave, 1500);

  function handleContentChange(val: string) {
    setEditContent(val);
    setSaveState("unsaved");
    if (selectedId) debouncedSave(selectedId, editTitle, val);
  }

  function handleTitleChange(val: string) {
    setEditTitle(val);
    setSaveState("unsaved");
    if (selectedId) debouncedSave(selectedId, val, editContent);
  }

  function handleToolbar(action: ToolbarAction) {
    if (!textareaRef.current) return;
    applyToolbar(textareaRef.current, action, (v) => {
      handleContentChange(v);
    });
  }

  return (
    <div className="grid gap-6 lg:grid-cols-[260px_1fr]">
      {/* Sidebar */}
      <div className="space-y-4">
        <Card className="border-border/70 bg-card/80">
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
              <Button type="submit" disabled={pending} className="w-full gap-1">
                {pending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Plus className="h-4 w-4" />}
                Create
              </Button>
            </form>
          </CardContent>
        </Card>

        {docs.length > 0 && (
          <Card className="border-border/70 bg-card/80">
            <CardContent className="p-2">
              <ul className="space-y-0.5">
                {docs.map((d) => (
                  <li key={d.id}>
                    <button
                      type="button"
                      onClick={() => setSelectedId(d.id)}
                      className={cn(
                        "w-full rounded-lg px-3 py-2.5 text-left transition-colors",
                        selectedId === d.id
                          ? "bg-accent/10 text-accent"
                          : "text-muted-foreground hover:bg-muted/50 hover:text-foreground"
                      )}
                    >
                      <p className="truncate text-[13px] font-medium">{d.title}</p>
                      <p className="truncate text-[11px] opacity-60">{d.folder}</p>
                    </button>
                  </li>
                ))}
              </ul>
            </CardContent>
          </Card>
        )}
      </div>

      {/* Editor */}
      <Card className="border-border/70 bg-card/80">
        {docs.length === 0 && (
          <CardContent className="py-16 text-center">
            <p className="text-sm text-muted-foreground">
              Create your first doc to start writing.
            </p>
          </CardContent>
        )}

        {selected && (
          <>
            <CardHeader className="border-b border-border/50 pb-3">
              <div className="flex items-center justify-between gap-3">
                <input
                  value={editTitle}
                  onChange={(e) => handleTitleChange(e.target.value)}
                  className="flex-1 bg-transparent text-base font-semibold outline-none placeholder:text-muted-foreground/40"
                  placeholder="Document title"
                />
                <div className="flex items-center gap-2">
                  {/* Save indicator */}
                  <span
                    className={cn(
                      "flex items-center gap-1 text-[11px] transition-all",
                      saveState === "saved" && "text-success/70",
                      saveState === "unsaved" && "text-muted-foreground/50",
                      saveState === "saving" && "text-muted-foreground/70"
                    )}
                  >
                    {saveState === "saving" ? (
                      <Loader2 className="h-3 w-3 animate-spin" />
                    ) : saveState === "saved" ? (
                      <Save className="h-3 w-3" />
                    ) : null}
                    {saveState === "saved" ? "Saved" : saveState === "saving" ? "Saving…" : "Unsaved"}
                  </span>

                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={() => setPreview((p) => !p)}
                    className="gap-1.5 text-xs"
                  >
                    {preview ? <EyeOff className="h-3.5 w-3.5" /> : <Eye className="h-3.5 w-3.5" />}
                    {preview ? "Edit" : "Preview"}
                  </Button>

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
                        setSelectedId(docs.find((d) => d.id !== selected.id)?.id ?? null);
                        router.refresh();
                      });
                    }}
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            </CardHeader>

            <CardContent className="p-0">
              {!preview && (
                <>
                  {/* Markdown toolbar */}
                  <div className="flex items-center gap-0.5 border-b border-border/40 px-3 py-1.5">
                    {TOOLBAR_ITEMS.map((item) => (
                      <button
                        key={item.label}
                        type="button"
                        title={item.label}
                        onClick={() => handleToolbar(item.action)}
                        className="rounded-md p-1.5 text-muted-foreground transition-colors hover:bg-muted/60 hover:text-foreground"
                      >
                        {item.icon}
                      </button>
                    ))}
                  </div>

                  <textarea
                    ref={textareaRef}
                    key={selected.id}
                    value={editContent}
                    onChange={(e) => handleContentChange(e.target.value)}
                    placeholder="Start writing… Use # for headings, **bold**, *italic*, `code`, - for bullets"
                    className="min-h-96 w-full resize-none bg-transparent p-4 font-mono text-[13px] leading-relaxed text-foreground outline-none placeholder:text-muted-foreground/30"
                  />
                </>
              )}

              {preview && (
                <div
                  className="prose prose-sm dark:prose-invert min-h-96 max-w-none p-4 text-sm leading-relaxed [&_li]:my-0.5 [&_h1]:mb-2 [&_h2]:mb-1.5 [&_h3]:mb-1"
                  dangerouslySetInnerHTML={{ __html: renderMarkdown(editContent) || '<p class="text-muted-foreground/40 text-sm">Nothing to preview yet.</p>' }}
                />
              )}
            </CardContent>
          </>
        )}
      </Card>
    </div>
  );
}
