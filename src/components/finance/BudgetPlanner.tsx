"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import {
  AlertTriangle,
  Bot,
  CheckCircle2,
  ChevronDown,
  ChevronUp,
  Loader2,
  Pencil,
  PiggyBank,
  Plus,
  Target,
  Trash2,
  TrendingUp,
  X,
} from "lucide-react";

import {
  upsertBudget,
  deleteBudget,
  createSavingsGoal,
  updateSavingsGoal,
  deleteSavingsGoal,
} from "@/lib/actions/budget";
import { DEFAULT_CATEGORIES } from "@/lib/budget-constants";
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

type Insight = { type: "warning" | "tip" | "success" | "info"; title: string; body: string };

type Props = {
  budgets: BudgetRow[];
  spending: Record<string, number>;
  savingsGoals: SavingsGoal[];
  totalIncome: number;
};

const INSIGHT_STYLES = {
  warning: { bg: "bg-warning/10 border-warning/30", icon: AlertTriangle, color: "text-warning" },
  tip: { bg: "bg-accent/10 border-accent/30", icon: TrendingUp, color: "text-accent" },
  success: { bg: "bg-success/10 border-success/30", icon: CheckCircle2, color: "text-success" },
  info: { bg: "bg-muted/40 border-border/60", icon: Bot, color: "text-muted-foreground" },
};

function pct(spent: number, limit: number) {
  if (!limit) return 0;
  return Math.min(Math.round((spent / limit) * 100), 100);
}

function barColor(p: number) {
  if (p >= 100) return "bg-danger";
  if (p >= 80) return "bg-warning";
  return "bg-success";
}

