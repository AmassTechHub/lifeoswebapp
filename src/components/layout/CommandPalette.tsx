"use client";

import { useEffect, useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Command } from "cmdk";
import { Loader2, Search, Settings, Zap } from "lucide-react";

import { navSections, settingsNavItem, type NavItem } from "@/config/navigation";
import { Award, BarChart2, ClipboardList, CreditCard, Database, PenLine } from "lucide-react";

const MORE_ITEMS: NavItem[] = [
  { title: "Planner",   href: "/planner",   icon: PenLine },
  { title: "Deadlines", href: "/deadlines", icon: ClipboardList },
  { title: "Grades",    href: "/grades",    icon: Award },
  { title: "Analytics", href: "/analytics", icon: BarChart2 },
  { title: "Databases", href: "/databases", icon: Database },
  { title: "Billing",   href: "/billing",   icon: CreditCard },
];

export function CommandPalette() {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [running, startTransition] = useTransition();
  const router = useRouter();
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const down = (e: KeyboardEvent) => {
      if ((e.key === "k" && (e.metaKey || e.ctrlKey)) || (e.key === "/" && !isInputElement(e.target))) {
        e.preventDefault();
        setOpen((o) => !o);
      }
      if (e.key === "Escape") setOpen(false);
    };
    document.addEventListener("keydown", down);
    return () => document.removeEventListener("keydown", down);
  }, []);

  useEffect(() => {
    if (open) {
      setQuery("");
      setTimeout(() => inputRef.current?.focus(), 10);
    }
  }, [open]);

  function runCommand(fn: () => void) {
    setOpen(false);
    fn();
  }

  async function runEngineAction() {
    runCommand(() => {
      startTransition(async () => {
        try {
          await fetch("/api/engine/run", { method: "POST" });
          router.refresh();
        } catch {
          // silent
        }
      });
    });
  }

  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-[100] flex items-start justify-center pt-[16vh]"
      onClick={() => setOpen(false)}
    >
      <div
        className="absolute inset-0 bg-black/50 backdrop-blur-sm"
        aria-hidden
      />
      <div
        className="relative w-full max-w-[560px] mx-4"
        onClick={(e) => e.stopPropagation()}
      >
        <Command
          className="rounded-2xl border border-border bg-card shadow-2xl overflow-hidden"
          shouldFilter={true}
          loop
        >
          <div className="flex items-center gap-3 border-b border-border px-4">
            <Search className="h-4 w-4 shrink-0 text-muted-foreground" />
            <Command.Input
              ref={inputRef}
              value={query}
              onValueChange={setQuery}
              placeholder="Search pages, actions..."
              className="flex h-12 w-full bg-transparent text-sm text-foreground outline-none placeholder:text-muted-foreground"
            />
            <div className="flex items-center gap-1 shrink-0">
              <kbd className="rounded border border-border bg-muted px-1.5 py-0.5 text-[10px] font-mono text-muted-foreground">
                ESC
              </kbd>
            </div>
          </div>

          <Command.List className="max-h-[360px] overflow-y-auto p-2 scrollbar-thin">
            <Command.Empty className="py-8 text-center text-sm text-muted-foreground">
              No results for &ldquo;{query}&rdquo;
            </Command.Empty>

            {navSections.map((section) => (
              <Command.Group
                key={section.label}
                heading={section.label}
                className="[&_[cmdk-group-heading]]:px-2 [&_[cmdk-group-heading]]:py-1.5 [&_[cmdk-group-heading]]:text-[10px] [&_[cmdk-group-heading]]:font-semibold [&_[cmdk-group-heading]]:uppercase [&_[cmdk-group-heading]]:tracking-wider [&_[cmdk-group-heading]]:text-muted-foreground"
              >
                {section.items.map((item) => {
                  const Icon = item.icon;
                  return (
                    <Command.Item
                      key={item.href}
                      value={item.title}
                      onSelect={() => runCommand(() => router.push(item.href))}
                      className="flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm text-muted-foreground cursor-pointer aria-selected:bg-accent/10 aria-selected:text-foreground transition-colors"
                    >
                      <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-accent/10">
                        <Icon className="h-4 w-4 text-accent" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="font-medium text-foreground">{item.title}</p>
                        <p className="text-xs text-muted-foreground truncate">{item.href}</p>
                      </div>
                    </Command.Item>
                  );
                })}
              </Command.Group>
            ))}

            <Command.Group
              heading="Actions"
            >
              <Command.Item
                value="life-engine"
                onSelect={runEngineAction}
                className="flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm text-muted-foreground cursor-pointer aria-selected:bg-accent/10 aria-selected:text-foreground transition-colors"
              >
                <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-warning/10">
                  {running ? (
                    <Loader2 className="h-4 w-4 text-warning animate-spin" />
                  ) : (
                    <Zap className="h-4 w-4 text-warning" />
                  )}
                </div>
                <div className="flex-1">
                  <p className="font-medium text-foreground">Run Life Engine</p>
                  <p className="text-xs text-muted-foreground">Regenerate today&apos;s plan and score</p>
                </div>
              </Command.Item>

              <Command.Item
                value="settings"
                onSelect={() => runCommand(() => router.push(settingsNavItem.href))}
                className="flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm text-muted-foreground cursor-pointer aria-selected:bg-accent/10 aria-selected:text-foreground transition-colors"
              >
                <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-muted">
                  <Settings className="h-4 w-4 text-muted-foreground" />
                </div>
                <div className="flex-1">
                  <p className="font-medium text-foreground">Settings</p>
                  <p className="text-xs text-muted-foreground">Profile, preferences, integrations</p>
                </div>
              </Command.Item>
            </Command.Group>
          </Command.List>

          <div className="border-t border-border px-4 py-2.5 flex items-center justify-between">
            <div className="flex items-center gap-3 text-xs text-muted-foreground">
              <span className="flex items-center gap-1">
                <kbd className="rounded border border-border bg-muted px-1 py-0.5 font-mono">↑↓</kbd>
                navigate
              </span>
              <span className="flex items-center gap-1">
                <kbd className="rounded border border-border bg-muted px-1 py-0.5 font-mono">↵</kbd>
                select
              </span>
            </div>
            <span className="text-xs text-muted-foreground">
              <kbd className="rounded border border-border bg-muted px-1 py-0.5 font-mono">⌘K</kbd>
            </span>
          </div>
        </Command>
      </div>
    </div>
  );
}

function isInputElement(target: EventTarget | null): boolean {
  if (!target) return false;
  const el = target as HTMLElement;
  return el.tagName === "INPUT" || el.tagName === "TEXTAREA" || el.isContentEditable;
}
