import { dashboardCardClass } from "@/components/dashboard/dashboard-styles";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
const weeklyProgress = [
  { label: "Tasks completed", value: 18, total: 24 },
  { label: "Habits streak", value: 5, total: 7 },
  { label: "Learning hours", value: 8, total: 12 },
  { label: "Content published", value: 2, total: 3 },
];

export function ProgressOverview() {
  return (
    <Card className={dashboardCardClass()}>
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle>Progress Overview</CardTitle>
          <span className="text-sm text-muted-foreground">This week</span>
        </div>
      </CardHeader>
      <CardContent className="space-y-5">
        {weeklyProgress.map((item) => {
          const pct = Math.round((item.value / item.total) * 100);
          return (
            <div key={item.label} className="space-y-2">
              <div className="flex items-center justify-between text-sm">
                <span className="text-muted-foreground">{item.label}</span>
                <span className="font-medium">
                  {item.value}/{item.total}
                </span>
              </div>
              <Progress value={pct} />
            </div>
          );
        })}
      </CardContent>
    </Card>
  );
}