export function BudgetPlanner({ budgets: initial, spending, savingsGoals: initialGoals, totalIncome }: Props) {
  const router = useRouter();
  const [budgets, setBudgets] = useState(initial);
  const [goals, setGoals] = useState(initialGoals);
  const [dialog, setDialog] = useState<"budget" | "goal" | "topup" | null>(null);
  const [editBudget, setEditBudget] = useState<BudgetRow | null>(null);
  const [topupGoal, setTopupGoal] = useState<SavingsGoal | null>(null);
  const [insights, setInsights] = useState<Insight[]>([]);
  const [loadingInsights, setLoadingInsights] = useState(false);
  const [insightsLoaded, setInsightsLoaded] = useState(false);
  const [showAllCategories, setShowAllCategories] = useState(false);
  const [pending, startTransition] = useTransition();

  const totalBudget = budgets.reduce((s, b) => s + b.monthlyLimit, 0);
  const totalSpent = budgets.reduce((s, b) => s + (spending[b.name] ?? 0), 0);
  const unbudgetedSpend = Object.entries(spending)
    .filter(([cat]) => !budgets.find((b) => b.name === cat))
    .reduce((s, [, v]) => s + v, 0);
  const surplus = totalIncome - totalSpent - unbudgetedSpend;

  async function handleUpsertBudget(fd: FormData) {
    startTransition(async () => {
      const res = await upsertBudget(fd);
      if (res?.error) { toast.error(res.error); return; }
      toast.success("Budget saved");
      setDialog(null);
      setEditBudget(null);
      router.refresh();
    });
  }

  async function handleDeleteBudget(name: string) {
    startTransition(async () => {
      await deleteBudget(name);
      setBudgets((prev) => prev.filter((b) => b.name !== name));
      toast.success("Budget removed");
    });
  }

  async function handleCreateGoal(fd: FormData) {
    startTransition(async () => {
      const res = await createSavingsGoal(fd);
      if (res?.error) { toast.error(res.error); return; }
      toast.success("Savings goal created");
      setDialog(null);
      router.refresh();
    });
  }

  async function handleTopup(fd: FormData) {
    if (!topupGoal) return;
    const amount = parseFloat(String(fd.get("amount") ?? "0"));
    if (!amount || amount <= 0) { toast.error("Enter a valid amount"); return; }
    startTransition(async () => {
      await updateSavingsGoal(topupGoal.id, topupGoal.currentAmount + amount);
      toast.success(`₵${amount.toFixed(2)} added to ${topupGoal.name}`);
      setDialog(null);
      setTopupGoal(null);
      router.refresh();
    });
  }

  async function handleDeleteGoal(id: string, name: string) {
    startTransition(async () => {
      await deleteSavingsGoal(id);
      setGoals((prev) => prev.filter((g) => g.id !== id));
      toast.success(`${name} goal removed`);
    });
  }

  async function loadInsights() {
    setLoadingInsights(true);
    try {
      const res = await fetch("/api/ai/finance-insight", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          budgets: budgets.map((b) => ({ name: b.name, monthlyLimit: b.monthlyLimit })),
          spending,
          totalIncome,
          savingsGoals: goals.map((g) => ({ name: g.name, targetAmount: g.targetAmount, currentAmount: g.currentAmount })),
        }),
      });
      const data = await res.json() as { insights?: Insight[] };
      setInsights(data.insights ?? []);
      setInsightsLoaded(true);
    } catch {
      toast.error("Could not load insights");
    } finally {
      setLoadingInsights(false);
    }
  }

  const suggestedCategories = DEFAULT_CATEGORIES.filter(
    (dc) => !budgets.find((b) => b.name === dc.name)
  );

  return (
    <div className="space-y-6">
      {/* Summary strip */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <SummaryTile label="Total budget" value={`₵${totalBudget.toFixed(2)}`} sub="this month" color="text-foreground" />
        <SummaryTile label="Budgeted spend" value={`₵${totalSpent.toFixed(2)}`} sub={`${totalBudget > 0 ? pct(totalSpent, totalBudget) : 0}% used`} color={totalSpent > totalBudget ? "text-danger" : "text-success"} />
        <SummaryTile label="Income" value={`₵${totalIncome.toFixed(2)}`} sub="this month" color="text-foreground" />
        <SummaryTile label="Surplus" value={`${surplus >= 0 ? "+" : ""}₵${surplus.toFixed(2)}`} sub="after expenses" color={surplus >= 0 ? "text-success" : "text-danger"} />
      </div>

      {/* Budget categories */}
      <Card className="border-border/70 bg-card/80">
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="text-base">Monthly budgets</CardTitle>
            <Button
              size="sm"
              variant="outline"
              className="h-8 gap-1.5 text-xs"
              onClick={() => { setEditBudget(null); setDialog("budget"); }}
            >
              <Plus className="h-3.5 w-3.5" />
              Add budget
            </Button>
          </div>
        </CardHeader>
        <CardContent className="space-y-3">
          {budgets.length === 0 ? (
            <div className="py-8 text-center">
              <PiggyBank className="mx-auto h-10 w-10 text-muted-foreground/30" />
              <p className="mt-2 text-sm text-muted-foreground">No budgets set yet.</p>
              <p className="mt-0.5 text-xs text-muted-foreground/70">Set monthly limits to track your spending.</p>
              <Button size="sm" className="mt-3 gap-1.5" onClick={() => { setEditBudget(null); setDialog("budget"); }}>
                <Plus className="h-3.5 w-3.5" />
                Set first budget
              </Button>
            </div>
          ) : (
            <>
              {budgets.map((b) => {
                const spent = spending[b.name] ?? 0;
                const p = pct(spent, b.monthlyLimit);
                return (
                  <div key={b.name} className="space-y-1.5">
                    <div className="flex items-center justify-between text-sm">
                      <span className="flex items-center gap-1.5 font-medium">
                        <span>{b.emoji}</span>
                        <span>{b.name}</span>
                        {p >= 100 && <span className="rounded-full bg-danger/15 px-1.5 py-0.5 text-[10px] font-semibold text-danger">Over</span>}
                        {p >= 80 && p < 100 && <span className="rounded-full bg-warning/15 px-1.5 py-0.5 text-[10px] font-semibold text-warning">Alert</span>}
                      </span>
                      <div className="flex items-center gap-2">
                        <span className="text-xs text-muted-foreground">
                          ₵{spent.toFixed(2)} / ₵{b.monthlyLimit.toFixed(2)}
                        </span>
                        <button
                          type="button"
                          onClick={() => { setEditBudget(b); setDialog("budget"); }}
                          className="rounded p-0.5 text-muted-foreground/30 hover:text-muted-foreground"
                        >
                          <Pencil className="h-3 w-3" />
                        </button>
                        <button
                          type="button"
                          onClick={() => handleDeleteBudget(b.name)}
                          className="rounded p-0.5 text-muted-foreground/30 hover:text-danger"
                        >
                          <Trash2 className="h-3 w-3" />
                        </button>
                      </div>
                    </div>
                    <div className="h-2 w-full overflow-hidden rounded-full bg-muted/50">
                      <div
                        className={cn("h-full rounded-full transition-all duration-500", barColor(p))}
                        style={{ width: `${p}%` }}
                      />
                    </div>
                    <p className="text-right text-[10px] text-muted-foreground">
                      {p}% · ₵{Math.max(0, b.monthlyLimit - spent).toFixed(2)} left
                    </p>
                  </div>
                );
              })}
            </>
          )}

          {/* Quick-add suggested categories */}
          {suggestedCategories.length > 0 && (
            <div className="pt-2">
              <button
                type="button"
                onClick={() => setShowAllCategories((v) => !v)}
                className="flex items-center gap-1 text-xs text-muted-foreground/70 hover:text-muted-foreground"
              >
                {showAllCategories ? <ChevronUp className="h-3 w-3" /> : <ChevronDown className="h-3 w-3" />}
                {showAllCategories ? "Hide" : "Quick add"} suggested categories
              </button>
              {showAllCategories && (
                <div className="mt-2 flex flex-wrap gap-2">
                  {suggestedCategories.map((dc) => (
                    <button
                      key={dc.name}
                      type="button"
                      onClick={() => {
                        setEditBudget({ id: "", name: dc.name, monthlyLimit: 0, emoji: dc.emoji });
                        setDialog("budget");
                      }}
                      className="flex items-center gap-1 rounded-lg border border-border/60 bg-muted/30 px-2.5 py-1 text-xs text-muted-foreground hover:border-accent/40 hover:bg-accent/10 hover:text-foreground"
                    >
                      <span>{dc.emoji}</span>
                      <span>{dc.name}</span>
                      <Plus className="h-3 w-3" />
                    </button>
                  ))}
                </div>
              )}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Savings goals */}
      <Card className="border-border/70 bg-card/80">
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="text-base">Savings goals</CardTitle>
            <Button size="sm" variant="outline" className="h-8 gap-1.5 text-xs" onClick={() => setDialog("goal")}>
              <Plus className="h-3.5 w-3.5" />
              New goal
            </Button>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          {goals.length === 0 ? (
            <div className="py-6 text-center">
              <Target className="mx-auto h-10 w-10 text-muted-foreground/30" />
              <p className="mt-2 text-sm text-muted-foreground">No savings goals yet.</p>
              <p className="mt-0.5 text-xs text-muted-foreground/70">Set a goal and track your progress.</p>
              <Button size="sm" className="mt-3 gap-1.5" onClick={() => setDialog("goal")}>
                <Plus className="h-3.5 w-3.5" />
                Create goal
              </Button>
            </div>
          ) : (
            goals.map((g) => {
              const p = pct(g.currentAmount, g.targetAmount);
              const remaining = g.targetAmount - g.currentAmount;
              const monthsLeft = g.targetDate
                ? Math.max(0, Math.ceil((new Date(g.targetDate).getTime() - Date.now()) / (1000 * 60 * 60 * 24 * 30)))
                : null;
              const monthlyNeeded = monthsLeft && monthsLeft > 0 ? remaining / monthsLeft : null;

              return (
                <div key={g.id} className="rounded-xl border border-border/60 p-4">
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex items-center gap-2">
                      <span className="text-xl">{g.emoji}</span>
                      <div>
                        <p className="font-medium text-sm">{g.name}</p>
                        {g.targetDate && (
                          <p className="text-[11px] text-muted-foreground">
                            Target: {new Date(g.targetDate).toLocaleDateString("en-GH", { month: "short", year: "numeric" })}
                            {monthsLeft !== null && ` · ${monthsLeft}mo left`}
                          </p>
                        )}
                      </div>
                    </div>
                    <div className="flex items-center gap-1.5">
                      <button
                        type="button"
                        onClick={() => { setTopupGoal(g); setDialog("topup"); }}
                        className="rounded-lg bg-success/10 px-2 py-1 text-[11px] font-medium text-success hover:bg-success/20"
                      >
                        + Add
                      </button>
                      <button
                        type="button"
                        onClick={() => handleDeleteGoal(g.id, g.name)}
                        className="rounded p-0.5 text-muted-foreground/30 hover:text-danger"
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </button>
                    </div>
                  </div>
                  <div className="mt-3 space-y-1">
                    <div className="flex justify-between text-xs text-muted-foreground">
                      <span>₵{g.currentAmount.toFixed(2)} saved</span>
                      <span>₵{g.targetAmount.toFixed(2)} goal · {p}%</span>
                    </div>
                    <div className="h-2 w-full overflow-hidden rounded-full bg-muted/50">
                      <div
                        className="h-full rounded-full bg-accent transition-all duration-500"
                        style={{ width: `${p}%` }}
                      />
                    </div>
                    {monthlyNeeded !== null && monthlyNeeded > 0 && (
                      <p className="text-[11px] text-muted-foreground">
                        Save ₵{monthlyNeeded.toFixed(2)}/month to reach your goal on time.
                      </p>
                    )}
                  </div>
                </div>
              );
            })
          )}
        </CardContent>
      </Card>

      {/* AI Finance Insights */}
      <Card className="border-border/70 bg-card/80">
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="text-base flex items-center gap-2">
              <Bot className="h-4 w-4 text-accent" />
              AI Finance Insights
            </CardTitle>
            {!insightsLoaded && (
              <Button
                size="sm"
                variant="outline"
                className="h-8 gap-1.5 text-xs"
                onClick={loadInsights}
                disabled={loadingInsights}
              >
                {loadingInsights ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Bot className="h-3.5 w-3.5" />}
                {loadingInsights ? "Analyzing…" : "Get insights"}
              </Button>
            )}
          </div>
        </CardHeader>
        <CardContent>
          {!insightsLoaded && !loadingInsights && (
            <div className="py-6 text-center">
              <Bot className="mx-auto h-10 w-10 text-muted-foreground/30" />
              <p className="mt-2 text-sm text-muted-foreground">Click &quot;Get insights&quot; for AI spending analysis.</p>
              <p className="mt-0.5 text-xs text-muted-foreground/70">
                Personalized tips, overspending alerts, and Ghana-specific investment advice.
              </p>
            </div>
          )}
          {loadingInsights && (
            <div className="flex items-center justify-center gap-2 py-8 text-sm text-muted-foreground">
              <Loader2 className="h-4 w-4 animate-spin" />
              Analyzing your finances…
            </div>
          )}
          {insightsLoaded && (
            <div className="space-y-3">
              {insights.map((ins, i) => {
                const style = INSIGHT_STYLES[ins.type as keyof typeof INSIGHT_STYLES] ?? INSIGHT_STYLES.info;
                const Icon = style.icon;
                return (
                  <div
                    key={i}
                    className={cn("flex gap-3 rounded-xl border p-3.5", style.bg)}
                  >
                    <Icon className={cn("mt-0.5 h-4 w-4 shrink-0", style.color)} />
                    <div>
                      <p className="text-sm font-semibold text-foreground">{ins.title}</p>
                      <p className="mt-0.5 text-xs text-muted-foreground">{ins.body}</p>
                    </div>
                  </div>
                );
              })}
              <button
                type="button"
                onClick={loadInsights}
                disabled={loadingInsights}
                className="flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground"
              >
                <Bot className="h-3.5 w-3.5" />
                Refresh insights
              </button>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Investment info card */}
      <Card className="border-accent/20 bg-accent/5">
        <CardContent className="pt-5">
          <p className="mb-3 text-sm font-semibold">Ghana Investment Options</p>
          <div className="grid gap-2 sm:grid-cols-2">
            {[
              { name: "MTN MoMo Savings", rate: "~5% p.a.", risk: "Very Low", emoji: "📱" },
              { name: "Treasury Bills (91-day)", rate: "~22% p.a.", risk: "Very Low", emoji: "🏛️" },
              { name: "Databank Mutual Fund", rate: "~18-24% p.a.", risk: "Low-Med", emoji: "📈" },
              { name: "Stanbic Unit Trust", rate: "~20% p.a.", risk: "Low", emoji: "💼" },
            ].map((inv) => (
              <div key={inv.name} className="flex items-start gap-2 rounded-lg border border-border/50 bg-background/50 p-3">
                <span className="text-lg">{inv.emoji}</span>
                <div>
                  <p className="text-xs font-semibold text-foreground">{inv.name}</p>
                  <p className="text-[11px] text-success">{inv.rate}</p>
                  <p className="text-[11px] text-muted-foreground">Risk: {inv.risk}</p>
                </div>
              </div>
            ))}
          </div>
          <p className="mt-3 text-[11px] text-muted-foreground">
            Rates are approximate. Contact your bank or visit the Bank of Ghana website for current T-bill rates.
          </p>
        </CardContent>
      </Card>

      {/* Add/Edit Budget Dialog */}
      <Dialog open={dialog === "budget"} onOpenChange={(v) => { if (!v) { setDialog(null); setEditBudget(null); } }}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>{editBudget?.id ? "Edit" : "Set"} budget limit</DialogTitle>
          </DialogHeader>
          <form
            onSubmit={(e) => { e.preventDefault(); handleUpsertBudget(new FormData(e.currentTarget)); }}
            className="space-y-4"
          >
            <div className="space-y-1.5">
              <Label>Category name</Label>
              <Input name="name" defaultValue={editBudget?.name ?? ""} placeholder="Food & Drinks, Transport…" required />
            </div>
            <div className="space-y-1.5">
              <Label>Emoji</Label>
              <Input name="emoji" defaultValue={editBudget?.emoji ?? "💰"} placeholder="💰" maxLength={4} />
            </div>
            <div className="space-y-1.5">
              <Label>Monthly limit (₵)</Label>
              <Input
                name="monthlyLimit"
                type="number"
                step="0.01"
                min="1"
                defaultValue={editBudget?.monthlyLimit || ""}
                placeholder="0.00"
                required
                autoFocus={!editBudget?.name}
              />
            </div>
            <DialogFooter>
              <Button type="button" variant="ghost" onClick={() => { setDialog(null); setEditBudget(null); }}>
                <X className="h-4 w-4" />
                Cancel
              </Button>
              <Button type="submit" disabled={pending} className="gap-1.5">
                {pending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Plus className="h-4 w-4" />}
                Save budget
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Add Savings Goal Dialog */}
      <Dialog open={dialog === "goal"} onOpenChange={(v) => !v && setDialog(null)}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>New savings goal</DialogTitle>
          </DialogHeader>
          <form
            onSubmit={(e) => { e.preventDefault(); handleCreateGoal(new FormData(e.currentTarget)); }}
            className="space-y-4"
          >
            <div className="space-y-1.5">
              <Label>Goal name</Label>
              <Input name="name" placeholder="Laptop, Emergency fund, Rent…" required autoFocus />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label>Emoji</Label>
                <Input name="emoji" defaultValue="🎯" placeholder="🎯" maxLength={4} />
              </div>
              <div className="space-y-1.5">
                <Label>Already saved (₵)</Label>
                <Input name="currentAmount" type="number" step="0.01" min="0" placeholder="0.00" defaultValue="0" />
              </div>
            </div>
            <div className="space-y-1.5">
              <Label>Target amount (₵)</Label>
              <Input name="targetAmount" type="number" step="0.01" min="1" placeholder="0.00" required />
            </div>
            <div className="space-y-1.5">
              <Label>Target date (optional)</Label>
              <Input name="targetDate" type="date" />
            </div>
            <DialogFooter>
              <Button type="button" variant="ghost" onClick={() => setDialog(null)}>Cancel</Button>
              <Button type="submit" disabled={pending} className="gap-1.5">
                {pending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Target className="h-4 w-4" />}
                Create goal
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Top-up Dialog */}
      <Dialog open={dialog === "topup"} onOpenChange={(v) => { if (!v) { setDialog(null); setTopupGoal(null); } }}>
        <DialogContent className="max-w-xs">
          <DialogHeader>
            <DialogTitle>Add to {topupGoal?.name}</DialogTitle>
          </DialogHeader>
          <form
            onSubmit={(e) => { e.preventDefault(); handleTopup(new FormData(e.currentTarget)); }}
            className="space-y-4"
          >
            <div className="space-y-1.5">
              <Label>Amount to add (₵)</Label>
              <Input name="amount" type="number" step="0.01" min="0.01" placeholder="0.00" required autoFocus />
            </div>
            {topupGoal && (
              <p className="text-xs text-muted-foreground">
                Current: ₵{topupGoal.currentAmount.toFixed(2)} → Target: ₵{topupGoal.targetAmount.toFixed(2)}
              </p>
            )}
            <DialogFooter>
              <Button type="button" variant="ghost" onClick={() => { setDialog(null); setTopupGoal(null); }}>Cancel</Button>
              <Button type="submit" disabled={pending} className="gap-1.5">
                {pending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Plus className="h-4 w-4" />}
                Add
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}

function SummaryTile({ label, value, sub, color }: { label: string; value: string; sub: string; color: string }) {
  return (
    <div className="rounded-xl border border-border/60 bg-card/80 p-3.5">
      <p className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground/70">{label}</p>
      <p className={cn("mt-1 text-xl font-bold tabular-nums", color)}>{value}</p>
      <p className="mt-0.5 text-[11px] text-muted-foreground">{sub}</p>
    </div>
  );
}
