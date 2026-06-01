import Link from "next/link";
import { Bot } from "lucide-react";

import { dashboardCardClass } from "@/components/dashboard/dashboard-styles";
import { Button } from "@/components/ui/button";

export function AIInsightsBanner() {
  return (
    <div
      className={`${dashboardCardClass(true)} mb-8 bg-linear-to-r from-accent/10 via-card/80 to-primary/40 p-5`}
    >
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-start gap-3">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-accent/15 text-accent">
            <Bot className="h-5 w-5" />
          </div>
          <div>
            <p className="text-sm font-semibold">Smart System active</p>
            <p className="mt-1 max-w-xl text-sm leading-relaxed text-muted-foreground">
              Unlike Notion, Life OS automates your day. Upload a timetable,
              get AI focus, and let the system plan around your real life.
            </p>
          </div>
        </div>
        <Button
          size="sm"
          variant="outline"
          className="shrink-0 border-accent/30 text-accent hover:bg-accent/10"
          asChild
        >
          <Link href="/coach">Open AI Coach</Link>
        </Button>
      </div>
    </div>
  );
}
