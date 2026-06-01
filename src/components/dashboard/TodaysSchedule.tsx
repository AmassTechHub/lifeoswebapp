import { dashboardCardClass } from "@/components/dashboard/dashboard-styles";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

const schedule = [
  { time: "06:00", label: "Devotion and planning", type: "Personal" },
  { time: "08:00", label: "Software Engineering lecture", type: "Academics" },
  { time: "12:00", label: "Client call with LPG Travels", type: "Clients" },
  { time: "15:00", label: "Life OS coding session", type: "Coding" },
  { time: "18:00", label: "Content Recording", type: "Content" },
  { time: "21:00", label: "Daily Review", type: "Personal" },
];

const typeColors: Record<string, string> = {
  Personal: "bg-secondary/30 text-muted-foreground",
  Academics: "bg-accent/15 text-accent",
  Clients: "bg-warning/15 text-warning",
  Coding: "bg-success/15 text-success",
  Content: "bg-danger/15 text-danger",
};

export function TodaysSchedule() {
  return (
    <Card className={dashboardCardClass()}>
      <CardHeader>
        <CardTitle>Today&apos;s Schedule</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-2">
          {schedule.map((block) => (
            <div
              key={`${block.time}-${block.label}`}
              className="flex items-center gap-4 rounded-lg border border-border/60 px-4 py-3"
            >
              <span className="w-14 shrink-0 text-xs font-medium text-muted-foreground">
                {block.time}
              </span>
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-medium">{block.label}</p>
              </div>
              <span
                className={`shrink-0 rounded-md px-2 py-0.5 text-xs font-medium ${typeColors[block.type]}`}
              >
                {block.type}
              </span>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}
