import { cn } from "@/lib/utils";

export function LifeOSMark({ className }: { className?: string }) {
  return (
    <div
      className={cn(
        "relative flex h-9 w-9 items-center justify-center rounded-xl bg-accent shadow-lg shadow-accent/25",
        className
      )}
    >
      <div className="h-3 w-3 rounded-sm bg-white/90" />
      <div className="absolute inset-0 rounded-xl bg-white/10" />
    </div>
  );
}
