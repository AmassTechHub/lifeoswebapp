import { Skeleton } from "@/components/ui/skeleton";

export function PageSkeleton({
  cards = 4,
  columns = 1,
  hasHeader = true,
}: {
  cards?: number;
  columns?: number;
  hasHeader?: boolean;
}) {
  const gridClass =
    columns === 3
      ? "grid gap-4 sm:grid-cols-2 lg:grid-cols-3"
      : columns === 2
        ? "grid gap-4 sm:grid-cols-2"
        : "space-y-4";

  return (
    <div className="space-y-6">
      {hasHeader && (
        <div className="space-y-2">
          <Skeleton className="h-7 w-48" />
          <Skeleton className="h-4 w-72" />
        </div>
      )}
      <div className={gridClass}>
        {Array.from({ length: cards }).map((_, i) => (
          <div
            key={i}
            className="rounded-2xl border border-border/60 bg-card/80 p-5 space-y-3"
          >
            <Skeleton className="h-4 w-32" />
            <Skeleton className="h-10 w-full" />
            <Skeleton className="h-4 w-4/5" />
            <Skeleton className="h-4 w-2/3" />
          </div>
        ))}
      </div>
    </div>
  );
}

export function KanbanSkeleton() {
  return (
    <div className="space-y-6">
      <div className="space-y-2">
        <Skeleton className="h-7 w-32" />
        <Skeleton className="h-4 w-64" />
      </div>
      <div className="grid gap-4 md:grid-cols-3">
        {["To Do", "In Progress", "Done"].map((col) => (
          <div key={col} className="space-y-3">
            <Skeleton className="h-6 w-24" />
            {Array.from({ length: 3 }).map((_, i) => (
              <div key={i} className="rounded-xl border border-border/60 bg-card p-3 space-y-2">
                <Skeleton className="h-4 w-4/5" />
                <Skeleton className="h-3 w-1/2" />
              </div>
            ))}
          </div>
        ))}
      </div>
    </div>
  );
}

export function DashboardSkeleton() {
  return (
    <div className="space-y-6">
      <div className="space-y-2">
        <Skeleton className="h-4 w-32" />
        <Skeleton className="h-8 w-56" />
      </div>
      {/* Engine banner */}
      <Skeleton className="h-24 w-full rounded-2xl" />
      {/* Today OS */}
      <Skeleton className="h-48 w-full rounded-2xl" />
      {/* Stats grid */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {Array.from({ length: 6 }).map((_, i) => (
          <div key={i} className="rounded-2xl border border-border/60 bg-card/80 p-5 space-y-3">
            <Skeleton className="h-4 w-28" />
            <Skeleton className="h-8 w-20" />
            <Skeleton className="h-3 w-full" />
          </div>
        ))}
      </div>
    </div>
  );
}

export function ChatSkeleton() {
  return (
    <div className="flex h-[calc(100vh-10rem)] flex-col gap-4">
      <div className="flex gap-2">
        {Array.from({ length: 4 }).map((_, i) => (
          <Skeleton key={i} className="h-8 w-24 rounded-full" />
        ))}
      </div>
      <div className="flex-1 rounded-2xl border border-border bg-card/80 p-6 space-y-4">
        <div className="flex gap-3">
          <Skeleton className="h-8 w-8 rounded-full shrink-0" />
          <Skeleton className="h-16 flex-1 rounded-2xl" />
        </div>
      </div>
    </div>
  );
}

export function FinanceSkeleton() {
  return (
    <div className="space-y-6">
      <div className="space-y-2">
        <Skeleton className="h-7 w-32" />
        <Skeleton className="h-4 w-64" />
      </div>
      <div className="grid gap-4 sm:grid-cols-3">
        {Array.from({ length: 3 }).map((_, i) => (
          <div key={i} className="rounded-2xl border border-border/60 bg-card/80 p-5 flex items-center gap-4">
            <Skeleton className="h-11 w-11 rounded-2xl shrink-0" />
            <div className="space-y-2 flex-1">
              <Skeleton className="h-3 w-28" />
              <Skeleton className="h-6 w-20" />
            </div>
          </div>
        ))}
      </div>
      <div className="grid gap-6 lg:grid-cols-2">
        <div className="rounded-2xl border border-border/60 bg-card/80 p-5 space-y-4">
          <Skeleton className="h-5 w-40" />
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="space-y-1">
              <div className="flex justify-between">
                <Skeleton className="h-3 w-24" />
                <Skeleton className="h-3 w-16" />
              </div>
              <Skeleton className="h-1.5 w-full rounded-full" />
            </div>
          ))}
        </div>
        <div className="rounded-2xl border border-border/60 bg-card/80 p-5 space-y-3">
          <Skeleton className="h-5 w-40" />
          {Array.from({ length: 5 }).map((_, i) => (
            <Skeleton key={i} className="h-10 w-full rounded-xl" />
          ))}
        </div>
      </div>
    </div>
  );
}

export function StudySkeleton() {
  return (
    <div className="space-y-6">
      <Skeleton className="h-20 w-full rounded-2xl" />
      <div className="grid gap-6 lg:grid-cols-[240px_1fr]">
        <div className="space-y-3">
          <Skeleton className="h-5 w-24" />
          {Array.from({ length: 4 }).map((_, i) => (
            <Skeleton key={i} className="h-9 w-full rounded-lg" />
          ))}
        </div>
        <div className="space-y-4">
          <Skeleton className="h-32 w-full rounded-2xl" />
          <div className="flex gap-2">
            {Array.from({ length: 4 }).map((_, i) => (
              <Skeleton key={i} className="h-9 w-24 rounded-lg" />
            ))}
          </div>
          <div className="grid gap-4 lg:grid-cols-2">
            <Skeleton className="h-48 w-full rounded-2xl" />
            <div className="space-y-3">
              {Array.from({ length: 3 }).map((_, i) => (
                <Skeleton key={i} className="h-16 w-full rounded-xl" />
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
