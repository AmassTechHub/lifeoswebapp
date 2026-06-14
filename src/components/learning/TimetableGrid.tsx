"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Clock, Loader2, MapPin, Plus, Trash2, X } from "lucide-react";

import { createCourseSchedule, deleteCourseSchedule } from "@/lib/actions/study";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { cn } from "@/lib/utils";

const DAYS = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];
const HOURS = Array.from({ length: 14 }, (_, i) => i + 7); // 7am–8pm

type Slot = {
  id: string;
  dayOfWeek: number;
  startTime: string;
  endTime: string;
  venue: string | null;
};

type Course = {
  id: string;
  name: string;
  code: string | null;
  color: string;
  scheduleSlots: Slot[];
};

function timeToFraction(t: string) {
  const [h, m] = t.split(":").map(Number);
  return h + m / 60;
}

export function TimetableGrid({ courses }: { courses: Course[] }) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [addSlot, setAddSlot] = useState<{ courseId: string; day: number } | null>(null);

  function handleDelete(id: string) {
    startTransition(async () => {
      const res = await deleteCourseSchedule(id);
      if (res?.error) toast.error(res.error);
      else {
        toast.success("Slot removed");
        router.refresh();
      }
    });
  }

  function handleAdd(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (!addSlot) return;
    const fd = new FormData(e.currentTarget);
    fd.set("courseId", addSlot.courseId);
    fd.set("dayOfWeek", String(addSlot.day));
    startTransition(async () => {
      const res = await createCourseSchedule(fd);
      if (res?.error) toast.error(res.error);
      else {
        toast.success("Slot added");
        setAddSlot(null);
        router.refresh();
      }
    });
  }

  // Flatten all slots with course info
  const allSlots = courses.flatMap((c) =>
    c.scheduleSlots.map((s) => ({ ...s, course: c }))
  );

  return (
    <div className="space-y-4">
      {/* Quick-add row */}
      <div className="flex flex-wrap gap-2">
        {courses.map((c) => (
          <div key={c.id} className="flex items-center gap-1.5">
            <span
              className="h-2.5 w-2.5 rounded-full shrink-0"
              style={{ backgroundColor: c.color }}
            />
            <span className="text-xs font-medium text-muted-foreground">{c.code ?? c.name}</span>
            <button
              type="button"
              onClick={() => setAddSlot({ courseId: c.id, day: 0 })}
              className="inline-flex h-5 w-5 items-center justify-center rounded-full bg-muted text-muted-foreground hover:bg-accent/15 hover:text-accent transition-colors"
            >
              <Plus className="h-3 w-3" />
            </button>
          </div>
        ))}
      </div>

      {/* Grid */}
      <div className="overflow-x-auto rounded-2xl border border-border/70 bg-card/80">
        <div className="min-w-[600px]">
          {/* Header */}
          <div className="grid grid-cols-8 border-b border-border/60">
            <div className="border-r border-border/40 px-2 py-3 text-center text-xs text-muted-foreground" />
            {DAYS.map((d, i) => (
              <div
                key={d}
                className={cn(
                  "border-r border-border/40 px-1 py-3 text-center text-xs font-semibold last:border-r-0",
                  i === new Date().getDay() - 1 ? "text-accent" : "text-muted-foreground"
                )}
              >
                {d}
              </div>
            ))}
          </div>

          {/* Time rows */}
          {HOURS.map((hour) => (
            <div key={hour} className="grid grid-cols-8 border-b border-border/40 last:border-b-0" style={{ minHeight: "52px" }}>
              {/* Time label */}
              <div className="border-r border-border/40 px-2 py-1 text-right text-[10px] text-muted-foreground/60 pt-1 shrink-0">
                {hour % 12 === 0 ? 12 : hour % 12}{hour < 12 ? "am" : "pm"}
              </div>

              {/* Day columns */}
              {DAYS.map((_, dayIdx) => {
                const daySlots = allSlots.filter((s) => {
                  if (s.dayOfWeek !== dayIdx) return false;
                  const start = timeToFraction(s.startTime);
                  const end = timeToFraction(s.endTime);
                  return start >= hour && start < hour + 1;
                });

                return (
                  <div
                    key={dayIdx}
                    className="relative border-r border-border/40 p-0.5 last:border-r-0"
                  >
                    {daySlots.map((s) => {
                      const start = timeToFraction(s.startTime);
                      const end = timeToFraction(s.endTime);
                      const duration = Math.max(end - start, 0.5);
                      return (
                        <div
                          key={s.id}
                          className="group relative rounded-lg px-1.5 py-1 text-[10px] font-medium text-white shadow-sm"
                          style={{
                            backgroundColor: s.course.color,
                            minHeight: `${duration * 48}px`,
                          }}
                        >
                          <p className="truncate leading-tight">{s.course.code ?? s.course.name}</p>
                          <p className="opacity-75 truncate leading-tight">
                            {s.startTime}–{s.endTime}
                          </p>
                          {s.venue && (
                            <p className="opacity-60 truncate leading-tight flex items-center gap-0.5 mt-0.5">
                              <MapPin className="h-2 w-2 shrink-0" />{s.venue}
                            </p>
                          )}
                          <button
                            type="button"
                            onClick={() => handleDelete(s.id)}
                            disabled={pending}
                            className="absolute right-0.5 top-0.5 rounded p-0.5 bg-black/20 opacity-0 group-hover:opacity-100 transition-opacity hover:bg-black/40"
                          >
                            <X className="h-2.5 w-2.5 text-white" />
                          </button>
                        </div>
                      );
                    })}
                  </div>
                );
              })}
            </div>
          ))}
        </div>
      </div>

      {/* Empty state */}
      {allSlots.length === 0 && (
        <p className="text-center text-sm text-muted-foreground py-4">
          Click the <strong>+</strong> next to a course above to add class times.
        </p>
      )}

      {/* Add slot modal */}
      {addSlot && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4 backdrop-blur-sm"
          onClick={(e) => e.target === e.currentTarget && setAddSlot(null)}
        >
          <div className="w-full max-w-sm rounded-2xl border border-border bg-card p-6 shadow-2xl">
            <div className="mb-4 flex items-center justify-between">
              <h3 className="font-semibold text-foreground">
                Add class time for {courses.find((c) => c.id === addSlot.courseId)?.name}
              </h3>
              <button
                type="button"
                onClick={() => setAddSlot(null)}
                className="rounded-lg p-1.5 text-muted-foreground hover:bg-muted"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
            <form onSubmit={handleAdd} className="space-y-4">
              <div className="space-y-1.5">
                <Label className="text-xs">Day</Label>
                <select
                  name="dayOfWeek"
                  defaultValue={addSlot.day}
                  className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm focus:border-accent focus:outline-none focus:ring-2 focus:ring-accent/20"
                >
                  {DAYS.map((d, i) => (
                    <option key={d} value={i}>{d}</option>
                  ))}
                </select>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <Label className="text-xs flex items-center gap-1">
                    <Clock className="h-3 w-3" /> Start
                  </Label>
                  <Input name="startTime" type="time" defaultValue="09:00" required />
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs flex items-center gap-1">
                    <Clock className="h-3 w-3" /> End
                  </Label>
                  <Input name="endTime" type="time" defaultValue="11:00" required />
                </div>
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs flex items-center gap-1">
                  <MapPin className="h-3 w-3" /> Venue (optional)
                </Label>
                <Input name="venue" placeholder="LT1, Block A..." />
              </div>
              <div className="flex gap-2 pt-1">
                <Button type="button" variant="ghost" className="flex-1" onClick={() => setAddSlot(null)}>
                  Cancel
                </Button>
                <Button type="submit" disabled={pending} className="flex-1 gap-1">
                  {pending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Plus className="h-4 w-4" />}
                  Add
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
