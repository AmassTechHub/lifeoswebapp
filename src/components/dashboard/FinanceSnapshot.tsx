import Link from "next/link";
import { TrendingDown, TrendingUp, Wallet } from "lucide-react";

import { dashboardCardClass } from "@/components/dashboard/dashboard-styles";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { formatMoney } from "@/lib/currency";
import { cn } from "@/lib/utils";

export function FinanceSnapshot({
  expenses,
  income,
  net,
  currency = "GHS",
}: {
  expenses: number;
  income: number;
  net: number;
  currency?: string;
}) {
  const netPositive = net >= 0;
  const fm = (v: number) => formatMoney(Math.abs(v), currency, { decimals: 0 });
  const stats = [
    { label: "Income",   value: income,   icon: TrendingUp,  color: "text-success", bg: "bg-success/10" },
    { label: "Expenses", value: expenses, icon: TrendingDown, color: "text-danger",  bg: "bg-danger/10" },
    {
      label: "Net",
      value: net,
      icon: Wallet,
      color: netPositive ? "text-success" : "text-danger",
      bg:    netPositive ? "bg-success/10" : "bg-danger/10",
    },
  ];

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
      <CardContent className="grid grid-cols-3 gap-2">
        {stats.map(({ label, value, icon: Icon, color, bg }) => (
          <div
            key={label}
            className="rounded-lg border border-border/50 bg-muted/10 px-2 py-2.5 text-center transition-colors hover:border-accent/25 hover:bg-accent/5"
          >
            <div className={cn("mx-auto mb-1.5 flex h-7 w-7 items-center justify-center rounded-full", bg)}>
              <Icon className={cn("h-3.5 w-3.5", color)} />
            </div>
            <p className="text-[10px] text-muted-foreground">{label}</p>
            <p className={cn("text-base font-bold tabular-nums", color)}>
              {value < 0 ? "-" : ""}{fm(value)}
            </p>
          </div>
        ))}
      </CardContent>
    </Card>
  );
}
