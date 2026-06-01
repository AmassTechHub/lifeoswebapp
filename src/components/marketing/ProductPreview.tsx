import { Bot, Calendar, CheckSquare, Target } from "lucide-react";

const sidebarItems = [
  { icon: Target, label: "Goals", active: false },
  { icon: CheckSquare, label: "Tasks", active: true },
  { icon: Calendar, label: "Calendar", active: false },
  { icon: Bot, label: "AI Coach", active: false },
];

export function ProductPreview() {
  return (
    <section className="px-6 pb-24">
      <div className="mx-auto max-w-6xl">
        <div className="overflow-hidden rounded-2xl border border-white/10 bg-[#0a0f1a] shadow-2xl shadow-black/50">
          <div className="flex items-center gap-2 border-b border-white/5 px-4 py-3">
            <div className="h-3 w-3 rounded-full bg-danger/80" />
            <div className="h-3 w-3 rounded-full bg-warning/80" />
            <div className="h-3 w-3 rounded-full bg-success/80" />
            <span className="ml-3 text-xs text-muted-foreground">
              Life OS · Dashboard
            </span>
          </div>

          <div className="grid md:grid-cols-[220px_1fr]">
            <div className="border-r border-white/5 bg-primary/80 p-4">
              <p className="mb-4 text-sm font-semibold text-white">Life OS</p>
              <div className="space-y-1">
                {sidebarItems.map(({ icon: Icon, label, active }) => (
                  <div
                    key={label}
                    className={`flex items-center gap-2 rounded-lg px-3 py-2 text-sm ${
                      active
                        ? "bg-accent/15 text-accent"
                        : "text-muted-foreground"
                    }`}
                  >
                    <Icon className="h-4 w-4" />
                    {label}
                  </div>
                ))}
              </div>
            </div>

            <div className="p-6">
              <p className="text-sm text-muted-foreground">Good morning</p>
              <h2 className="mt-1 text-xl font-semibold text-white">
                Today&apos;s Focus
              </h2>
              <div className="mt-6 space-y-3">
                {[
                  "Finish React assignment before 4 PM",
                  "Record AmassTechHub script",
                  "Review client deliverables",
                ].map((item, i) => (
                  <div
                    key={item}
                    className="flex items-center gap-3 rounded-xl border border-white/5 bg-card/80 px-4 py-3 text-sm text-foreground"
                  >
                    <span className="flex h-6 w-6 items-center justify-center rounded-full bg-accent/15 text-xs font-semibold text-accent">
                      {i + 1}
                    </span>
                    {item}
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
