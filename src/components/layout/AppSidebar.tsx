"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { Loader2, LogOut, Settings } from "lucide-react";

import { ThemeToggle } from "@/components/theme/ThemeToggle";
import { navSections, settingsNavItem } from "@/config/navigation";
import { Button } from "@/components/ui/button";
import { authClient } from "@/lib/auth-client";
import { getInitials } from "@/lib/user";
import { cn } from "@/lib/utils";

interface AppSidebarProps {
  isOpen?: boolean;
  onClose?: () => void;
}

export function AppSidebar({ isOpen = false, onClose }: AppSidebarProps) {
  const pathname = usePathname();
  const router = useRouter();
  const { data: session, isPending } = authClient.useSession();

  const user = session?.user;
  const initials = user?.name ? getInitials(user.name) : "?";
  const displayName = user?.name ?? "Loading...";

  async function handleSignOut() {
    await authClient.signOut();
    router.push("/");
    router.refresh();
  }

  function isActive(href: string) {
    return pathname === href || pathname.startsWith(`${href}/`);
  }

  function handleNavClick() {
    onClose?.();
  }

  return (
    <aside
      className={cn(
        "fixed inset-y-0 left-0 z-50 flex h-screen w-64 shrink-0 flex-col border-r border-border bg-primary transition-transform duration-300 ease-in-out",
        "lg:static lg:z-auto lg:translate-x-0",
        isOpen ? "translate-x-0" : "-translate-x-full"
      )}
    >
      {/* Logo */}
      <div className="border-b border-border px-6 py-5">
        <Link href="/dashboard" className="block" onClick={handleNavClick}>
          <p className="text-lg font-semibold tracking-tight text-foreground">Life OS</p>
          <p className="mt-0.5 text-xs text-muted-foreground">Your daily operating system</p>
        </Link>
      </div>

      {/* Theme toggle */}
      <div className="border-b border-border px-4 py-3">
        <ThemeToggle className="w-full justify-start" />
      </div>

      {/* Nav */}
      <nav className="flex-1 overflow-y-auto px-3 py-4">
        {navSections.map((section) => (
          <div key={section.label} className="mb-5 last:mb-0">
            <p className="mb-2 px-3 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground/80">
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
                      onClick={handleNavClick}
                      className={cn(
                        "flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-all",
                        active
                          ? "bg-accent/15 text-accent ring-1 ring-accent/20"
                          : "text-muted-foreground hover:bg-muted hover:text-foreground"
                      )}
                    >
                      <Icon className="h-4 w-4 shrink-0" />
                      {item.title}
                    </Link>
                  </li>
                );
              })}
            </ul>
          </div>
        ))}
      </nav>

      {/* User footer */}
      <div className="border-t border-border p-4">
        <div className="rounded-xl border border-border/60 bg-card/60 p-3">
          <div className="flex items-center gap-3">
            <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-accent/20 text-sm font-semibold text-accent">
              {isPending ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                initials
              )}
            </div>
            <div className="min-w-0 flex-1">
              <p className="truncate text-sm font-medium text-foreground">{displayName}</p>
              <p className="truncate text-xs text-muted-foreground">{user?.email ?? ""}</p>
            </div>
          </div>

          <div className="mt-3 flex gap-2">
            <Button
              variant="ghost"
              size="sm"
              className={cn(
                "flex-1 justify-start gap-2 px-2",
                isActive(settingsNavItem.href) && "bg-accent/10 text-accent"
              )}
              asChild
            >
              <Link href={settingsNavItem.href} onClick={handleNavClick}>
                <Settings className="h-4 w-4" />
                Settings
              </Link>
            </Button>
            <Button
              variant="ghost"
              size="sm"
              className="gap-2 px-2 text-muted-foreground hover:text-danger"
              onClick={handleSignOut}
              disabled={isPending || !user}
            >
              <LogOut className="h-4 w-4" />
              Logout
            </Button>
          </div>
        </div>
      </div>
    </aside>
  );
}
