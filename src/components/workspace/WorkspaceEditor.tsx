"use client";

import { useCallback, useEffect, useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { EditorContent, useEditor, type Editor, type JSONContent } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import TaskList from "@tiptap/extension-task-list";
import TaskItem from "@tiptap/extension-task-item";
import { Table } from "@tiptap/extension-table";
import TableRow from "@tiptap/extension-table-row";
import TableCell from "@tiptap/extension-table-cell";
import TableHeader from "@tiptap/extension-table-header";
import Placeholder from "@tiptap/extension-placeholder";
import {
  Bold,
  CheckSquare,
  ChevronDown,
  ChevronRight,
  Code,
  Heading1,
  Heading2,
  Italic,
  List,
  ListOrdered,
  Loader2,
  Minus,
  Plus,
  Quote,
  Save,
  Table2,
  Trash2,
} from "lucide-react";

import { SlashCommand } from "./slash-command";
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
  parentId: string | null;
};

type DocNode = Doc & { children: DocNode[] };

function buildTree(docs: Doc[]): DocNode[] {
  const byParent = new Map<string | null, Doc[]>();
  for (const d of docs) {
    const key = d.parentId ?? null;
    if (!byParent.has(key)) byParent.set(key, []);
    byParent.get(key)!.push(d);
  }
  function attach(parentId: string | null): DocNode[] {
    return (byParent.get(parentId) ?? []).map((d) => ({ ...d, children: attach(d.id) }));
  }
  return attach(null);
}

