"use client";

import { useState } from "react";
import { Menu, X } from "lucide-react";

import { AppSidebar } from "@/components/layout/AppSidebar";
import { CommandPalette } from "@/components/layout/CommandPalette";
import { VoiceAssistant } from "@/components/ai/VoiceAssistant";
import { ProductivityNudge } from "@/components/coach/ProductivityNudge";
import { NotificationPermissionPrompt } from "@/components/notifications/NotificationPermissionPrompt";

export function AppLayoutClient({ children }: { children: React.ReactNode }) {
  const [open, setOpen] = useState(false);

  return (
    <div className="flex min-h-screen bg-background">
      {/* Mobile backdrop */}
      {open && (
        <div
          className="fixed inset-0 z-40 bg-black/50 backdrop-blur-sm lg:hidden"
          onClick={() => setOpen(false)}
        />
      )}

      {/* Sidebar */}
      <AppSidebar isOpen={open} onClose={() => setOpen(false)} />

      {/* Content column */}
      <div className="flex min-w-0 flex-1 flex-col overflow-x-hidden">
        {/* Mobile top bar */}
        <header className="sticky top-0 z-30 flex h-14 items-center justify-between border-b border-border bg-background/80 px-4 backdrop-blur-md lg:hidden">
          <span className="text-base font-semibold tracking-tight">Life OS</span>
          <button
            type="button"
            onClick={() => setOpen((v) => !v)}
            className="flex h-9 w-9 items-center justify-center rounded-lg border border-border text-muted-foreground hover:bg-muted"
            aria-label="Toggle sidebar"
          >
            {open ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
          </button>
        </header>

        <main className="min-w-0 flex-1 overflow-x-hidden overflow-y-auto">{children}</main>
      </div>

      <CommandPalette />
      <VoiceAssistant />
      <ProductivityNudge />
      <NotificationPermissionPrompt />
    </div>
  );
}
