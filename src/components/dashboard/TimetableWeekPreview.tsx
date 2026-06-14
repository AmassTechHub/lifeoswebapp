"use client";

import { WEEKDAYS, type TimetableBlock } from "@/lib/timetable/types";
import { cn } from "@/lib/utils";

function formatSlot(block: TimetableBlock) {
  const h = String(block.hour).padStart(2, "0");
  const m = String(block.minute).padStart(2, "0");
  return `${h}:${m}`;
}

export function TimetableWeekPreview({ blocks }: { blocks: TimetableBlock[] }) {
  const valid = blocks.filter((b) => b.title.trim().length > 0);

  return (
    <div className="overflow-x-auto rounded-xl border border-border/70 bg-background/50">
      <div className="grid min-w-[640px] grid-cols-7 divide-x divide-border/60">
        {WEEKDAYS.map((day) => {
          const dayBlocks = valid
            .filter((b) => b.day === day)
            .sort((a, b) => a.hour - b.hour || a.minute - b.minute);

          return (
            <div key={day} className="min-h-28 p-2">
              <p className="mb-2 text-center text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">
                {day.slice(0, 3)}
              </p>
              <div className="space-y-1.5">
                {dayBlocks.length === 0 ? (
                  <p className="text-center text-[10px] text-muted-foreground/70">Free</p>
                ) : (
                  dayBlocks.map((block, index) => (
                    <div
                      key={`${day}-${block.title}-${index}`}
                      className={cn(
                        "rounded-md border border-accent/20 bg-accent/10 px-1.5 py-1",
                        "text-[10px] leading-tight text-foreground"
                      )}
                    >
                      <p className="font-medium">{block.title}</p>
                      <p className="text-muted-foreground">
                        {formatSlot(block)} · {block.durationMinutes}m
                      </p>
                    </div>
                  ))
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
