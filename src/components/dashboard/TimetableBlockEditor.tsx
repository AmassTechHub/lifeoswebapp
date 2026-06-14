"use client";

import { Clock, MapPin, Plus, Trash2 } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  assignColor,
  createEmptyBlock,
  WEEKDAYS,
  type TimetableBlock,
  type Weekday,
} from "@/lib/timetable/types";

const DURATION_OPTIONS = [
  { label: "30 min", value: 30 },
  { label: "45 min", value: 45 },
  { label: "55 min", value: 55 },
  { label: "1 hour", value: 60 },
  { label: "1h 15m", value: 75 },
  { label: "1h 30m", value: 90 },
  { label: "2 hours", value: 120 },
  { label: "3 hours", value: 180 },
  { label: "4h 25m", value: 265 },
];

const selectClass =
  "rounded-lg border border-border bg-background px-2.5 py-2 text-sm text-foreground focus:border-accent focus:outline-none focus:ring-2 focus:ring-accent/20";

type Props = {
  blocks: TimetableBlock[];
  onChange: (blocks: TimetableBlock[]) => void;
};

export function TimetableBlockEditor({ blocks, onChange }: Props) {
  function update(index: number, patch: Partial<TimetableBlock>) {
    onChange(blocks.map((b, i) => (i === index ? { ...b, ...patch } : b)));
  }

  function remove(index: number) {
    onChange(blocks.filter((_, i) => i !== index));
  }

  function setTime(index: number, value: string) {
    const [h, m] = value.split(":").map(Number);
    if (!isNaN(h) && !isNaN(m)) update(index, { hour: h, minute: m });
  }

  function setDuration(index: number, value: string) {
    const num = Number(value);
    if (!isNaN(num) && num >= 15) update(index, { durationMinutes: num });
  }

  return (
    <div className="space-y-2">
      {blocks.length === 0 ? (
        <p className="rounded-xl border border-dashed border-border/60 py-6 text-center text-sm text-muted-foreground">
          No blocks yet. Add a course manually.
        </p>
      ) : (
        blocks.map((block, index) => {
          const color = assignColor(index);
          const timeValue = `${String(block.hour).padStart(2, "0")}:${String(block.minute).padStart(2, "0")}`;
          const durationIsPreset = DURATION_OPTIONS.some((o) => o.value === block.durationMinutes);

          return (
            <div
              key={`${block.title}-${block.day}-${index}`}
              className="rounded-xl border border-border/60 bg-card p-3 shadow-sm"
            >
              {/* Row 1: color dot + name + delete */}
              <div className="flex items-center gap-2">
                <span
                  className="h-2.5 w-2.5 shrink-0 rounded-full"
                  style={{ backgroundColor: color }}
                />
                <Input
                  value={block.title}
                  onChange={(e) => update(index, { title: e.target.value })}
                  placeholder="Course name"
                  className="flex-1 h-8 text-sm"
                />
                <Button
                  type="button"
                  size="icon"
                  variant="ghost"
                  className="h-8 w-8 shrink-0 text-muted-foreground hover:text-danger"
                  onClick={() => remove(index)}
                  aria-label="Remove block"
                >
                  <Trash2 className="h-3.5 w-3.5" />
                </Button>
              </div>

              {/* Row 2: day + time + duration */}
              <div className="mt-2 flex flex-wrap items-center gap-2">
                <select
                  value={block.day}
                  onChange={(e) => update(index, { day: e.target.value as Weekday })}
                  className={selectClass}
                  aria-label="Day"
                >
                  {WEEKDAYS.map((day) => (
                    <option key={day} value={day}>
                      {day.charAt(0) + day.slice(1, 3).toLowerCase()}
                    </option>
                  ))}
                </select>

                <div className="flex items-center gap-1.5">
                  <Clock className="h-3.5 w-3.5 shrink-0 text-muted-foreground" />
                  <input
                    type="time"
                    value={timeValue}
                    onChange={(e) => setTime(index, e.target.value)}
                    className={selectClass}
                    aria-label="Start time"
                  />
                </div>

                <select
                  value={durationIsPreset ? block.durationMinutes : "custom"}
                  onChange={(e) => {
                    if (e.target.value !== "custom") setDuration(index, e.target.value);
                  }}
                  className={selectClass}
                  aria-label="Duration"
                >
                  {DURATION_OPTIONS.map((o) => (
                    <option key={o.value} value={o.value}>
                      {o.label}
                    </option>
                  ))}
                  {!durationIsPreset && (
                    <option value="custom">{block.durationMinutes} min</option>
                  )}
                </select>
              </div>

              {/* Row 3: venue (optional, collapsed until filled) */}
              <div className="mt-2 flex items-center gap-1.5">
                <MapPin className="h-3 w-3 shrink-0 text-muted-foreground/50" />
                <Input
                  value={block.venue ?? ""}
                  onChange={(e) => update(index, { venue: e.target.value || undefined })}
                  placeholder="Venue (optional)"
                  className="h-7 text-xs text-muted-foreground placeholder:text-muted-foreground/40"
                />
              </div>
            </div>
          );
        })
      )}

      <Button
        type="button"
        size="sm"
        variant="outline"
        onClick={() => onChange([...blocks, createEmptyBlock()])}
        className="mt-1 w-full gap-1.5"
      >
        <Plus className="h-3.5 w-3.5" />
        Add course block
      </Button>
    </div>
  );
}
