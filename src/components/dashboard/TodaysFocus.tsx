"use client";

import { useTransition } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Loader2 } from "lucide-react";

import { dashboardCardClass } from "@/components/dashboard/dashboard-styles";
import { toggleTaskComplete } from "@/lib/actions/tasks";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { cn } from "@/lib/utils";

type FocusItem = {
  id: string;
  title: string;
  category: string;
};

export function TodaysFocus({ items }: { items: FocusItem[] }) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();

  const completable = items.filter(
    (i) => !i.id.startsWith("goal") && i.id !== "welcome" && i.id !== "setup"
  );

  return (
    <Card id="todays-focus" className={cn(dashboardCardClass(true), "scroll-mt-24")}>
      <CardHeader>
        <div className="flex items-center justify-between gap-3">
          <CardTitle>Today&apos;s Focus</CardTitle>
          <Badge variant="secondary" className="bg-accent/15 text-accent">
            {completable.length > 0 ? "From your tasks" : "Smart"}
          </Badge>
        </div>
      </CardHeader>
      <CardContent>
        {pending && (
          <Loader2 className="mb-2 h-4 w-4 animate-spin text-accent" aria-hidden />
        )}
        <ol className="space-y-2">
          {items.map((item, index) => {
            const canComplete =
              !item.id.startsWith("goal") && item.id !== "welcome" && item.id !== "setup";
            return (
              <li key={item.id}>
                {canComplete ? (
                  <button
                    type="button"
                    onClick={() =>
                      startTransition(async () => {
                        await toggleTaskComplete(item.id);
                        toast.success("Task completed");
                        router.refresh();
                      })
                    }
                    className="group flex w-full items-center gap-3 rounded-xl border border-border/50 bg-background/40 px-4 py-2.5 text-left text-sm transition-all hover:border-accent/30 hover:bg-accent/5"
                  >
                    <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-accent/15 text-[10px] font-bold text-accent">
                      {index + 1}
                    </span>
                    <span className="min-w-0 flex-1 truncate font-medium">{item.title}</span>
                    <span className="shrink-0 text-[10px] font-medium uppercase tracking-wide text-muted-foreground/50">{item.category}</span>
                  </button>
                ) : (
                  <div className="flex items-center gap-3 rounded-xl border border-border/40 bg-muted/20 px-4 py-2.5 text-sm text-muted-foreground">
                    <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-muted text-[10px] font-bold">
                      {index + 1}
                    </span>
                    <span className="truncate">{item.title}</span>
                  </div>
                )}
              </li>
            );
          })}
        </ol>
      </CardContent>
    </Card>
  );
}
