"use client";

import { useRouter } from "next/navigation";
import {
  Calendar,
  ClipboardList,
  ListChecks,
  Upload,
} from "lucide-react";

import { dashboardCardClass } from "@/components/dashboard/dashboard-styles";

const actions = [
  {
    icon: ListChecks,
    label: "Generate today's focus",
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
    icon: Upload,
    label: "Upload timetable",
    sub: "Schedule your week automatically",
    href: "/dashboard#timetable",
  },
] as const;

export function SmartActions() {
  const router = useRouter();

  function handleAction(href: string) {
    if (href.startsWith("/dashboard#")) {
      const id = href.split("#")[1];
      document.getElementById(id)?.scrollIntoView({ behavior: "smooth", block: "start" });
      return;
    }
    router.push(href);
  }

  return (
    <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
      {actions.map(({ icon: Icon, label, sub, href }) => (
        <button
          key={label}
          type="button"
          onClick={() => handleAction(href)}
          className={`${dashboardCardClass()} flex items-start gap-3 p-4 text-left transition-all hover:border-accent/30 hover:bg-card`}
        >
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-accent/10 text-accent">
            <Icon className="h-4 w-4" />
          </div>
          <div>
            <p className="text-sm font-medium">{label}</p>
            <p className="mt-0.5 text-xs text-muted-foreground">{sub}</p>
          </div>
        </button>
      ))}
    </div>
  );
}

export { TimetableUpload } from "@/components/dashboard/TimetableUpload";
