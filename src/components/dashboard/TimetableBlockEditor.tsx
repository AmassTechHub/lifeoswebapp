"use client";

import { Plus, Trash2 } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  createEmptyBlock,
  WEEKDAYS,
  type TimetableBlock,
  type Weekday,
} from "@/lib/timetable/types";

type TimetableBlockEditorProps = {
  blocks: TimetableBlock[];
  onChange: (blocks: TimetableBlock[]) => void;
};

export function TimetableBlockEditor({ blocks, onChange }: TimetableBlockEditorProps) {
  function updateBlock(index: number, patch: Partial<TimetableBlock>) {
    onChange(blocks.map((block, i) => (i === index ? { ...block, ...patch } : block)));
  }

  function removeBlock(index: number) {
    onChange(blocks.filter((_, i) => i !== index));
  }

  function addBlock() {
    onChange([...blocks, createEmptyBlock()]);
  }

  return (
    <div className="space-y-3">
      {blocks.length === 0 ? (
        <p className="text-sm text-muted-foreground">
          No classes extracted yet. Add a course block manually.
        </p>
      ) : (
        blocks.map((block, index) => (
          <div
            key={`${block.title}-${block.day}-${index}`}
            className="grid gap-2 rounded-lg border border-border/70 bg-background/80 p-3 sm:grid-cols-[1fr_auto_auto_auto_auto]"
          >
            <Input
              value={block.title}
              onChange={(e) => updateBlock(index, { title: e.target.value })}
              placeholder="Course name (e.g. DSA)"
              className="sm:col-span-1"
            />
            <select
              value={block.day}
              onChange={(e) => updateBlock(index, { day: e.target.value as Weekday })}
              className="rounded-lg border border-border bg-background px-3 py-2 text-sm"
            >
              {WEEKDAYS.map((day) => (
                <option key={day} value={day}>
                  {day.slice(0, 3)}
                </option>
              ))}
            </select>
            <div className="flex gap-2">
              <Input
                type="number"
                min={0}
                max={23}
                value={block.hour}
                onChange={(e) => updateBlock(index, { hour: Number(e.target.value) })}
                className="w-16"
                aria-label="Start hour"
              />
              <Input
                type="number"
                min={0}
                max={59}
                value={block.minute}
                onChange={(e) => updateBlock(index, { minute: Number(e.target.value) })}
                className="w-16"
                aria-label="Start minute"
              />
            </div>
            <div className="flex items-center gap-2">
              <Input
                type="number"
                min={30}
                max={240}
                step={15}
                value={block.durationMinutes}
                onChange={(e) =>
                  updateBlock(index, { durationMinutes: Number(e.target.value) })
                }
                className="w-20"
                aria-label="Duration minutes"
              />
              <span className="text-xs text-muted-foreground">min</span>
              <Button
                type="button"
                size="icon"
                variant="ghost"
                className="shrink-0 text-muted-foreground hover:text-danger"
                onClick={() => removeBlock(index)}
                aria-label="Remove block"
              >
                <Trash2 className="h-4 w-4" />
              </Button>
            </div>
          </div>
        ))
      )}
      <Button type="button" size="sm" variant="outline" onClick={addBlock} className="gap-1">
        <Plus className="h-4 w-4" />
        Add course block
      </Button>
    </div>
  );
}
