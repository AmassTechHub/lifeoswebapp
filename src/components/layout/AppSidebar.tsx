"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  Award, BarChart2, ChevronDown, ChevronRight,
  ClipboardList, CreditCard, Database, LogOut, Moon,
  PenLine, Settings, Sun,
} from "lucide-react";
import { useState } from "react";
import { useTheme } from "@/components/theme/ThemeProvider";

import { navSections, settingsNavItem, type NavItem } from "@/config/navigation";
import { authClient } from "@/lib/auth-client";
import { getInitials } from "@/lib/user";
import { cn } from "@/lib/utils";

// ── Role-aware "More" items ────────────────────────────────────────────────
// Items shown in the collapsed "More" section. Some are role-gated so they
// only surface when relevant to the user's use-case.
const ALL_MORE_ITEMS: (NavItem & { roles?: string[] })[] = [
  { title: "Planner",   href: "/planner",   icon: PenLine },
  { title: "Deadlines", href: "/deadlines", icon: ClipboardList, roles: ["student"] },
  { title: "Grades",    href: "/grades",    icon: Award,         roles: ["student"] },
  { title: "Analytics", href: "/analytics", icon: BarChart2 },
  { title: "Databases", href: "/databases", icon: Database },
  { title: "Billing",   href: "/billing",   icon: CreditCard },
];

// ── Which nav sections to show per role ────────────────────────────────────
// "Today" is always shown. Others are shown when the user has the
// matching use-case, or when no use-cases have been set yet (new account).
const SECTION_ROLES: Record<string, string[]> = {
  "Study":        ["student"],
  "Work":         ["creator", "professional"],
  "Life":         [],        // always shown
  "Today":        [],        // always shown
};

interface AppSidebarProps {
  isOpen?: boolean;
  onClose?: () => void;
  useCases?: string[];
}

