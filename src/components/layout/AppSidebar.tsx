"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { LogOut, Moon, Sun } from "lucide-react";
import { useState } from "react";
import { useTheme } from "@/components/theme/ThemeProvider";

import { navSections, settingsNavItem } from "@/config/navigation";
import { authClient } from "@/lib/auth-client";
import { getInitials } from "@/lib/user";
import { cn } from "@/lib/utils";

interface AppSidebarProps {
  isOpen?: boolean;
  onClose?: () => void;
}

export function AppSidebar({ isOpen = false, onClose }: AppSidebarProps) {
  const pathname = usePathname();
  const { theme, toggleTheme } = useTheme();
  const { data: session, isPending } = authClient.useSession();
  const [signingOut, setSigningOut] = useState(false);

  const user = session?.user;
  const initials = user?.name ? getInitials(user.name) : "?";

  async function handleSignOut() {
    setSigningOut(true);
    await authClient.signOut();
    // Hard navigation — discards client-side router cache so the next user
    // to sign in on this device can never see this account's cached pages.
    window.location.href = "/";
  }

  function isActive(href: string) {
    return pathname === href || pathname.startsWith(`${href}/`);
  }

  return (
    <aside
      className={cn(
        "fixed inset-y-0 left-0 z-50 flex h-screen w-56 shrink-0 flex-col bg-background border-r border-border/50 transition-transform duration-200 ease-out",
        "lg:static lg:z-auto lg:translate-x-0",
        isOpen ? "translate-x-0" : "-translate-x-full"
      )}
    >
      {/* Wordmark */}
      <div className="flex h-14 items-center justify-between px-5">
        <Link
          href="/dashboard"
          onClick={onClose}
          className="text-[15px] font-semibold tracking-tight text-foreground"
        >
          Life OS
        </Link>
        <button
          type="button"
          onClick={toggleTheme}
          className="flex h-7 w-7 items-center justify-center rounded-md text-muted-foreground/60 transition-colors hover:bg-muted hover:text-foreground"
          aria-label="Toggle theme"
        >
          {theme === "dark" ? (
            <Sun className="h-3.5 w-3.5" />
          ) : (
            <Moon className="h-3.5 w-3.5" />
          )}
        </button>
      </div>

      {/* Nav */}
      <nav className="flex-1 overflow-y-auto px-2 py-2">
        {navSections.map((section, si) => (
          <div key={section.label} className={cn(si > 0 && "mt-5")}>
            <p className="mb-1 px-3 text-[10px] font-medium uppercase tracking-widest text-muted-foreground/40">
              {section.label}
            </p>
            {section.items.map((item) => {
              const Icon = item.icon;
              const active = isActive(item.href);
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  onClick={onClose}
                  className={cn(
                    "group flex items-center gap-2.5 rounded-md px-3 py-1.5 text-[13px] font-medium transition-colors",
                    active
                      ? "bg-accent/10 text-accent"
                      : "text-muted-foreground hover:bg-muted/60 hover:text-foreground"
                  )}
                >
                  <Icon
                    className={cn(
                      "h-3.5 w-3.5 shrink-0 transition-colors",
                      active ? "text-accent" : "text-muted-foreground/60 group-hover:text-foreground"
                    )}
                  />
                  {item.title}
                </Link>
              );
            })}
          </div>
        ))}
      </nav>

      {/* User */}
      <div className="border-t border-border/50 px-2 py-3">
        <Link
          href={settingsNavItem.href}
          onClick={onClose}
          className={cn(
            "flex items-center gap-2.5 rounded-md px-3 py-2 transition-colors hover:bg-muted/60",
            isActive(settingsNavItem.href) && "bg-muted"
          )}
        >
          <div className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-accent/15 text-[10px] font-bold text-accent">
            {isPending ? "·" : initials}
          </div>
          <div className="min-w-0 flex-1">
            <p className="truncate text-[12px] font-medium text-foreground leading-none">
              {user?.name ?? "Account"}
            </p>
            <p className="mt-0.5 truncate text-[11px] text-muted-foreground/60 leading-none">
              {user?.email ?? ""}
            </p>
          </div>
          <button
            type="button"
            onClick={(e) => { e.preventDefault(); handleSignOut(); }}
            disabled={signingOut || isPending || !user}
            className="ml-auto flex h-6 w-6 shrink-0 items-center justify-center rounded text-muted-foreground/40 transition-colors hover:text-danger disabled:opacity-30"
            aria-label="Sign out"
          >
            <LogOut className="h-3.5 w-3.5" />
          </button>
        </Link>
      </div>
    </aside>
  );
}
