import Link from "next/link";

import { dashboardCardClass } from "@/components/dashboard/dashboard-styles";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

type Deadline = {
  id: string;
  title: string;
  category: string;
  due: string;
  variant: "danger" | "warning" | "default";
  href: string;
};

export function UpcomingDeadlines({ deadlines }: { deadlines: Deadline[] }) {
  return (
    <Card className={dashboardCardClass()}>
      <CardHeader>
        <CardTitle>Upcoming Deadlines</CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        {deadlines.length === 0 ? (
          <p className="text-sm text-muted-foreground">
            No deadlines. Add tasks with due dates or{" "}
            <Link href="/clients" className="text-accent hover:underline">
              client deliverables
            </Link>
            .
          </p>
        ) : (
          deadlines.map((item) => (
            <Link
              key={item.id}
              href={item.href}
              className="flex items-start justify-between gap-3 rounded-lg border border-border/50 bg-muted/10 px-4 py-3 transition-colors hover:border-accent/25 hover:bg-accent/5"
            >
              <div>
                <p className="text-sm font-medium">{item.title}</p>
                <p className="mt-1 text-xs text-muted-foreground">{item.due}</p>
              </div>
              <Badge variant={item.variant}>{item.category}</Badge>
            </Link>
          ))
        )}
      </CardContent>
    </Card>
  );
}
