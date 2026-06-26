"use client";

import { useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import {
  ArrowDownLeft,
  ArrowUpRight,
  Check,
  CheckCircle2,
  Clock,
  DollarSign,
  Loader2,
  PiggyBank,
  Plus,
  RotateCcw,
  Smartphone,
  Sparkles,
  Trash2,
  TrendingDown,
  TrendingUp,
  Upload,
  Wallet,
  X,
  XCircle,
} from "lucide-react";

import { createExpense, createIncome, deleteExpense } from "@/lib/actions/finance";
import { BudgetPlanner } from "@/components/finance/BudgetPlanner";
import { formatMoney } from "@/lib/currency";
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

type MonthData = { month: string; year: number; total: number };

type BudgetRow = {
  id: string;
  name: string;
  monthlyLimit: number;
  emoji: string;
};

type SavingsGoal = {
  id: string;
  name: string;
  targetAmount: number;
  currentAmount: number;
  targetDate: Date | null;
  emoji: string;
};

type ParsedRow = {
  date: string;
  description: string;
  amount: number;
  category: string;
};

type MoMoSendState =
  | { phase: "idle" }
  | { phase: "sending" }
  | { phase: "polling"; referenceId: string }
  | { phase: "success"; amount: number; recipient: string }
  | { phase: "error"; message: string };

type DialogType = "expense" | "income" | "csv" | "momo" | null;
type Tab = "overview" | "budget" | "insights";

const CATEGORY_KEYWORDS: Array<[string, string[]]> = [
  ["Transport", ["uber", "bolt", "trotro", "bus", "taxi", "fuel", "petrol", "transport", "ride"]],
  ["Food", ["food", "eat", "restaurant", "lunch", "dinner", "breakfast", "cafe", "canteen", "kfc", "pizza", "jollof", "waakye", "rice", "chicken"]],
  ["Data & Airtime", ["mtn", "vodafone", "airteltigo", "telecel", "data", "recharge", "airtime", "bundle", "credit"]],
  ["Shopping", ["shoprite", "melcom", "jumia", "shopping", "market", "store", "mall", "supermarket", "clothes"]],
  ["Education", ["school", "book", "library", "printing", "photocopy", "lecture", "course", "tuition", "exam"]],
  ["Health", ["hospital", "pharmacy", "clinic", "drugs", "medicine", "doctor", "health"]],
  ["Utilities", ["electricity", "water", "ecg", "gwcl", "internet", "wifi", "bill"]],
];

function guessCategory(desc: string): string {
  const lower = desc.toLowerCase();
  for (const [cat, kws] of CATEGORY_KEYWORDS) {
    if (kws.some((kw) => lower.includes(kw))) return cat;
  }
  return "Other";
}

function parseCSVLine(line: string): string[] {
  const result: string[] = [];
  let cur = "";
  let inQ = false;
  for (const ch of line) {
    if (ch === '"') { inQ = !inQ; continue; }
    if (ch === "," && !inQ) { result.push(cur); cur = ""; continue; }
    cur += ch;
  }
  result.push(cur);
  return result;
}

function parseDateStr(s: string): string | null {
  const clean = s.replace(/["' ]/g, "");
  const parts = clean.split(/[-\/]/);
  if (parts.length !== 3) return null;
  let y: number, m: number, d: number;
  if (parts[0].length === 4) {
    [y, m, d] = parts.map(Number);
  } else if (parseInt(parts[0]) > 12) {
    [d, m, y] = parts.map(Number);
    if (y < 100) y += 2000;
  } else {
    [m, d, y] = parts.map(Number);
    if (y < 100) y += 2000;
  }
  const date = new Date(y, m - 1, d);
  if (isNaN(date.getTime())) return null;
  return date.toISOString().split("T")[0];
}

function parseCSV(text: string): ParsedRow[] {
  const lines = text.split(/\r?\n/).filter((l) => l.trim());
  if (lines.length < 2) return [];
  const headers = parseCSVLine(lines[0]).map((h) =>
    h.trim().toLowerCase().replace(/["']/g, "")
  );
  const findIdx = (...names: string[]) =>
    names.reduce<number>((found, n) => {
      if (found !== -1) return found;
      return headers.findIndex((h) => h.includes(n));
    }, -1);

  const dateIdx = findIdx("date");
  const descIdx = findIdx("description", "desc", "narration", "details", "particulars", "reference");
  const amtIdx = findIdx("amount", "debit", "credit", "value");

  if (dateIdx === -1 || descIdx === -1 || amtIdx === -1) return [];

  return lines
    .slice(1)
    .map((line) => {
      const cols = parseCSVLine(line);
      const dateStr = cols[dateIdx]?.replace(/["']/g, "").trim() ?? "";
      const desc = cols[descIdx]?.replace(/["']/g, "").trim() ?? "";
      const amtStr = cols[amtIdx]?.replace(/["', ]/g, "").trim() ?? "";
      const amount = Math.abs(parseFloat(amtStr));
      if (!amount || isNaN(amount)) return null;
      const date = parseDateStr(dateStr);
      if (!date) return null;
      return { date, description: desc, amount, category: guessCategory(desc) };
    })
    .filter(Boolean) as ParsedRow[];
}

// ── AI Insights tab ──────────────────────────────────────────────────────────

type InsightData = {
  period: string;
  totalIncome: number;
  totalExpenses: number;
  net: number;
  projectedMonthEnd: number;
  spendingVsLastMonth: number | null;
  categoryBreakdown: { category: string; spent: number; lastMonth: number; changePercent: number | null; budgetUsedPct: number | null }[];
};

function renderInsights(text: string) {
  return text.split("\n").map((line, i) => {
    const boldMatch = line.match(/^\*\*(.+?)\*\*(.*)/);
    if (boldMatch) {
      return (
        <p key={i} className="mt-4 font-semibold text-foreground first:mt-0">
          {boldMatch[1]}
          <span className="font-normal text-foreground/90">{boldMatch[2]}</span>
        </p>
      );
    }
    if (!line.trim()) return null;
    return (
      <p key={i} className="text-sm leading-relaxed text-foreground/80">
        {line}
      </p>
    );
  });
}

function FinanceInsightsTab({ currency = "GHS" }: { currency?: string }) {
  const [loading, setLoading] = useState(false);
  const [insights, setInsights] = useState<string | null>(null);
  const [data, setData] = useState<InsightData | null>(null);
  const [error, setError] = useState<string | null>(null);
  const fm = (n: number) => formatMoney(n, currency);

  async function generate() {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/finance/insights");
      const json = await res.json() as { insights?: string; data?: InsightData; error?: string };
      if (!res.ok) throw new Error(json.error ?? "Failed to generate insights");
      setInsights(json.insights ?? null);
      setData(json.data ?? null);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong");
    } finally {
      setLoading(false);
    }
  }

  if (loading) {
    return (
      <div className="flex flex-col items-center gap-3 py-20">
        <Loader2 className="h-8 w-8 animate-spin text-accent" />
        <p className="text-sm text-muted-foreground">Analysing your finances…</p>
      </div>
    );
  }

  if (!insights) {
    return (
      <div className="flex flex-col items-center gap-5 rounded-2xl border border-dashed border-border/60 py-20 text-center">
        <div className="flex h-14 w-14 items-center justify-center rounded-full bg-accent/10">
          <Sparkles className="h-7 w-7 text-accent" />
        </div>
        <div>
          <p className="font-semibold text-foreground">AI Financial Analysis</p>
          <p className="mt-1.5 max-w-xs text-sm text-muted-foreground">
            Let Claude analyze your spending patterns, compare to last month, and give you one smart action to take now.
          </p>
        </div>
        <button
          onClick={generate}
          className="flex items-center gap-2 rounded-xl bg-accent px-6 py-2.5 text-sm font-semibold text-white transition-opacity hover:opacity-90"
        >
          <Sparkles className="h-4 w-4" />
          Generate analysis
        </button>
        {error && (
          <p className="max-w-xs rounded-lg border border-danger/20 bg-danger/5 px-3 py-2 text-sm text-danger">
            {error}
          </p>
        )}
      </div>
    );
  }

  const netPositive = (data?.net ?? 0) >= 0;

  return (
    <div className="space-y-5">
      {/* Quick stat strip */}
      {data && (
        <div className="grid grid-cols-3 gap-3">
          <div className="rounded-xl border border-border/60 bg-card/80 p-3 text-center">
            <p className="text-[10px] font-medium uppercase tracking-wide text-muted-foreground">Income</p>
            <p className="mt-1 text-lg font-bold text-success">{fm(data.totalIncome)}</p>
          </div>
          <div className="rounded-xl border border-border/60 bg-card/80 p-3 text-center">
            <p className="text-[10px] font-medium uppercase tracking-wide text-muted-foreground">Spent</p>
            <p className="mt-1 text-lg font-bold text-danger">{fm(data.totalExpenses)}</p>
          </div>
          <div className={cn("rounded-xl border p-3 text-center", netPositive ? "border-success/20 bg-success/5" : "border-danger/20 bg-danger/5")}>
            <p className="text-[10px] font-medium uppercase tracking-wide text-muted-foreground">Net</p>
            <p className={cn("mt-1 text-lg font-bold", netPositive ? "text-success" : "text-danger")}>
              {netPositive ? "+" : "-"}{fm(Math.abs(data.net))}
            </p>
          </div>
        </div>
      )}

      {/* AI Insights card */}
      <Card className="border-accent/20 bg-accent/5">
        <CardContent className="pt-5">
          <div className="mb-3 flex items-center gap-2">
            <Sparkles className="h-4 w-4 text-accent" />
            <p className="text-sm font-semibold text-accent">AI Analysis — {data?.period}</p>
          </div>
          <div className="space-y-1">{renderInsights(insights)}</div>
        </CardContent>
      </Card>

      {/* Spending change summary */}
      {data && data.categoryBreakdown.length > 0 && (
        <Card className="border-border/70 bg-card/80">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm">Spending vs last month</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            {data.categoryBreakdown.slice(0, 6).map((c) => (
              <div key={c.category} className="flex items-center justify-between gap-2 text-sm">
                <span className="text-muted-foreground">{c.category}</span>
                <div className="flex items-center gap-2">
                  <span className="font-semibold tabular-nums">{fm(c.spent)}</span>
                  {c.changePercent !== null && (
                    <span className={cn(
                      "rounded-full px-1.5 py-0.5 text-[10px] font-bold",
                      c.changePercent > 0 ? "bg-danger/10 text-danger" : "bg-success/10 text-success"
                    )}>
                      {c.changePercent > 0 ? "+" : ""}{c.changePercent}%
                    </span>
                  )}
                  {c.budgetUsedPct !== null && (
                    <span className={cn(
                      "rounded-full px-1.5 py-0.5 text-[10px] font-bold",
                      c.budgetUsedPct >= 100 ? "bg-danger/15 text-danger" :
                      c.budgetUsedPct >= 80 ? "bg-warning/15 text-warning" : "text-muted-foreground/60"
                    )}>
                      {c.budgetUsedPct}% budget
                    </span>
                  )}
                </div>
              </div>
            ))}
          </CardContent>
        </Card>
      )}

      <button
        onClick={generate}
        className="flex items-center gap-2 text-xs text-muted-foreground transition-colors hover:text-foreground"
      >
        <RotateCcw className="h-3.5 w-3.5" />
        Refresh analysis
      </button>
    </div>
  );
}

export function FinancePanel({
  data: initial,
  monthlySpending,
  budgets,
  budgetSpending,
  savingsGoals,
  currency = "GHS",
}: {
  data: Summary;
  monthlySpending: MonthData[];
  budgets: BudgetRow[];
  budgetSpending: Record<string, number>;
  savingsGoals: SavingsGoal[];
  currency?: string;
}) {
  const router = useRouter();
  const [data, setData] = useState(initial);
  const [tab, setTab] = useState<Tab>("overview");
  const [dialog, setDialog] = useState<DialogType>(null);
  const [pending, startTransition] = useTransition();
  const [csvRows, setCsvRows] = useState<ParsedRow[]>([]);
  const [importing, setImporting] = useState(false);
  const [momoState, setMomoState] = useState<MoMoSendState>({ phase: "idle" });
  const fileInputRef = useRef<HTMLInputElement>(null);
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // Convenience formatter — uses the user's currency setting
  const fm = (amount: number, opts?: { decimals?: number }) =>
    formatMoney(amount, currency, opts);

  async function handleAddExpense(fd: FormData) {
    const res = await createExpense(fd);
    if (res?.error) toast.error(res.error);
    else { toast.success("Expense logged"); setDialog(null); router.refresh(); }
  }

  async function handleAddIncome(fd: FormData) {
    const res = await createIncome(fd);
    if (res?.error) toast.error(res.error);
    else { toast.success("Income logged"); setDialog(null); router.refresh(); }
  }

  async function handleDeleteExpense(id: string, category: string) {
    setData((prev) => ({
      ...prev,
      expenses: prev.expenses.filter((e) => e.id !== id),
      totalExpenses: prev.totalExpenses - (prev.expenses.find((e) => e.id === id)?.amount ?? 0),
    }));
    startTransition(async () => {
      const res = await deleteExpense(id);
      if (res?.error) { toast.error("Failed to delete"); router.refresh(); }
      else { toast.success(`${category} expense removed`); router.refresh(); }
    });
  }

  function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (ev) => {
      const text = ev.target?.result as string;
      const rows = parseCSV(text);
      if (rows.length === 0) {
        toast.error("Could not parse CSV. Make sure it has date, description, and amount columns.");
        return;
      }
      setCsvRows(rows);
    };
    reader.readAsText(file);
  }

  async function handleMoMoSend(fd: FormData) {
    const recipientPhone = String(fd.get("recipientPhone") ?? "").trim();
    const recipientName = String(fd.get("recipientName") ?? "").trim();
    const amount = parseFloat(String(fd.get("amount") ?? "0"));
    const note = String(fd.get("note") ?? "").trim();

    setMomoState({ phase: "sending" });

    try {
      const res = await fetch("/api/finance/momo/send", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ recipientPhone, recipientName, amount, note }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error ?? "Send failed");

      const { referenceId } = json as { referenceId: string };
      setMomoState({ phase: "polling", referenceId });

      // Poll every 3 seconds up to 2 minutes
      let attempts = 0;
      pollRef.current = setInterval(async () => {
        attempts++;
        if (attempts > 40) {
          clearInterval(pollRef.current!);
          setMomoState({ phase: "error", message: "Timed out waiting for MTN confirmation. Check your MoMo app." });
          return;
        }
        try {
          const statusRes = await fetch(`/api/finance/momo/status/${referenceId}`);
          const statusJson = await statusRes.json() as { status: string };
          if (statusJson.status === "SUCCESSFUL") {
            clearInterval(pollRef.current!);
            setMomoState({ phase: "success", amount, recipient: recipientName || recipientPhone });
            router.refresh();
          } else if (statusJson.status === "FAILED") {
            clearInterval(pollRef.current!);
            setMomoState({ phase: "error", message: "Transaction was declined by MTN." });
          }
        } catch {}
      }, 3000);
    } catch (err) {
      setMomoState({ phase: "error", message: err instanceof Error ? err.message : "Send failed" });
    }
  }

  function closeMoMoDialog() {
    if (pollRef.current) clearInterval(pollRef.current);
    setDialog(null);
    setMomoState({ phase: "idle" });
  }

  async function handleImportSubmit() {
    setImporting(true);
    try {
      const res = await fetch("/api/finance/import-csv", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ rows: csvRows }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error ?? "Import failed");
      toast.success(`Imported ${json.imported} expenses`);
      setDialog(null);
      setCsvRows([]);
      router.refresh();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Import failed");
    } finally {
      setImporting(false);
    }
  }

  const netPositive = data.net >= 0;
  const maxMonthly = Math.max(...monthlySpending.map((d) => d.total), 1);

  // Spending prediction: extrapolate to end of month
  const now = new Date();
  const dayOfMonth = now.getDate();
  const daysInMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0).getDate();
  const projectedMonthly = dayOfMonth > 0 ? (data.totalExpenses / dayOfMonth) * daysInMonth : 0;
  const dailyRate = dayOfMonth > 0 ? data.totalExpenses / dayOfMonth : 0;

  return (
    <div className="space-y-6">
      {/* Tab switcher */}
      <div className="flex gap-1 rounded-xl border border-border/60 bg-muted/30 p-1 w-fit">
        <button
          type="button"
          onClick={() => setTab("overview")}
          className={cn(
            "flex items-center gap-1.5 rounded-lg px-4 py-2 text-sm font-medium transition-all",
            tab === "overview"
              ? "bg-background text-foreground shadow-sm"
              : "text-muted-foreground hover:text-foreground"
          )}
        >
          <TrendingUp className="h-4 w-4" />
          Overview
        </button>
        <button
          type="button"
          onClick={() => setTab("budget")}
          className={cn(
            "flex items-center gap-1.5 rounded-lg px-4 py-2 text-sm font-medium transition-all",
            tab === "budget"
              ? "bg-background text-foreground shadow-sm"
              : "text-muted-foreground hover:text-foreground"
          )}
        >
          <PiggyBank className="h-4 w-4" />
          Budget Planner
        </button>
        <button
          type="button"
          onClick={() => setTab("insights")}
          className={cn(
            "flex items-center gap-1.5 rounded-lg px-4 py-2 text-sm font-medium transition-all",
            tab === "insights"
              ? "bg-background text-foreground shadow-sm"
              : "text-muted-foreground hover:text-foreground"
          )}
        >
          <Sparkles className="h-4 w-4" />
          AI Insights
        </button>
      </div>

      {/* AI Insights tab */}
      {tab === "insights" && <FinanceInsightsTab currency={currency} />}

      {/* Budget Planner tab */}
      {tab === "budget" && (
        <BudgetPlanner
          budgets={budgets}
          spending={budgetSpending}
          savingsGoals={savingsGoals}
          totalIncome={data.totalIncome}
          currency={currency}
        />
      )}

      {tab === "overview" && <>
      {/* Stats row */}
      <div className="grid gap-4 sm:grid-cols-3">
        <StatCard
          label="Income this month"
          value={fm(data.totalIncome)}
          icon={<TrendingUp className="h-5 w-5 text-success" />}
          color="text-success"
          bg="bg-success/10"
        />
        <StatCard
          label="Expenses this month"
          value={fm(data.totalExpenses)}
          icon={<TrendingDown className="h-5 w-5 text-danger" />}
          color="text-danger"
          bg="bg-danger/10"
        />
        <StatCard
          label="Net balance"
          value={`${netPositive ? "+" : "-"}${fm(Math.abs(data.net))}`}
          icon={<Wallet className={cn("h-5 w-5", netPositive ? "text-success" : "text-danger")} />}
          color={netPositive ? "text-success" : "text-danger"}
          bg={netPositive ? "bg-success/10" : "bg-danger/10"}
        />
      </div>

      {/* Actions */}
      <div className="flex flex-wrap gap-3">
        <Button className="gap-2 flex-1 sm:flex-none" onClick={() => setDialog("expense")}>
          <ArrowUpRight className="h-4 w-4" />
          Log expense
        </Button>
        <Button variant="secondary" className="gap-2 flex-1 sm:flex-none" onClick={() => setDialog("income")}>
          <ArrowDownLeft className="h-4 w-4" />
          Log income
        </Button>
        <Button
          variant="outline"
          className="gap-2 flex-1 sm:flex-none"
          onClick={() => { setCsvRows([]); setDialog("csv"); }}
        >
          <Upload className="h-4 w-4" />
          Import CSV
        </Button>
        <Button
          variant="outline"
          className="gap-2 flex-1 border-warning/40 bg-warning/5 text-warning hover:bg-warning/10 hover:text-warning sm:flex-none"
          onClick={() => { setMomoState({ phase: "idle" }); setDialog("momo"); }}
        >
          <Smartphone className="h-4 w-4" />
          Send via MoMo
        </Button>
      </div>

      {/* Monthly spending chart */}
      {monthlySpending.some((d) => d.total > 0) && (
        <Card className="border-border/70 bg-card/80">
          <CardHeader>
            <CardTitle className="text-base">Monthly spending</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-end justify-between gap-2" style={{ height: "7rem" }}>
              {monthlySpending.map((d) => {
                const pct = (d.total / maxMonthly) * 90;
                return (
                  <div key={`${d.month}-${d.year}`} className="flex flex-1 flex-col items-center gap-1">
                    {d.total > 0 && (
                      <p className="text-[9px] text-muted-foreground/70">
                        {fm(d.total, { compact: true })}
                      </p>
                    )}
                    <div className="flex w-full flex-1 items-end">
                      <div
                        className="w-full rounded-t-sm bg-accent/50 transition-all duration-700"
                        style={{ height: `${pct}%`, minHeight: d.total > 0 ? "3px" : "0" }}
                      />
                    </div>
                    <p className="text-[10px] font-medium text-muted-foreground">{d.month}</p>
                  </div>
                );
              })}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Spending prediction */}
      {data.totalExpenses > 0 && (
        <Card className="border-border/70 bg-card/80">
          <CardHeader className="pb-2">
            <CardTitle className="flex items-center gap-2 text-base">
              <TrendingUp className="h-4 w-4 text-accent" />
              Spending prediction
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid gap-4 sm:grid-cols-3">
              <div className="rounded-xl bg-muted/30 p-3 text-center">
                <p className="text-xs text-muted-foreground">Daily rate</p>
                <p className="mt-1 text-xl font-bold tabular-nums">{fm(dailyRate)}</p>
                <p className="text-[10px] text-muted-foreground">avg per day</p>
              </div>
              <div className="rounded-xl bg-muted/30 p-3 text-center">
                <p className="text-xs text-muted-foreground">So far ({dayOfMonth}d)</p>
                <p className="mt-1 text-xl font-bold tabular-nums text-danger">{fm(data.totalExpenses)}</p>
                <p className="text-[10px] text-muted-foreground">spent this month</p>
              </div>
              <div className={cn("rounded-xl p-3 text-center", projectedMonthly > data.totalIncome ? "bg-danger/10" : "bg-success/10")}>
                <p className="text-xs text-muted-foreground">Month-end forecast</p>
                <p className={cn("mt-1 text-xl font-bold tabular-nums", projectedMonthly > data.totalIncome ? "text-danger" : "text-success")}>
                  {fm(projectedMonthly)}
                </p>
                <p className="text-[10px] text-muted-foreground">at this rate</p>
              </div>
            </div>
            {projectedMonthly > data.totalIncome && data.totalIncome > 0 && (
              <p className="mt-3 rounded-lg border border-warning/30 bg-warning/5 px-3 py-2 text-xs text-warning">
                At this rate, your expenses will exceed your income by {fm(projectedMonthly - data.totalIncome)} this month.
              </p>
            )}
          </CardContent>
        </Card>
      )}

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
                      <span className="font-semibold">{fm(amt)}</span>
                    </div>
                    <div className="h-1.5 w-full overflow-hidden rounded-full bg-muted">
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
                      <p className="truncate text-sm font-medium">{e.category}</p>
                      {e.description && (
                        <p className="truncate text-xs text-muted-foreground">{e.description}</p>
                      )}
                    </div>
                    <div className="flex shrink-0 items-center gap-3">
                      <span className="text-sm font-semibold text-danger">{fm(e.amount)}</span>
                      <button
                        type="button"
                        onClick={() => handleDeleteExpense(e.id, e.category)}
                        className="rounded-lg p-1 text-transparent transition-all group-hover:text-muted-foreground/40 hover:bg-danger/10 hover:text-danger!"
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

      </> /* end overview tab */}

      {/* Add Expense Dialog */}
      <Dialog open={dialog === "expense"} onOpenChange={(v) => !v && setDialog(null)}>
        <DialogContent className="max-w-sm">
          <DialogHeader><DialogTitle>Log expense</DialogTitle></DialogHeader>
          <form
            onSubmit={(e) => { e.preventDefault(); handleAddExpense(new FormData(e.currentTarget)); }}
            className="space-y-4"
          >
            <div className="space-y-1.5">
              <Label>Amount</Label>
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
          <DialogHeader><DialogTitle>Log income</DialogTitle></DialogHeader>
          <form
            onSubmit={(e) => { e.preventDefault(); handleAddIncome(new FormData(e.currentTarget)); }}
            className="space-y-4"
          >
            <div className="space-y-1.5">
              <Label>Amount</Label>
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

      {/* CSV Import Dialog */}
      <Dialog open={dialog === "csv"} onOpenChange={(v) => { if (!v) { setDialog(null); setCsvRows([]); } }}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Import bank statement CSV</DialogTitle>
          </DialogHeader>

          {csvRows.length === 0 ? (
            <div className="space-y-4">
              <p className="text-sm text-muted-foreground">
                Upload a CSV with columns: <strong>date</strong>, <strong>description</strong>, <strong>amount</strong>.
                Categories are auto-detected from descriptions.
              </p>
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                className="flex w-full flex-col items-center gap-3 rounded-xl border-2 border-dashed border-border py-10 transition-colors hover:border-accent/50 hover:bg-accent/5"
              >
                <Upload className="h-8 w-8 text-muted-foreground/40" />
                <span className="text-sm text-muted-foreground">Click to select CSV file</span>
              </button>
              <input
                ref={fileInputRef}
                type="file"
                accept=".csv,text/csv"
                className="hidden"
                onChange={handleFileChange}
              />
            </div>
          ) : (
            <div className="space-y-4">
              <p className="text-sm text-muted-foreground">
                Found <strong>{csvRows.length}</strong> transactions. Edit categories if needed.
              </p>
              <div className="max-h-72 overflow-x-auto overflow-y-auto rounded-lg border border-border">
                <table className="w-full min-w-130 text-sm">
                  <thead className="sticky top-0 bg-muted/80 backdrop-blur-sm">
                    <tr>
                      <th className="px-3 py-2 text-left text-xs font-medium text-muted-foreground">Date</th>
                      <th className="px-3 py-2 text-left text-xs font-medium text-muted-foreground">Description</th>
                      <th className="px-3 py-2 text-right text-xs font-medium text-muted-foreground">Amount</th>
                      <th className="px-3 py-2 text-left text-xs font-medium text-muted-foreground">Category</th>
                      <th className="w-8 px-2 py-2" />
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border">
                    {csvRows.map((row, i) => (
                      <tr key={i} className="hover:bg-muted/30">
                        <td className="px-3 py-2 text-xs text-muted-foreground">{row.date}</td>
                        <td className="max-w-40 px-3 py-2">
                          <p className="truncate text-xs">{row.description || "—"}</p>
                        </td>
                        <td className="px-3 py-2 text-right font-semibold text-danger text-xs">
                          {fm(row.amount)}
                        </td>
                        <td className="px-3 py-2">
                          <input
                            value={row.category}
                            onChange={(e) =>
                              setCsvRows((prev) =>
                                prev.map((r, j) =>
                                  j === i ? { ...r, category: e.target.value } : r
                                )
                              )
                            }
                            className="w-full rounded border border-border bg-transparent px-2 py-0.5 text-xs focus:border-accent focus:outline-none"
                          />
                        </td>
                        <td className="px-2 py-2">
                          <button
                            type="button"
                            onClick={() => setCsvRows((prev) => prev.filter((_, j) => j !== i))}
                            className="rounded p-0.5 text-muted-foreground/40 hover:text-danger"
                          >
                            <X className="h-3.5 w-3.5" />
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          <DialogFooter>
            <Button type="button" variant="ghost" onClick={() => { setDialog(null); setCsvRows([]); }}>
              Cancel
            </Button>
            {csvRows.length > 0 && (
              <Button onClick={handleImportSubmit} disabled={importing} className="gap-2">
                {importing ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <Check className="h-4 w-4" />
                )}
                Import {csvRows.length} expenses
              </Button>
            )}
          </DialogFooter>
        </DialogContent>
      </Dialog>
      {/* MoMo Send Dialog */}
      <Dialog open={dialog === "momo"} onOpenChange={(v) => { if (!v) closeMoMoDialog(); }}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Smartphone className="h-5 w-5 text-warning" />
              Send via MoMo
            </DialogTitle>
          </DialogHeader>

          {momoState.phase === "idle" && (
            <form
              onSubmit={(e) => { e.preventDefault(); handleMoMoSend(new FormData(e.currentTarget)); }}
              className="space-y-4"
            >
              <div className="space-y-1.5">
                <Label>Recipient phone (MoMo number)</Label>
                <Input name="recipientPhone" placeholder="0244 000 000" required autoFocus />
              </div>
              <div className="space-y-1.5">
                <Label>Recipient name (optional)</Label>
                <Input name="recipientName" placeholder="Kwame, Ama..." />
              </div>
              <div className="space-y-1.5">
                <Label>Amount</Label>
                <Input name="amount" type="number" step="0.01" min="0.01" placeholder="0.00" required />
              </div>
              <div className="space-y-1.5">
                <Label>What is this for?</Label>
                <Input name="note" placeholder="Lunch, data, rent..." />
              </div>
              <p className="rounded-lg border border-muted bg-muted/30 px-3 py-2 text-[11px] text-muted-foreground">
                MTN will send a USSD prompt to approve the transfer. The expense is logged automatically after approval.
              </p>
              <DialogFooter>
                <Button type="button" variant="ghost" onClick={closeMoMoDialog}>Cancel</Button>
                <Button type="submit" className="gap-2 bg-warning text-white hover:bg-warning/90">
                  <Smartphone className="h-4 w-4" />
                  Send
                </Button>
              </DialogFooter>
            </form>
          )}

          {momoState.phase === "sending" && (
            <div className="flex flex-col items-center gap-4 py-8">
              <Loader2 className="h-8 w-8 animate-spin text-warning" />
              <p className="text-sm font-medium">Sending request to MTN…</p>
            </div>
          )}

          {momoState.phase === "polling" && (
            <div className="flex flex-col items-center gap-4 py-8">
              <div className="flex h-16 w-16 items-center justify-center rounded-full bg-warning/10">
                <Clock className="h-8 w-8 text-warning" />
              </div>
              <div className="text-center">
                <p className="text-sm font-semibold">Waiting for your approval</p>
                <p className="mt-1 text-xs text-muted-foreground">
                  Check your phone — MTN will send a prompt to confirm the transfer.
                </p>
              </div>
              <div className="flex items-center gap-1.5 text-xs text-muted-foreground/60">
                <Loader2 className="h-3 w-3 animate-spin" />
                Checking status…
              </div>
            </div>
          )}

          {momoState.phase === "success" && (
            <div className="flex flex-col items-center gap-4 py-8">
              <div className="flex h-16 w-16 items-center justify-center rounded-full bg-success/10">
                <CheckCircle2 className="h-8 w-8 text-success" />
              </div>
              <div className="text-center">
                <p className="text-sm font-semibold text-success">Transfer successful</p>
                <p className="mt-1 text-xs text-muted-foreground">
                  {fm(momoState.amount)} sent to {momoState.recipient}.<br />
                  Expense logged automatically.
                </p>
              </div>
              <Button onClick={closeMoMoDialog} className="mt-2">Done</Button>
            </div>
          )}

          {momoState.phase === "error" && (
            <div className="flex flex-col items-center gap-4 py-8">
              <div className="flex h-16 w-16 items-center justify-center rounded-full bg-danger/10">
                <XCircle className="h-8 w-8 text-danger" />
              </div>
              <div className="text-center">
                <p className="text-sm font-semibold text-danger">Transfer failed</p>
                <p className="mt-1 text-xs text-muted-foreground">{momoState.message}</p>
              </div>
              <Button
                variant="outline"
                onClick={() => setMomoState({ phase: "idle" })}
                className="mt-2"
              >
                Try again
              </Button>
            </div>
          )}
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
