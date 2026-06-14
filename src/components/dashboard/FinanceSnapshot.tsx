import Link from "next/link";

import { dashboardCardClass } from "@/components/dashboard/dashboard-styles";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { cn } from "@/lib/utils";

export function FinanceSnapshot({
  expenses,
  income,
  net,
}: {
  expenses: number;
  income: number;
  net: number;
}) {
  return (
    <Card className={dashboardCardClass()}>
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle>Money this month</CardTitle>
          <Link href="/finance" className="text-xs font-medium text-accent hover:underline">
            Details
          </Link>
        </div>
      </CardHeader>
      <CardContent className="grid grid-cols-3 gap-3 text-center sm:text-left">
        <div>
          <p className="text-xs text-muted-foreground">In</p>
          <p className="text-lg font-bold text-success">₵{income.toFixed(0)}</p>
        </div>
        <div>
          <p className="text-xs text-muted-foreground">Out</p>
          <p className="text-lg font-bold text-danger">₵{expenses.toFixed(0)}</p>
        </div>
        <div>
          <p className="text-xs text-muted-foreground">Net</p>
          <p className={cn("text-lg font-bold", net >= 0 ? "text-success" : "text-danger")}>
            ₵{net.toFixed(0)}
          </p>
        </div>
      </CardContent>
    </Card>
  );
}
