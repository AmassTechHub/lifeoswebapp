import { cn } from "@/lib/utils";

export function ProductPreviewGlow({
  children,
  className,
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <div className={cn("relative", className)}>
      <div className="pointer-events-none absolute inset-x-[10%] top-1/4 -bottom-8 rounded-full bg-accent/12 blur-3xl" />
      <div className="relative">{children}</div>
    </div>
  );
}
