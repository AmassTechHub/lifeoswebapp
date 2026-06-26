"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { ChevronRight, Copy, FileText, Loader2, PenLine, Plus, Save, Sparkles, Trash2, Video, X } from "lucide-react";

import {
  createContentItem,
  deleteContentItem,
  saveGeneratedScript,
  updateContentScript,
  updateContentStage,
} from "@/lib/actions/content";
import {
  contentStages,
  contentStageLabels,
  detectPreset,
  getStagesForPlatform,
  getStageLabelForPlatform,
  type ContentStage,
} from "@/lib/content-stages";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { cn } from "@/lib/utils";

type ContentItem = {
  id: string;
  title: string;
  channel: string;
  stage: string;
  script: string;
  updatedAt: Date;
};

export function ContentPanel({ items }: { items: ContentItem[] }) {
  const router = useRouter();
  // Channels are entirely user-driven: suggestions come from the channels this
  // user has already used. No brands are hardcoded — a brand-new account starts
  // with a free-text field and zero suggestions.
  const channels = Array.from(
    new Set(items.map((i) => i.channel.trim()).filter(Boolean))
  ).sort((a, b) => a.localeCompare(b));
  const [pending, startTransition] = useTransition();
  const [scriptOpen, setScriptOpen] = useState(false);
  const [scriptLoading, setScriptLoading] = useState(false);
  const [generatedScript, setGeneratedScript] = useState<string | null>(null);
  // Remember what the script was generated for, so it can be saved to the pipeline.
  const [scriptMeta, setScriptMeta] = useState<{ topic: string; channel: string }>({
    topic: "",
    channel: "",
  });
  const [savingScript, setSavingScript] = useState(false);

  // Per-card script editor
  const [editItem, setEditItem] = useState<ContentItem | null>(null);
  const [editScript, setEditScript] = useState("");
  const [editSaving, setEditSaving] = useState(false);
  const [editRegenerating, setEditRegenerating] = useState(false);

  async function generateScript(fd: FormData) {
    setScriptLoading(true);
    setScriptMeta({
      topic: String(fd.get("topic") ?? "").trim(),
      channel: String(fd.get("channel") ?? "").trim(),
    });
    try {
      const res = await fetch("/api/ai/script-writer", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          topic: fd.get("topic"),
          hook: fd.get("hook"),
          channel: fd.get("channel"),
          style: fd.get("style"),
        }),
      });
      const data = await res.json();
      if (data.error) { toast.error(data.error); return; }
      setGeneratedScript(data.script);
    } catch {
      toast.error("Script generation failed");
    } finally {
      setScriptLoading(false);
    }
  }

  function saveNewScript() {
    if (!generatedScript) return;
    setSavingScript(true);
    startTransition(async () => {
      const result = await saveGeneratedScript({
        title: scriptMeta.topic || "Untitled script",
        channel: scriptMeta.channel,
        script: generatedScript,
      });
      setSavingScript(false);
      if (result?.ok) {
        toast.success("Saved to pipeline at the Script stage");
        setScriptOpen(false);
        setGeneratedScript(null);
        router.refresh();
      } else {
        toast.error(result?.error ?? "Could not save script");
      }
    });
  }

  function openScriptEditor(item: ContentItem) {
    setEditItem(item);
    setEditScript(item.script ?? "");
  }

  function saveScriptEdit() {
    if (!editItem) return;
    setEditSaving(true);
    startTransition(async () => {
      const result = await updateContentScript(editItem.id, editScript);
      setEditSaving(false);
      if (result?.ok) {
        toast.success("Script saved");
        setEditItem(null);
        router.refresh();
      } else {
        toast.error(result?.error ?? "Could not save script");
      }
    });
  }

  async function regenerateForEdit() {
    if (!editItem) return;
    setEditRegenerating(true);
    try {
      const res = await fetch("/api/ai/script-writer", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ topic: editItem.title, channel: editItem.channel }),
      });
      const data = await res.json();
      if (data.error) { toast.error(data.error); return; }
      setEditScript(data.script);
      toast.success("Regenerated — review and save");
    } catch {
      toast.error("Regeneration failed");
    } finally {
      setEditRegenerating(false);
    }
  }

  // Group items by stage. Each channel may use different stages, so for the
  // kanban we show ALL stages but only include items that belong to each.
  const allActiveStages = contentStages;

  const byStage = allActiveStages.map((stage) => ({
    stage,
    label: contentStageLabels[stage],
    items: items.filter((i) => i.stage === stage),
  }));

  return (
    <div className="space-y-6">
      {/* Channel suggestions shared by both forms — populated from this user's own channels */}
      <datalist id="content-channels">
        {channels.map((c) => (
          <option key={c} value={c} />
        ))}
      </datalist>

      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div className="rounded-2xl border border-accent/20 bg-accent/5 p-4 flex-1">
          <div className="flex items-start gap-3">
            <Video className="mt-0.5 h-5 w-5 shrink-0 text-accent" />
            <div>
              <p className="font-semibold text-foreground">Content pipeline</p>
              <p className="mt-1 text-sm text-muted-foreground">
                Ideas → script → record → edit → publish. Plan every video in one place.
              </p>
            </div>
          </div>
        </div>
        <Button variant="outline" className="gap-2 shrink-0" onClick={() => { setGeneratedScript(null); setScriptOpen(true); }}>
          <PenLine className="h-4 w-4" />
          Write Script with AI
        </Button>
      </div>

      {/* AI Script Writer Dialog */}
      <Dialog open={scriptOpen} onOpenChange={(v) => { if (!v) { setScriptOpen(false); setGeneratedScript(null); } }}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>AI Script Writer</DialogTitle>
          </DialogHeader>
          {!generatedScript ? (
            <form
              onSubmit={(e) => { e.preventDefault(); generateScript(new FormData(e.currentTarget)); }}
              className="space-y-4"
            >
              <div className="space-y-1.5">
                <Label>Video topic</Label>
                <Input name="topic" placeholder="How to build a SaaS app with Next.js in 2025" required autoFocus />
              </div>
              <div className="space-y-1.5">
                <Label>Opening hook (optional)</Label>
                <Input name="hook" placeholder="What if you could launch a product in a weekend?" />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <Label>Channel</Label>
                  <Input
                    name="channel"
                    list="content-channels"
                    placeholder="e.g. YouTube, Newsletter"
                    defaultValue={channels[0] ?? ""}
                  />
                </div>
                <div className="space-y-1.5">
                  <Label>Style</Label>
                  <select name="style" className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm focus:border-accent focus:outline-none">
                    <option>Educational, conversational</option>
                    <option>Storytelling, narrative</option>
                    <option>Tutorial, step-by-step</option>
                    <option>Opinion, thought leadership</option>
                    <option>Motivational, energetic</option>
                  </select>
                </div>
              </div>
              <DialogFooter>
                <Button type="button" variant="ghost" onClick={() => setScriptOpen(false)}><X className="h-4 w-4" /></Button>
                <Button type="submit" disabled={scriptLoading} className="gap-2">
                  {scriptLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : <PenLine className="h-4 w-4" />}
                  Generate script
                </Button>
              </DialogFooter>
            </form>
          ) : (
            <div className="space-y-4">
              <div className="rounded-xl border border-border/70 bg-muted/20 p-4 text-sm leading-relaxed whitespace-pre-wrap font-mono max-h-[50vh] overflow-y-auto">
                {generatedScript}
              </div>
              <div className="flex flex-wrap gap-2">
                <Button onClick={saveNewScript} disabled={savingScript || pending} className="gap-2 flex-1">
                  {savingScript ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
                  Save to pipeline
                </Button>
                <Button variant="outline" className="gap-2" onClick={() => { navigator.clipboard.writeText(generatedScript); toast.success("Copied to clipboard!"); }}>
                  <Copy className="h-4 w-4" />
                  Copy
                </Button>
                <Button variant="outline" className="gap-2" onClick={() => setGeneratedScript(null)}>
                  <PenLine className="h-4 w-4" />
                  Regenerate
                </Button>
                <Button variant="ghost" onClick={() => { setScriptOpen(false); setGeneratedScript(null); }}>Close</Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Per-card script editor */}
      <Dialog open={!!editItem} onOpenChange={(v) => { if (!v) setEditItem(null); }}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="truncate">{editItem?.title}</DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <Label>Script</Label>
              <Button
                type="button"
                variant="outline"
                size="sm"
                className="gap-1.5"
                onClick={regenerateForEdit}
                disabled={editRegenerating}
              >
                {editRegenerating ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Sparkles className="h-3.5 w-3.5" />}
                {editScript.trim() ? "Regenerate with AI" : "Write with AI"}
              </Button>
            </div>
            <Textarea
              value={editScript}
              onChange={(e) => setEditScript(e.target.value)}
              placeholder="Write your script here, or generate one with AI…"
              className="min-h-[320px] font-mono text-sm leading-relaxed"
            />
            <div className="flex flex-wrap justify-end gap-2">
              {editScript.trim() && (
                <Button
                  type="button"
                  variant="outline"
                  className="gap-2"
                  onClick={() => { navigator.clipboard.writeText(editScript); toast.success("Copied to clipboard!"); }}
                >
                  <Copy className="h-4 w-4" />
                  Copy
                </Button>
              )}
              <Button type="button" variant="ghost" onClick={() => setEditItem(null)}>Cancel</Button>
              <Button type="button" onClick={saveScriptEdit} disabled={editSaving || pending} className="gap-2">
                {editSaving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
                Save script
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      <Card className="border-border/70 bg-card/80">
        <CardHeader>
          <CardTitle className="text-base">New piece of content</CardTitle>
        </CardHeader>
        <CardContent>
          <NewContentForm channels={channels} pending={pending} onSubmit={(fd) => {
            startTransition(async () => {
              await createContentItem(fd);
              toast.success("Added to pipeline");
            });
          }} />
        </CardContent>
      </Card>

      <div className="grid gap-4 lg:grid-cols-5">
        {byStage.map(({ stage, label, items: stageItems }) => (
          <Card key={stage} className="border-border/70 bg-card/80">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-semibold">{label}</CardTitle>
              <p className="text-xs text-muted-foreground">{stageItems.length} items</p>
            </CardHeader>
            <CardContent className="space-y-2">
              {stageItems.length === 0 ? (
                <p className="text-xs text-muted-foreground">Empty</p>
              ) : (
                stageItems.map((item) => (
                  <ContentCard
                    key={item.id}
                    item={item}
                    onEditScript={() => openScriptEditor(item)}
                    onAdvance={(next) =>
                      startTransition(async () => {
                        await updateContentStage(item.id, next);
                        toast.success("Stage updated");
                        router.refresh();
                      })
                    }
                    onDelete={() =>
                      startTransition(async () => {
                        await deleteContentItem(item.id);
                        toast.success("Removed from pipeline");
                        router.refresh();
                      })
                    }
                  />
                ))
              )}
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}

function ContentCard({
  item,
  onAdvance,
  onDelete,
  onEditScript,
}: {
  item: ContentItem;
  onAdvance: (stage: string) => void;
  onDelete: () => void;
  onEditScript: () => void;
}) {
  const platformStages = getStagesForPlatform(item.channel);
  const idx = platformStages.indexOf(item.stage as ContentStage);
  const next = idx >= 0 && idx < platformStages.length - 1 ? platformStages[idx + 1] : null;
  const nextLabel = next ? getStageLabelForPlatform(next, item.channel) : null;
  const hasScript = !!item.script?.trim();
  const preset = detectPreset(item.channel);

  return (
    <div className="rounded-lg border border-border/60 bg-background/50 p-3">
      <div className="flex items-start gap-1.5 mb-1">
        <span className="text-sm">{preset.emoji}</span>
        <p className="text-sm font-medium leading-snug flex-1">{item.title}</p>
      </div>
      <p className="mt-0.5 text-xs text-muted-foreground">{item.channel}</p>
      <button
        type="button"
        onClick={onEditScript}
        className={cn(
          "mt-2 inline-flex items-center gap-1 rounded-md px-1.5 py-0.5 text-[11px] font-medium transition-colors",
          hasScript
            ? "text-accent hover:bg-accent/10"
            : "text-muted-foreground hover:bg-muted/60 hover:text-foreground"
        )}
      >
        <FileText className="h-3 w-3" />
        {hasScript ? "View / edit script" : "Add script"}
      </button>
      <div className="mt-2 flex items-center justify-between gap-1">
        {next ? (
          <button
            type="button"
            onClick={() => onAdvance(next)}
            className="inline-flex items-center gap-0.5 text-xs font-medium text-accent hover:underline"
          >
            → {nextLabel}
            <ChevronRight className="h-3 w-3" />
          </button>
        ) : (
          <span className="text-xs text-success">✓ Live</span>
        )}
        <button
          type="button"
          onClick={onDelete}
          className="text-muted-foreground hover:text-danger"
          aria-label="Delete"
        >
          <Trash2 className="h-3.5 w-3.5" />
        </button>
      </div>
    </div>
  );
}

// ── Platform-aware new content form ───────────────────────────────────────
function NewContentForm({
  channels,
  pending,
  onSubmit,
}: {
  channels: string[];
  pending: boolean;
  onSubmit: (fd: FormData) => void;
}) {
  const [channel, setChannel] = useState(channels[0] ?? "YouTube");
  const platformStages = getStagesForPlatform(channel);
  const preset = detectPreset(channel);
  const router = useRouter();

  function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);
    onSubmit(fd);
    (e.target as HTMLFormElement).reset();
    setChannel(channels[0] ?? "YouTube");
    router.refresh();
  }

  return (
    <form onSubmit={handleSubmit} className="grid gap-3 sm:grid-cols-2">
      <div className="sm:col-span-2">
        <Input name="title" placeholder="Title or topic idea" required />
      </div>
      <div>
        <Label className="text-xs">
          Platform / Channel {preset && <span className="ml-1">{preset.emoji}</span>}
        </Label>
        <Input
          name="channel"
          list="content-channels"
          className="mt-1"
          placeholder="YouTube, Blog, Podcast, Newsletter…"
          value={channel}
          onChange={(e) => setChannel(e.target.value)}
        />
        <p className="mt-0.5 text-[10px] text-muted-foreground/60">
          Stages adapt automatically to your platform
        </p>
      </div>
      <div>
        <Label className="text-xs">Starting stage</Label>
        <select
          name="stage"
          defaultValue="IDEA"
          className="mt-1 w-full rounded-lg border border-border bg-background px-3 py-2 text-sm focus:border-accent focus:outline-none"
        >
          {platformStages.map((s) => (
            <option key={s} value={s}>
              {getStageLabelForPlatform(s, channel)}
            </option>
          ))}
        </select>
      </div>
      <Button type="submit" disabled={pending} className="gap-1 sm:col-span-2">
        {pending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Plus className="h-4 w-4" />}
        Add to pipeline
      </Button>
    </form>
  );
}