function parseContent(raw: string): string | JSONContent {
  if (!raw) return "";
  try {
    const parsed = JSON.parse(raw);
    if (parsed && typeof parsed === "object" && parsed.type === "doc") return parsed as JSONContent;
  } catch {
    // Legacy plain-text/markdown doc — Tiptap will load it as a single text block
  }
  return raw;
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

const TOOLBAR_ITEMS: {
  label: string;
  icon: React.ReactNode;
  isActive: (editor: Editor) => boolean;
  run: (editor: Editor) => void;
}[] = [
  { label: "Bold", icon: <Bold className="h-3.5 w-3.5" />, isActive: (e) => e.isActive("bold"), run: (e) => e.chain().focus().toggleBold().run() },
  { label: "Italic", icon: <Italic className="h-3.5 w-3.5" />, isActive: (e) => e.isActive("italic"), run: (e) => e.chain().focus().toggleItalic().run() },
  { label: "Code", icon: <Code className="h-3.5 w-3.5" />, isActive: (e) => e.isActive("code"), run: (e) => e.chain().focus().toggleCode().run() },
  { label: "H1", icon: <Heading1 className="h-3.5 w-3.5" />, isActive: (e) => e.isActive("heading", { level: 1 }), run: (e) => e.chain().focus().toggleHeading({ level: 1 }).run() },
  { label: "H2", icon: <Heading2 className="h-3.5 w-3.5" />, isActive: (e) => e.isActive("heading", { level: 2 }), run: (e) => e.chain().focus().toggleHeading({ level: 2 }).run() },
  { label: "Bullet list", icon: <List className="h-3.5 w-3.5" />, isActive: (e) => e.isActive("bulletList"), run: (e) => e.chain().focus().toggleBulletList().run() },
  { label: "Numbered list", icon: <ListOrdered className="h-3.5 w-3.5" />, isActive: (e) => e.isActive("orderedList"), run: (e) => e.chain().focus().toggleOrderedList().run() },
  { label: "Checklist", icon: <CheckSquare className="h-3.5 w-3.5" />, isActive: (e) => e.isActive("taskList"), run: (e) => e.chain().focus().toggleTaskList().run() },
  { label: "Quote", icon: <Quote className="h-3.5 w-3.5" />, isActive: (e) => e.isActive("blockquote"), run: (e) => e.chain().focus().toggleBlockquote().run() },
  { label: "Table", icon: <Table2 className="h-3.5 w-3.5" />, isActive: () => false, run: (e) => e.chain().focus().insertTable({ rows: 3, cols: 3, withHeaderRow: true }).run() },
  { label: "Divider", icon: <Minus className="h-3.5 w-3.5" />, isActive: () => false, run: (e) => e.chain().focus().setHorizontalRule().run() },
];

function DocTreeItem({
  node,
  depth,
  selectedId,
  expanded,
  onSelect,
  onToggle,
  onAddSubpage,
}: {
  node: DocNode;
  depth: number;
  selectedId: string | null;
  expanded: Set<string>;
  onSelect: (id: string) => void;
  onToggle: (id: string) => void;
  onAddSubpage: (parentId: string) => void;
}) {
  const isOpen = expanded.has(node.id);
  const hasChildren = node.children.length > 0;

  return (
    <li>
      <div
        className={cn(
          "group flex items-center gap-0.5 rounded-lg pr-1 transition-colors",
          selectedId === node.id ? "bg-accent/10 text-accent" : "text-muted-foreground hover:bg-muted/50 hover:text-foreground"
        )}
        style={{ paddingLeft: `${depth * 14}px` }}
      >
        <button
          type="button"
          onClick={() => onToggle(node.id)}
          className={cn("flex h-6 w-5 shrink-0 items-center justify-center", !hasChildren && "opacity-0")}
        >
          {isOpen ? <ChevronDown className="h-3 w-3" /> : <ChevronRight className="h-3 w-3" />}
        </button>
        <button type="button" onClick={() => onSelect(node.id)} className="min-w-0 flex-1 py-2 text-left">
          <p className="truncate text-[13px] font-medium">{node.title}</p>
          {depth === 0 && <p className="truncate text-[11px] opacity-60">{node.folder}</p>}
        </button>
        <button
          type="button"
          title="Add subpage"
          onClick={() => onAddSubpage(node.id)}
          className="shrink-0 rounded p-1 opacity-0 transition-opacity hover:bg-muted group-hover:opacity-100"
        >
          <Plus className="h-3 w-3" />
        </button>
      </div>
      {isOpen && hasChildren && (
        <ul className="space-y-0.5">
          {node.children.map((child) => (
            <DocTreeItem
              key={child.id}
              node={child}
              depth={depth + 1}
              selectedId={selectedId}
              expanded={expanded}
              onSelect={onSelect}
              onToggle={onToggle}
              onAddSubpage={onAddSubpage}
            />
          ))}
        </ul>
      )}
    </li>
  );
}

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
  const [editTitle, setEditTitle] = useState<string>(docs[0]?.title ?? "");
  const [saveState, setSaveState] = useState<"saved" | "unsaved" | "saving">("saved");
  const [expanded, setExpanded] = useState<Set<string>>(new Set());

  function toggleExpanded(id: string) {
    setExpanded((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id); else next.add(id);
      return next;
    });
  }

  function handleAddSubpage(parentId: string) {
    startTransition(async () => {
      const fd = new FormData();
      fd.set("title", "Untitled");
      fd.set("parentId", parentId);
      const res = await createWorkspaceDoc(fd);
      if (res.error) { toast.error(res.error); return; }
      setExpanded((prev) => new Set(prev).add(parentId));
      if (res.id) setSelectedId(res.id);
      router.refresh();
    });
  }

  const selected = docs.find((d) => d.id === selectedId);
  const selectedFolderRef = useRef(selected?.folder ?? "General");

  const doAutoSave = useCallback(
    async (id: string, title: string, content: string) => {
      setSaveState("saving");
      const fd = new FormData();
      fd.set("title", title);
      fd.set("folder", selectedFolderRef.current);
      fd.set("content", content);
      await updateWorkspaceDoc(id, fd);
      setSaveState("saved");
    },
    []
  );

  const debouncedSave = useDebounce(doAutoSave, 1500);

  const editor = useEditor({
    extensions: [
      StarterKit,
      TaskList,
      TaskItem.configure({ nested: true }),
      Table.configure({ resizable: false }),
      TableRow,
      TableHeader,
      TableCell,
      Placeholder.configure({ placeholder: "Type '/' for commands…" }),
      SlashCommand,
    ],
    content: parseContent(selected?.content ?? ""),
    immediatelyRender: false,
    onUpdate: ({ editor }) => {
      setSaveState("unsaved");
      if (selectedId) debouncedSave(selectedId, editTitle, JSON.stringify(editor.getJSON()));
    },
    editorProps: {
      attributes: { class: "tiptap" },
    },
  });

  useEffect(() => {
    if (!selected || !editor) return;
    selectedFolderRef.current = selected.folder;
    setEditTitle(selected.title);
    setSaveState("saved");
    editor.commands.setContent(parseContent(selected.content), { emitUpdate: false });
  }, [selectedId, selected, editor]);

  function handleTitleChange(val: string) {
    setEditTitle(val);
    setSaveState("unsaved");
    if (selectedId && editor) debouncedSave(selectedId, val, JSON.stringify(editor.getJSON()));
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
                {buildTree(docs).map((node) => (
                  <DocTreeItem
                    key={node.id}
                    node={node}
                    depth={0}
                    selectedId={selectedId}
                    expanded={expanded}
                    onSelect={setSelectedId}
                    onToggle={toggleExpanded}
                    onAddSubpage={handleAddSubpage}
                  />
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

        {selected && editor && (
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
              {/* Block toolbar */}
              <div className="flex items-center gap-0.5 overflow-x-auto border-b border-border/40 px-3 py-1.5">
                {TOOLBAR_ITEMS.map((item) => (
                  <button
                    key={item.label}
                    type="button"
                    title={item.label}
                    onClick={() => item.run(editor)}
                    className={cn(
                      "rounded-md p-1.5 text-muted-foreground transition-colors hover:bg-muted/60 hover:text-foreground",
                      item.isActive(editor) && "bg-accent/15 text-accent"
                    )}
                  >
                    {item.icon}
                  </button>
                ))}
              </div>

              <div className="min-h-96 p-4 text-sm leading-relaxed text-foreground">
                <EditorContent editor={editor} />
              </div>
              <p className="border-t border-border/40 px-4 py-1.5 text-[10px] text-muted-foreground/50">
                Type &lsquo;/&rsquo; for blocks — headings, lists, checklists, tables, quotes
              </p>
            </CardContent>
          </>
        )}
      </Card>
    </div>
  );
}
