import Link from "next/link";

import { dashboardCardClass } from "@/components/dashboard/dashboard-styles";
import type { DashboardData } from "@/lib/data/dashboard";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";

export function ProgressOverview({ progress }: { progress: DashboardData["progress"] }) {
  const rows = [
    { label: "Tasks completed", ...progress.tasks },
    { label: "Habits today", ...progress.habits },
    { label: "Study notes", ...progress.study },
    {
      label: progress.finance.label,
      value: Math.max(progress.finance.value, 0),
      total: progress.finance.total,
    },
  ];

  return (
    <Card className={dashboardCardClass()}>
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle>Progress Overview</CardTitle>
          <span className="text-sm text-muted-foreground">Live from your data</span>
        </div>
      </CardHeader>
      <CardContent className="space-y-5">
        {rows.map((item) => {
          const pct = Math.min(100, Math.round((item.value / item.total) * 100));
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
        <p className="text-xs text-muted-foreground">
          <Link href="/learning" className="text-accent hover:underline">
            Open Learning
          </Link>
          {" · "}
          <Link href="/finance" className="text-accent hover:underline">
            Finance
          </Link>
          {" · "}
          <Link href="/habits" className="text-accent hover:underline">
            Habits
          </Link>
        </p>
      </CardContent>
    </Card>
  );
}
