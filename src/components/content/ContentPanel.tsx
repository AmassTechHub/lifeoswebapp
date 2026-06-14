"use client";

import { useTransition } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { ChevronRight, Loader2, Plus, Trash2, Video } from "lucide-react";

import {
  createContentItem,
  deleteContentItem,
  updateContentStage,
} from "@/lib/actions/content";
import { contentStageLabels, contentStages } from "@/lib/content-stages";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { cn } from "@/lib/utils";

type ContentItem = {
  id: string;
  title: string;
  channel: string;
  stage: string;
  updatedAt: Date;
};

const CHANNELS = [
  "AmassTechHub",
  "Startup Genesis",
  "Beyond The Algorithm",
  "Personal",
  "General",
];

export function ContentPanel({ items }: { items: ContentItem[] }) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();

  const byStage = contentStages.map((stage) => ({
    stage,
    label: contentStageLabels[stage],
    items: items.filter((i) => i.stage === stage),
  }));

  return (
    <div className="space-y-6">
      <div className="rounded-2xl border border-accent/20 bg-accent/5 p-4 sm:p-5">
        <div className="flex items-start gap-3">
          <Video className="mt-0.5 h-5 w-5 shrink-0 text-accent" />
          <div>
            <p className="font-semibold text-foreground">Content pipeline</p>
            <p className="mt-1 text-sm text-muted-foreground">
              Ideas → script → record → edit → publish. Plan every video in one place
              instead of scattered notes and DMs.
            </p>
          </div>
        </div>
      </div>

      <Card className="border-border/70 bg-card/80">
        <CardHeader>
          <CardTitle className="text-base">New piece of content</CardTitle>
        </CardHeader>
        <CardContent>
          <form
            onSubmit={(e) => {
              e.preventDefault();
              startTransition(async () => {
                await createContentItem(new FormData(e.currentTarget));
                (e.target as HTMLFormElement).reset();
                toast.success("Added to pipeline");
                router.refresh();
              });
            }}
            className="grid gap-3 sm:grid-cols-2"
          >
            <div className="sm:col-span-2">
              <Input name="title" placeholder="Video title or topic" required />
            </div>
            <div>
              <Label className="text-xs">Channel</Label>
              <select
                name="channel"
                className="mt-1 w-full rounded-lg border border-border bg-background px-3 py-2 text-sm"
                defaultValue="AmassTechHub"
              >
                {CHANNELS.map((c) => (
                  <option key={c} value={c}>
                    {c}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <Label className="text-xs">Stage</Label>
              <select
                name="stage"
                className="mt-1 w-full rounded-lg border border-border bg-background px-3 py-2 text-sm"
                defaultValue="IDEA"
              >
                {contentStages.map((s) => (
                  <option key={s} value={s}>
                    {contentStageLabels[s]}
                  </option>
                ))}
              </select>
            </div>
            <Button type="submit" disabled={pending} className="gap-1 sm:col-span-2">
              {pending ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Plus className="h-4 w-4" />
              )}
              Add to pipeline
            </Button>
          </form>
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
}: {
  item: ContentItem;
  onAdvance: (stage: string) => void;
  onDelete: () => void;
}) {
  const idx = contentStages.indexOf(item.stage as (typeof contentStages)[number]);
  const next =
    idx >= 0 && idx < contentStages.length - 1 ? contentStages[idx + 1] : null;

  return (
    <div className="rounded-lg border border-border/60 bg-background/50 p-3">
      <p className="text-sm font-medium leading-snug">{item.title}</p>
      <p className="mt-1 text-xs text-muted-foreground">{item.channel}</p>
      <div className="mt-2 flex items-center justify-between gap-1">
        {next ? (
          <button
            type="button"
            onClick={() => onAdvance(next)}
            className={cn(
              "inline-flex items-center gap-0.5 text-xs font-medium text-accent hover:underline"
            )}
          >
            Move to {contentStageLabels[next]}
            <ChevronRight className="h-3 w-3" />
          </button>
        ) : (
          <span className="text-xs text-success">Live</span>
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
