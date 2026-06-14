"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import {
  ArrowDownLeft,
  ArrowUpRight,
  DollarSign,
  Loader2,
  Plus,
  Trash2,
  TrendingDown,
  TrendingUp,
  Wallet,
} from "lucide-react";

import { createExpense, createIncome, deleteExpense } from "@/lib/actions/finance";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { cn } from "@/lib/utils";

type Summary = {
  expenses: {
    id: string;
    amount: number;
    category: string;
    description: string | null;
    paymentMethod?: string;
    date: Date;
  }[];
  incomes: { id: string; amount: number; source: string; description: string | null; date: Date }[];
  totalExpenses: number;
  totalIncome: number;
  net: number;
  byCategory: [string, number][];
};

type DialogType = "expense" | "income" | null;

export function FinancePanel({ data: initial }: { data: Summary }) {
  const router = useRouter();
  const [data, setData] = useState(initial);
  const [dialog, setDialog] = useState<DialogType>(null);
  const [pending, startTransition] = useTransition();

  async function handleAddExpense(fd: FormData) {
    const res = await createExpense(fd);
    if (res?.error) {
      toast.error(res.error);
    } else {
      toast.success("Expense logged");
      setDialog(null);
      router.refresh();
    }
  }

  async function handleAddIncome(fd: FormData) {
    const res = await createIncome(fd);
    if (res?.error) {
      toast.error(res.error);
    } else {
      toast.success("Income logged");
      setDialog(null);
      router.refresh();
    }
  }

  async function handleDeleteExpense(id: string, category: string) {
    setData((prev) => ({
      ...prev,
      expenses: prev.expenses.filter((e) => e.id !== id),
      totalExpenses: prev.totalExpenses - (prev.expenses.find((e) => e.id === id)?.amount ?? 0),
    }));
    startTransition(async () => {
      const res = await deleteExpense(id);
      if (res?.error) {
        toast.error("Failed to delete");
        router.refresh();
      } else {
        toast.success(`${category} expense removed`);
        router.refresh();
      }
    });
  }

  const netPositive = data.net >= 0;

  return (
    <div className="space-y-6">
      {/* Stats row */}
      <div className="grid gap-4 sm:grid-cols-3">
        <StatCard
          label="Income this month"
          value={`₵${data.totalIncome.toFixed(2)}`}
          icon={<TrendingUp className="h-5 w-5 text-success" />}
          color="text-success"
          bg="bg-success/10"
        />
        <StatCard
          label="Expenses this month"
          value={`₵${data.totalExpenses.toFixed(2)}`}
          icon={<TrendingDown className="h-5 w-5 text-danger" />}
          color="text-danger"
          bg="bg-danger/10"
        />
        <StatCard
          label="Net balance"
          value={`${netPositive ? "+" : ""}₵${data.net.toFixed(2)}`}
          icon={<Wallet className={cn("h-5 w-5", netPositive ? "text-success" : "text-danger")} />}
          color={netPositive ? "text-success" : "text-danger"}
          bg={netPositive ? "bg-success/10" : "bg-danger/10"}
        />
      </div>

      {/* Actions */}
      <div className="flex gap-3">
        <Button className="gap-2 flex-1 sm:flex-none" onClick={() => setDialog("expense")}>
          <ArrowUpRight className="h-4 w-4" />
          Log expense
        </Button>
        <Button variant="secondary" className="gap-2 flex-1 sm:flex-none" onClick={() => setDialog("income")}>
          <ArrowDownLeft className="h-4 w-4" />
          Log income
        </Button>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        {/* Spending by category */}
        {data.byCategory.length > 0 && (
          <Card className="border-border/70 bg-card/80">
            <CardHeader>
              <CardTitle className="text-base">Spending by category</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              {data.byCategory.map(([cat, amt]) => {
                const pct = data.totalExpenses > 0 ? (amt / data.totalExpenses) * 100 : 0;
                return (
                  <div key={cat} className="space-y-1">
                    <div className="flex justify-between text-sm">
                      <span className="text-muted-foreground">{cat}</span>
                      <span className="font-semibold">₵{amt.toFixed(2)}</span>
                    </div>
                    <div className="h-1.5 w-full rounded-full bg-muted overflow-hidden">
                      <div
                        className="h-full rounded-full bg-accent transition-all duration-500"
                        style={{ width: `${pct}%` }}
                      />
                    </div>
                  </div>
                );
              })}
            </CardContent>
          </Card>
        )}

        {/* Recent expenses */}
        <Card className="border-border/70 bg-card/80">
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle className="text-base">Recent expenses</CardTitle>
              {data.expenses.length > 0 && (
                <span className="text-xs text-muted-foreground">{data.expenses.length} this month</span>
              )}
            </div>
          </CardHeader>
          <CardContent>
            {data.expenses.length === 0 ? (
              <div className="py-8 text-center">
                <DollarSign className="mx-auto h-8 w-8 text-muted-foreground/30" />
                <p className="mt-2 text-sm text-muted-foreground">No expenses this month</p>
              </div>
            ) : (
              <div className="space-y-1.5">
                {data.expenses.slice(0, 8).map((e) => (
                  <div
                    key={e.id}
                    className="group flex items-center justify-between rounded-xl px-3 py-2.5 transition-colors hover:bg-muted/50"
                  >
                    <div className="min-w-0">
                      <p className="text-sm font-medium truncate">{e.category}</p>
                      {e.description && (
                        <p className="text-xs text-muted-foreground truncate">{e.description}</p>
                      )}
                    </div>
                    <div className="flex items-center gap-3 shrink-0">
                      <span className="font-semibold text-danger text-sm">₵{e.amount.toFixed(2)}</span>
                      <button
                        type="button"
                        onClick={() => handleDeleteExpense(e.id, e.category)}
                        className="rounded-lg p-1 text-transparent transition-all group-hover:text-muted-foreground/40 hover:text-danger! hover:bg-danger/10"
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Add Expense Dialog */}
      <Dialog open={dialog === "expense"} onOpenChange={(v) => !v && setDialog(null)}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>Log expense</DialogTitle>
          </DialogHeader>
          <form
            onSubmit={(e) => {
              e.preventDefault();
              handleAddExpense(new FormData(e.currentTarget));
            }}
            className="space-y-4"
          >
            <div className="space-y-1.5">
              <Label>Amount (₵)</Label>
              <Input name="amount" type="number" step="0.01" min="0" placeholder="0.00" required autoFocus />
            </div>
            <div className="space-y-1.5">
              <Label>Category</Label>
              <Input name="category" placeholder="Food, Transport, Data, Books..." required />
            </div>
            <div className="space-y-1.5">
              <Label>Note (optional)</Label>
              <Input name="description" placeholder="What was this for?" />
            </div>
            <div className="space-y-1.5">
              <Label>Payment method</Label>
              <select
                name="paymentMethod"
                defaultValue="CASH"
                className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm focus:border-accent focus:outline-none focus:ring-2 focus:ring-accent/20"
              >
                <option value="CASH">Cash</option>
                <option value="MOMO">MoMo</option>
                <option value="CARD">Card</option>
                <option value="BANK">Bank transfer</option>
              </select>
            </div>
            <DialogFooter>
              <Button type="button" variant="ghost" onClick={() => setDialog(null)}>Cancel</Button>
              <Button type="submit" disabled={pending} className="gap-2">
                {pending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Plus className="h-4 w-4" />}
                Add expense
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Add Income Dialog */}
      <Dialog open={dialog === "income"} onOpenChange={(v) => !v && setDialog(null)}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>Log income</DialogTitle>
          </DialogHeader>
          <form
            onSubmit={(e) => {
              e.preventDefault();
              handleAddIncome(new FormData(e.currentTarget));
            }}
            className="space-y-4"
          >
            <div className="space-y-1.5">
              <Label>Amount (₵)</Label>
              <Input name="amount" type="number" step="0.01" min="0" placeholder="0.00" required autoFocus />
            </div>
            <div className="space-y-1.5">
              <Label>Source</Label>
              <Input name="source" placeholder="Client payment, allowance, side gig..." required />
            </div>
            <div className="space-y-1.5">
              <Label>Note (optional)</Label>
              <Input name="description" placeholder="Any extra details" />
            </div>
            <DialogFooter>
              <Button type="button" variant="ghost" onClick={() => setDialog(null)}>Cancel</Button>
              <Button type="submit" disabled={pending} variant="secondary" className="gap-2">
                {pending ? <Loader2 className="h-4 w-4 animate-spin" /> : <ArrowDownLeft className="h-4 w-4" />}
                Add income
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}

function StatCard({
  label,
  value,
  icon,
  color,
  bg,
}: {
  label: string;
  value: string;
  icon: React.ReactNode;
  color: string;
  bg: string;
}) {
  return (
    <Card className="border-border/70 bg-card/80">
      <CardContent className="flex items-center gap-4 pt-6">
        <div className={cn("flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl", bg)}>
          {icon}
        </div>
        <div>
          <p className="text-xs text-muted-foreground">{label}</p>
          <p className={cn("text-2xl font-bold tracking-tight", color)}>{value}</p>
        </div>
      </CardContent>
    </Card>
  );
}
