"use client";

import { useTransition } from "react";
import { useRouter } from "next/navigation";
import { Loader2 } from "lucide-react";
import {
  Calendar,
  ClipboardList,
  Focus,
  GraduationCap,
  ListChecks,
  ShieldAlert,
  Sparkles,
  Upload,
} from "lucide-react";

import { runDailySetup } from "@/lib/actions/automation";

import { dashboardCardClass } from "@/components/dashboard/dashboard-styles";

const actions = [
  {
    icon: Sparkles,
    label: "Run daily setup",
    sub: "Auto-build today",
    action: "setup" as const,
  },
  {
    icon: ShieldAlert,
    label: "Rescue overdue",
    sub: "Push overdue to tomorrow",
    action: "rescue" as const,
  },
  {
    icon: Focus,
    label: "Lock in (Focus)",
    sub: "Timer, no distractions",
    href: "/focus",
  },
  {
    icon: ListChecks,
    label: "Today's focus",
    sub: "Priority list",
    href: "/dashboard#todays-focus",
  },
  {
    icon: Calendar,
    label: "Build daily plan",
    sub: "From goals + calendar",
    href: "/planner",
  },
  {
    icon: ClipboardList,
    label: "Weekly review",
    sub: "Progress and next steps",
    href: "/coach",
  },
  {
    icon: GraduationCap,
    label: "Study notes",
    sub: "DSA notes and slides",
    href: "/learning",
  },
  {
    icon: Upload,
    label: "Upload timetable",
    sub: "Schedule your week automatically",
    href: "/dashboard#timetable",
  },
] as const;

export function SmartActions() {
  const router = useRouter();
  const [pending, startTransition] = useTransition();

  function handleAction(item: (typeof actions)[number]) {
    if ("action" in item && item.action === "setup") {
      startTransition(async () => {
        await runDailySetup();
        router.refresh();
      });
      return;
    }
    if ("action" in item && item.action === "rescue") {
      startTransition(async () => {
        await fetch("/api/coach/execute", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ actionType: "rescue_overdue", payload: {} }),
        });
        router.refresh();
      });
      return;
    }
    const href = "href" in item ? item.href : "/dashboard";
    if (href.startsWith("/dashboard#")) {
      const id = href.split("#")[1];
      document.getElementById(id)?.scrollIntoView({ behavior: "smooth", block: "start" });
      return;
    }
    router.push(href);
  }

  return (
    <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6">
      {actions.map((item) => {
        const Icon = item.icon;
        const isAction = "action" in item;
        return (
          <button
            key={item.label}
            type="button"
            disabled={isAction && pending}
            onClick={() => handleAction(item)}
            className={`${dashboardCardClass()} flex items-start gap-3 p-4 text-left transition-all hover:border-accent/30 hover:bg-card disabled:opacity-60`}
          >
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-accent/10 text-accent">
              {isAction && pending ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Icon className="h-4 w-4" />
              )}
            </div>
            <div>
              <p className="text-sm font-medium">{item.label}</p>
              <p className="mt-0.5 text-xs text-muted-foreground">{item.sub}</p>
            </div>
          </button>
        );
      })}
    </div>
  );
}

export { TimetableUpload } from "@/components/dashboard/TimetableUpload";
