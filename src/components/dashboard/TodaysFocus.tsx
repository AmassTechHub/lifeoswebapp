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
        <p className="mb-4 text-sm leading-relaxed text-muted-foreground">
          What matters most today. Execute these before anything else.
        </p>
        {pending && (
          <Loader2 className="mb-2 h-4 w-4 animate-spin text-accent" aria-hidden />
        )}
        <ol className="space-y-2.5">
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
                    className="flex w-full items-start gap-3 rounded-lg border border-border/60 bg-background/40 px-4 py-3 text-left text-sm transition-all hover:border-accent/25 hover:bg-accent/5"
                  >
                    <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-accent/15 text-xs font-semibold text-accent">
                      {index + 1}
                    </span>
                    <span className="pt-0.5">
                      <span className="block">{item.title}</span>
                      <span className="text-xs text-muted-foreground">{item.category}</span>
                    </span>
                  </button>
                ) : (
                  <div className="flex items-start gap-3 rounded-lg border border-border/60 px-4 py-3 text-sm text-muted-foreground">
                    <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-muted text-xs font-semibold">
                      {index + 1}
                    </span>
                    <span className="pt-0.5">{item.title}</span>
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
