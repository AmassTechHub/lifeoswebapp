import Link from "next/link";

import { dashboardCardClass } from "@/components/dashboard/dashboard-styles";
import { formatTime } from "@/lib/date-utils";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { cn } from "@/lib/utils";

type Block = {
  id: string;
  title: string;
  startAt: Date;
  category: string;
};

const typeColors: Record<string, string> = {
  PERSONAL: "bg-secondary/30 text-muted-foreground",
  ACADEMICS: "bg-accent/15 text-accent",
  CLIENTS: "bg-warning/15 text-warning",
  CODING: "bg-success/15 text-success",
  CONTENT: "bg-danger/15 text-danger",
  CHURCH: "bg-accent/10 text-accent",
  OTHER: "bg-muted text-muted-foreground",
};

export function TodaysSchedule({ schedule }: { schedule: Block[] }) {
  return (
    <Card className={dashboardCardClass()}>
      <CardHeader>
        <CardTitle>Today&apos;s Schedule</CardTitle>
      </CardHeader>
      <CardContent>
        {schedule.length === 0 ? (
          <p className="text-sm text-muted-foreground">
            No blocks yet.{" "}
            <Link href="/planner" className="font-medium text-accent hover:underline">
              Run daily setup
            </Link>{" "}
            on the Planner.
          </p>
        ) : (
          <div className="space-y-2">
            {schedule.map((block) => (
              <div
                key={block.id}
                className="flex items-center gap-2 rounded-lg border border-border/50 bg-muted/10 px-3 py-3 transition-colors hover:border-accent/25 hover:bg-accent/5 sm:gap-4 sm:px-4"
              >
                <span className="w-12 shrink-0 text-xs font-medium text-muted-foreground sm:w-14">
                  {formatTime(new Date(block.startAt))}
                </span>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-medium">{block.title}</p>
                </div>
                <span
                  className={cn(
                    "hidden shrink-0 rounded-md px-2 py-0.5 text-xs font-medium sm:inline-block",
                    typeColors[block.category] ?? typeColors.OTHER
                  )}
                >
                  {block.category}
                </span>
                <span
                  className={cn(
                    "shrink-0 rounded-md px-1.5 py-0.5 text-[10px] font-medium sm:hidden",
                    typeColors[block.category] ?? typeColors.OTHER
                  )}
                >
                  {block.category.slice(0, 3)}
                </span>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
