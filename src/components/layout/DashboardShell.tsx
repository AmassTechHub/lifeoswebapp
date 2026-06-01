export function DashboardShell({ children }: { children: React.ReactNode }) {
  return (
    <div className="relative min-h-full">
      <div className="pointer-events-none absolute inset-x-0 top-0 h-72 bg-[radial-gradient(ellipse_at_top,rgba(59,130,246,0.08),transparent_70%)]" />
      <div className="relative mx-auto max-w-7xl px-6 py-8 sm:px-8 sm:py-10">
        {children}
      </div>
    </div>
  );
}