export function AppSidebar({ isOpen = false, onClose, useCases = [] }: AppSidebarProps) {
  const pathname = usePathname();
  const { theme, toggleTheme } = useTheme();
  const { data: session, isPending } = authClient.useSession();
  const [signingOut, setSigningOut] = useState(false);
  const [moreOpen, setMoreOpen] = useState(false);

  const user = session?.user;
  const initials = user?.name ? getInitials(user.name) : "?";

  // Decide which sections to show. If the user has no use-cases set yet,
  // show everything so new accounts see the full system.
  const noRoleSet = useCases.length === 0;

  const visibleSections = navSections.filter((section) => {
    const required = SECTION_ROLES[section.label];
    if (!required) return true;              // no restriction
    if (required.length === 0) return true;  // always shown
    if (noRoleSet) return true;              // show all until user sets roles
    return required.some((r) => useCases.includes(r));
  });

  // More items — show role-gated ones only if role matches (or no roles set)
  const visibleMoreItems = ALL_MORE_ITEMS.filter((item) => {
    if (!item.roles || item.roles.length === 0) return true;
    if (noRoleSet) return true;
    return item.roles.some((r) => useCases.includes(r));
  });

  async function handleSignOut() {
    setSigningOut(true);
    await authClient.signOut();
    window.location.href = "/";
  }

  function isActive(href: string) {
    return pathname === href || pathname.startsWith(`${href}/`);
  }

  return (
    <aside
      className={cn(
        "fixed inset-y-0 left-0 z-50 flex h-screen w-[220px] shrink-0 flex-col",
        "border-r border-border/40 bg-background",
        "transition-transform duration-200 ease-out",
        "lg:static lg:z-auto lg:translate-x-0",
        isOpen ? "translate-x-0" : "-translate-x-full"
      )}
    >
      {/* ── Logo bar ──────────────────────────────────────────────── */}
      <div className="flex h-14 items-center gap-2 px-4 border-b border-border/30">
        <Link href="/dashboard" onClick={onClose} className="flex items-center gap-2 group">
          {/* Use the actual SVG icon */}
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/icon.svg" alt="Life OS" className="h-7 w-7 rounded-lg" />
          <span className="text-[14px] font-semibold tracking-tight text-foreground">Life OS</span>
        </Link>
        <button
          type="button"
          onClick={toggleTheme}
          className="ml-auto flex h-7 w-7 items-center justify-center rounded-md text-muted-foreground/50 transition-colors hover:bg-muted hover:text-foreground"
          aria-label="Toggle theme"
        >
          {theme === "dark" ? <Sun className="h-3.5 w-3.5" /> : <Moon className="h-3.5 w-3.5" />}
        </button>
      </div>

      {/* ── Nav ───────────────────────────────────────────────────── */}
      <nav className="flex-1 overflow-y-auto py-3 px-2 space-y-5">
        {visibleSections.map((section) => (
          <div key={section.label}>
            <p className="mb-1 px-2 text-[9.5px] font-semibold uppercase tracking-[0.1em] text-muted-foreground/35">
              {section.label}
            </p>
            <ul className="space-y-0.5">
              {section.items.map((item) => {
                const Icon = item.icon;
                const active = isActive(item.href);
                return (
                  <li key={item.href}>
                    <Link
                      href={item.href}
                      onClick={onClose}
                      className={cn(
                        "group flex items-center gap-2.5 rounded-lg px-2.5 py-2 text-[13px] font-medium transition-colors",
                        active
                          ? "bg-accent/10 text-accent"
                          : "text-muted-foreground hover:bg-muted/60 hover:text-foreground"
                      )}
                    >
                      <Icon className={cn(
                        "h-4 w-4 shrink-0 transition-colors",
                        active ? "text-accent" : "text-muted-foreground/50 group-hover:text-foreground"
                      )} />
                      {item.title}
                      {active && <span className="ml-auto h-1.5 w-1.5 rounded-full bg-accent" />}
                    </Link>
                  </li>
                );
              })}
            </ul>
          </div>
        ))}

        {/* ── More (collapsed) ────────────────────────────────────── */}
        {visibleMoreItems.length > 0 && (
          <div>
            <button
              type="button"
              onClick={() => setMoreOpen((v) => !v)}
              className="mb-1 flex w-full items-center gap-1.5 px-2 text-[9.5px] font-semibold uppercase tracking-[0.1em] text-muted-foreground/35 hover:text-muted-foreground/60 transition-colors"
            >
              {moreOpen ? <ChevronDown className="h-3 w-3" /> : <ChevronRight className="h-3 w-3" />}
              More
            </button>
            {moreOpen && (
              <ul className="space-y-0.5">
                {visibleMoreItems.map((item) => {
                  const Icon = item.icon;
                  const active = isActive(item.href);
                  return (
                    <li key={item.href}>
                      <Link
                        href={item.href}
                        onClick={onClose}
                        className={cn(
                          "group flex items-center gap-2.5 rounded-lg px-2.5 py-2 text-[13px] font-medium transition-colors",
                          active
                            ? "bg-accent/10 text-accent"
                            : "text-muted-foreground hover:bg-muted/60 hover:text-foreground"
                        )}
                      >
                        <Icon className={cn(
                          "h-4 w-4 shrink-0 transition-colors",
                          active ? "text-accent" : "text-muted-foreground/50 group-hover:text-foreground"
                        )} />
                        {item.title}
                        {active && <span className="ml-auto h-1.5 w-1.5 rounded-full bg-accent" />}
                      </Link>
                    </li>
                  );
                })}
              </ul>
            )}
          </div>
        )}
      </nav>

      {/* ── User footer ───────────────────────────────────────────── */}
      <div className="border-t border-border/30 px-2 py-3 space-y-0.5">
        <Link
          href={settingsNavItem.href}
          onClick={onClose}
          className={cn(
            "flex items-center gap-2.5 rounded-lg px-2.5 py-1.5 text-[12px] font-medium text-muted-foreground transition-colors hover:bg-muted/60 hover:text-foreground",
            isActive(settingsNavItem.href) && "bg-muted text-foreground"
          )}
        >
          <Settings className="h-3.5 w-3.5 shrink-0 text-muted-foreground/50" />
          Settings
        </Link>

        <div className="flex items-center gap-2.5 rounded-lg px-2.5 py-2">
          <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-accent/15 text-[11px] font-bold text-accent">
            {isPending ? "·" : initials}
          </div>
          <div className="min-w-0 flex-1">
            <p className="truncate text-[12px] font-medium text-foreground leading-none">
              {user?.name ?? "Account"}
            </p>
            <p className="mt-0.5 truncate text-[10px] text-muted-foreground/50 leading-none">
              {user?.email ?? ""}
            </p>
          </div>
          <button
            type="button"
            onClick={handleSignOut}
            disabled={signingOut || isPending || !user}
            className="flex h-6 w-6 shrink-0 items-center justify-center rounded text-muted-foreground/30 transition-colors hover:text-danger disabled:opacity-30"
            aria-label="Sign out"
          >
            <LogOut className="h-3.5 w-3.5" />
          </button>
        </div>
      </div>
    </aside>
  );
}
