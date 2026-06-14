"use client";

import { useMemo, useTransition } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Loader2, Plus, Trash2 } from "lucide-react";

import { createCalendarEvent, deleteCalendarEvent } from "@/lib/actions/calendar";
import { eventCategories } from "@/lib/event-categories";
import { formatTime } from "@/lib/date-utils";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { cn } from "@/lib/utils";

type Event = {
  id: string;
  title: string;
  startAt: Date;
  endAt: Date;
  category: string;
  source: string;
};

const categoryColors: Record<string, string> = {
  PERSONAL: "bg-secondary/30 text-muted-foreground",
  ACADEMICS: "bg-accent/15 text-accent",
  CLIENTS: "bg-warning/15 text-warning",
  CODING: "bg-success/15 text-success",
  CONTENT: "bg-danger/15 text-danger",
  CHURCH: "bg-accent/10 text-accent",
  OTHER: "bg-muted text-muted-foreground",
};

export function CalendarPanel({ events }: { events: Event[] }) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const today = useMemo(() => new Date().toISOString().slice(0, 10), []);

  const grouped = useMemo(() => {
    const map = new Map<string, Event[]>();
    for (const e of events) {
      const key = new Date(e.startAt).toISOString().slice(0, 10);
      if (!map.has(key)) map.set(key, []);
      map.get(key)!.push(e);
    }
    return [...map.entries()].sort(([a], [b]) => a.localeCompare(b));
  }, [events]);

  return (
    <div className="space-y-6">
      <Card className="border-border/70 bg-card/80">
        <CardHeader>
          <CardTitle className="text-base">Add event</CardTitle>
        </CardHeader>
        <CardContent>
          <form
            onSubmit={(e) => {
              e.preventDefault();
              startTransition(async () => {
                await createCalendarEvent(new FormData(e.currentTarget));
                (e.target as HTMLFormElement).reset();
                toast.success("Event added");
                router.refresh();
              });
            }}
            className="grid gap-3 sm:grid-cols-2"
          >
            <Input
              name="title"
              placeholder="Event title"
              required
              className="sm:col-span-2"
            />
            <div>
              <Label className="text-xs">Date</Label>
              <Input name="date" type="date" defaultValue={today} className="mt-1" required />
            </div>
            <div>
              <Label className="text-xs">Category</Label>
              <select
                name="category"
                className="mt-1 w-full rounded-lg border border-border bg-background px-3 py-2 text-sm"
              >
                {eventCategories.map((c) => (
                  <option key={c} value={c}>
                    {c}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <Label className="text-xs">Start</Label>
              <Input name="startTime" type="time" defaultValue="09:00" className="mt-1" required />
            </div>
            <div>
              <Label className="text-xs">End</Label>
              <Input name="endTime" type="time" defaultValue="10:00" className="mt-1" required />
            </div>
            <Button type="submit" disabled={pending} className="gap-1 sm:col-span-2">
              {pending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Plus className="h-4 w-4" />}
              Add event
            </Button>
          </form>
        </CardContent>
      </Card>

      {grouped.length === 0 ? (
        <Card className="border-dashed border-border bg-card/50 p-10 text-center">
          <p className="text-sm text-muted-foreground">
            No events this week. Add manually or run Daily Setup on the Planner.
          </p>
        </Card>
      ) : (
        grouped.map(([day, dayEvents]) => (
          <Card key={day} className="border-border/70 bg-card/80">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-semibold">
                {new Date(day + "T12:00:00").toLocaleDateString("en-US", {
                  weekday: "long",
                  month: "long",
                  day: "numeric",
                })}
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              {dayEvents.map((e) => (
                <div
                  key={e.id}
                  className="flex items-center gap-3 rounded-lg border border-border/60 px-4 py-3"
                >
                  <span className="w-24 shrink-0 text-xs text-muted-foreground">
                    {formatTime(new Date(e.startAt))} – {formatTime(new Date(e.endAt))}
                  </span>
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-medium">{e.title}</p>
                    <p className="text-xs text-muted-foreground">{e.source}</p>
                  </div>
                  <span
                    className={cn(
                      "shrink-0 rounded-md px-2 py-0.5 text-xs font-medium",
                      categoryColors[e.category] ?? categoryColors.OTHER
                    )}
                  >
                    {e.category}
                  </span>
                  <button
                    type="button"
                    className="text-muted-foreground hover:text-danger"
                    onClick={() =>
                      startTransition(async () => {
                        await deleteCalendarEvent(e.id);
                        toast.success("Event removed");
                        router.refresh();
                      })
                    }
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>
              ))}
            </CardContent>
          </Card>
        ))
      )}
    </div>
  );
}
