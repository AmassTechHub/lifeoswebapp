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
                className="flex items-center gap-4 rounded-lg border border-border/60 px-4 py-3"
              >
                <span className="w-14 shrink-0 text-xs font-medium text-muted-foreground">
                  {formatTime(new Date(block.startAt))}
                </span>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-medium">{block.title}</p>
                </div>
                <span
                  className={cn(
                    "shrink-0 rounded-md px-2 py-0.5 text-xs font-medium",
                    typeColors[block.category] ?? typeColors.OTHER
                  )}
                >
                  {block.category}
                </span>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
