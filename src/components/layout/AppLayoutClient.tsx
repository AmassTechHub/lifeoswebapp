"use client";

import { useState } from "react";
import { Menu, X } from "lucide-react";

import { AppSidebar } from "@/components/layout/AppSidebar";
import { CommandPalette } from "@/components/layout/CommandPalette";
import { NotificationCentre } from "@/components/layout/NotificationCentre";
import { VoiceAssistant } from "@/components/ai/VoiceAssistant";
import { ProductivityNudge } from "@/components/coach/ProductivityNudge";
import { NotificationPermissionPrompt } from "@/components/notifications/NotificationPermissionPrompt";

export function AppLayoutClient({
  children,
  useCases = [],
}: {
  children: React.ReactNode;
  useCases?: string[];
}) {
  const [open, setOpen] = useState(false);

  return (
    <div className="flex h-screen overflow-hidden bg-background">
      {/* Mobile backdrop */}
      {open && (
        <div
          className="fixed inset-0 z-40 bg-black/50 backdrop-blur-sm lg:hidden"
          onClick={() => setOpen(false)}
        />
      )}

      {/* Sidebar — sticky on desktop, fixed overlay on mobile */}
      <AppSidebar isOpen={open} onClose={() => setOpen(false)} useCases={useCases} />

      {/* Main content column — scrolls independently */}
      <div className="flex min-w-0 flex-1 flex-col overflow-x-hidden overflow-y-auto">

        {/* Mobile top bar */}
        <header className="sticky top-0 z-30 flex h-14 shrink-0 items-center justify-between border-b border-border/40 bg-background/90 px-4 backdrop-blur-md lg:hidden">
          <div className="flex items-center gap-2">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src="/icon.svg" alt="Life OS" className="h-7 w-7 rounded-lg" />
            <span className="text-[14px] font-semibold tracking-tight text-foreground">
              Life OS
            </span>
          </div>
          <div className="flex items-center gap-2">
            <NotificationCentre />
            <button
              type="button"
              onClick={() => setOpen((v) => !v)}
              className="flex h-9 w-9 items-center justify-center rounded-lg border border-border/50 text-muted-foreground transition-colors hover:bg-muted"
              aria-label="Toggle sidebar"
            >
              {open ? <X className="h-4 w-4" /> : <Menu className="h-4 w-4" />}
            </button>
          </div>
        </header>

        <main className="min-w-0 flex-1">
          {children}
        </main>
      </div>

      <CommandPalette />
      <VoiceAssistant />
      <ProductivityNudge />
      <NotificationPermissionPrompt />
    </div>
  );
}
