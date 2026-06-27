import Link from "next/link";
import { Brain, Flame, GraduationCap, Layers, Play } from "lucide-react";
import { cn } from "@/lib/utils";

export type StudyStatsWidgetProps = {
  flashcardsDue: number;
  coursesToday: {
    id: string;
    name: string;
    code: string | null;
    color: string;
    startTime: string;
    endTime: string;
    venue: string | null;
  }[];
  streak: number;
  totalMinutesThisWeek: number;
};

function fmtTime(hhmm: string): string {
  const [h, m] = hhmm.split(":").map(Number);
  const period = h >= 12 ? "pm" : "am";
  const displayH = h % 12 || 12;
  return `${displayH}:${String(m).padStart(2, "0")}${period}`;
}

export function StudyStatsWidget({
  flashcardsDue,
  coursesToday,
  streak,
  totalMinutesThisWeek,
}: StudyStatsWidgetProps) {
  const hoursThisWeek = Math.floor(totalMinutesThisWeek / 60);
  const minsThisWeek = totalMinutesThisWeek % 60;

  return (
    <div className="rounded-xl border border-border/40 bg-card/40 p-3">
      {/* Header */}
      <div className="mb-2.5 flex items-center justify-between">
        <div className="flex items-center gap-1.5">
          <GraduationCap className="h-3.5 w-3.5 text-emerald-400" />
          <span className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground/50">
            Study · Today
          </span>
        </div>
        <Link
          href="/learning"
          className="text-[10px] text-muted-foreground/40 hover:text-accent transition-colors"
        >
          Open hub →
        </Link>
      </div>

      <div className="space-y-2">
        {/* Stats row */}
        <div className="grid grid-cols-3 gap-2">
          <div className={cn(
            "flex flex-col items-center justify-center rounded-lg border px-2 py-2.5",
            flashcardsDue > 0
              ? "border-amber-500/30 bg-amber-500/8"
              : "border-border/40 bg-background/40"
          )}>
            <Layers className={cn("h-4 w-4 mb-1", flashcardsDue > 0 ? "text-amber-400" : "text-muted-foreground/40")} />
            <p className={cn("text-base font-bold tabular-nums", flashcardsDue > 0 ? "text-amber-400" : "text-muted-foreground/50")}>
              {flashcardsDue}
            </p>
            <p className="text-[9px] text-muted-foreground/50 font-medium">cards due</p>
          </div>

          <div className="flex flex-col items-center justify-center rounded-lg border border-border/40 bg-background/40 px-2 py-2.5">
            <Flame className={cn("h-4 w-4 mb-1", streak > 0 ? "text-orange-400" : "text-muted-foreground/40")} />
            <p className={cn("text-base font-bold tabular-nums", streak > 0 ? "text-orange-400" : "text-muted-foreground/50")}>
              {streak}
            </p>
            <p className="text-[9px] text-muted-foreground/50 font-medium">day streak</p>
          </div>

          <div className="flex flex-col items-center justify-center rounded-lg border border-border/40 bg-background/40 px-2 py-2.5">
            <Brain className="h-4 w-4 mb-1 text-muted-foreground/40" />
            <p className="text-base font-bold tabular-nums text-muted-foreground/70">
              {hoursThisWeek > 0 ? `${hoursThisWeek}h` : `${minsThisWeek}m`}
            </p>
            <p className="text-[9px] text-muted-foreground/50 font-medium">this week</p>
          </div>
        </div>

        {/* Classes today */}
        {coursesToday.length > 0 ? (
          <div className="space-y-1">
            <p className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground/40 px-0.5">
              Classes today
            </p>
            {coursesToday.map((c) => (
              <Link
                key={`${c.id}-${c.startTime}`}
                href="/learning"
                className="flex items-center gap-2.5 rounded-lg border border-border/30 bg-background/30 px-3 py-2 hover:border-accent/20 hover:bg-accent/5 transition-colors"
              >
                <span
                  className="h-2 w-2 shrink-0 rounded-full"
                  style={{ backgroundColor: c.color }}
                />
                <span className="min-w-0 flex-1 truncate text-xs font-medium text-foreground">{c.name}</span>
                {c.venue && (
                  <span className="shrink-0 text-[10px] text-muted-foreground/40 hidden sm:block">{c.venue}</span>
                )}
                <span className="shrink-0 text-[10px] font-medium tabular-nums text-muted-foreground/60">
                  {fmtTime(c.startTime)}
                </span>
              </Link>
            ))}
          </div>
        ) : (
          <p className="px-0.5 text-[11px] text-muted-foreground/40">No classes scheduled today.</p>
        )}

        {/* Quick action */}
        {flashcardsDue > 0 && (
          <Link
            href="/learning"
            className="flex w-full items-center justify-center gap-1.5 rounded-lg bg-amber-500/10 border border-amber-500/20 py-2 text-xs font-semibold text-amber-400 transition-colors hover:bg-amber-500/20"
          >
            <Play className="h-3 w-3" />
            Review {flashcardsDue} flashcard{flashcardsDue !== 1 ? "s" : ""} due
          </Link>
        )}
      </div>
    </div>
  );
}
