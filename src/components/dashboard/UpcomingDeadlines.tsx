import { dashboardCardClass } from "@/components/dashboard/dashboard-styles";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

const deadlines = [
  {
    title: "Data Structures Assignment",
    category: "Academics",
    due: "Today, 11:59 PM",
    variant: "danger" as const,
  },
  {
    title: "LPG Travels Website Review",
    category: "Clients",
    due: "Tomorrow",
    variant: "warning" as const,
  },
  {
    title: "Greene Consult Proposal",
    category: "Clients",
    due: "Jun 2",
    variant: "default" as const,
  },
  {
    title: "Team sync with Startup Genesis",
    category: "Business",
    due: "Jun 3",
    variant: "default" as const,
  },
];

export function UpcomingDeadlines() {
  return (
    <Card className={dashboardCardClass()}>
      <CardHeader>
        <CardTitle>Upcoming Deadlines</CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        {deadlines.map((item) => (
          <div
            key={item.title}
            className="flex items-start justify-between gap-3 rounded-lg border border-border/60 px-4 py-3"
          >
            <div>
              <p className="text-sm font-medium">{item.title}</p>
              <p className="mt-1 text-xs text-muted-foreground">{item.due}</p>
            </div>
            <Badge variant={item.variant}>{item.category}</Badge>
          </div>
        ))}
      </CardContent>
    </Card>
  );
}
