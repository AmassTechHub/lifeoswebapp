"use client";

import { WEEKDAYS, type TimetableBlock } from "@/lib/timetable/types";
import { cn } from "@/lib/utils";

const DAY_SHORT: Record<string, string> = {
  MONDAY: "Mon", TUESDAY: "Tue", WEDNESDAY: "Wed",
  THURSDAY: "Thu", FRIDAY: "Fri", SATURDAY: "Sat", SUNDAY: "Sun",
};

function formatTime(block: TimetableBlock) {
  const h = String(block.hour).padStart(2, "0");
  const m = String(block.minute).padStart(2, "0");
  const endMins = block.hour * 60 + block.minute + block.durationMinutes;
  const eh = String(Math.floor(endMins / 60) % 24).padStart(2, "0");
  const em = String(endMins % 60).padStart(2, "0");
  return `${h}:${m}–${eh}:${em}`;
}

export function TimetableWeekPreview({ blocks }: { blocks: TimetableBlock[] }) {
  const valid = blocks.filter((b) => b.title.trim().length > 0);
  const activeDays = WEEKDAYS.filter((d) => valid.some((b) => b.day === d));

  if (valid.length === 0) return null;

  return (
    <>
      {/* Mobile: vertical day list */}
      <div className="space-y-2 lg:hidden">
        {activeDays.map((day) => {
          const dayBlocks = valid
            .filter((b) => b.day === day)
            .sort((a, b) => a.hour - b.hour || a.minute - b.minute);
          return (
            <div key={day} className="rounded-xl border border-border/60 bg-background/60 p-3">
              <p className="mb-2 text-[10px] font-bold uppercase tracking-widest text-accent">
                {DAY_SHORT[day]}
              </p>
              <div className="space-y-1.5">
                {dayBlocks.map((block, i) => (
                  <div
                    key={i}
                    className="flex items-center gap-2 rounded-lg border border-border/40 bg-card px-2.5 py-2"
                  >
                    <div className="h-1.5 w-1.5 shrink-0 rounded-full bg-accent" />
                    <span className="min-w-0 flex-1 truncate text-xs font-medium text-foreground">
                      {block.title}
                    </span>
                    <span className="shrink-0 text-[10px] text-muted-foreground">
                      {formatTime(block)}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          );
        })}
      </div>

      {/* Desktop: horizontal 7-column grid */}
      <div className="hidden overflow-x-auto rounded-xl border border-border/60 bg-background/50 lg:block">
        <div className="grid min-w-175 grid-cols-7 divide-x divide-border/50">
          {WEEKDAYS.map((day) => {
            const dayBlocks = valid
              .filter((b) => b.day === day)
              .sort((a, b) => a.hour - b.hour || a.minute - b.minute);
            const isToday =
              ["SUNDAY","MONDAY","TUESDAY","WEDNESDAY","THURSDAY","FRIDAY","SATURDAY"][new Date().getDay()] === day;

            return (
              <div key={day} className="min-h-24 p-2">
                <p
                  className={cn(
                    "mb-1.5 text-center text-[10px] font-bold uppercase tracking-widest",
                    isToday ? "text-accent" : "text-muted-foreground/60"
                  )}
                >
                  {DAY_SHORT[day]}
                </p>
                <div className="space-y-1">
                  {dayBlocks.length === 0 ? (
                    <p className="text-center text-[10px] text-muted-foreground/40">—</p>
                  ) : (
                    dayBlocks.map((block, i) => (
                      <div
                        key={i}
                        className="rounded-md border border-accent/20 bg-accent/8 px-1.5 py-1 text-[10px] leading-tight"
                      >
                        <p className="truncate font-semibold text-foreground">{block.title}</p>
                        <p className="text-muted-foreground">{formatTime(block)}</p>
                      </div>
                    ))
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </>
  );
}
