import { cn } from "@/lib/utils";

export function dashboardCardClass(highlight = false) {
  return cn(
    "rounded-xl border bg-card/80 shadow-sm backdrop-blur-sm",
    highlight ? "border-accent/25" : "border-border/70"
  );
}
