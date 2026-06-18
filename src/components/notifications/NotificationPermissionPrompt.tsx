"use client";

import { useEffect, useState } from "react";
import { Bell } from "lucide-react";

import { Button } from "@/components/ui/button";
import { pushSupported, subscribeToPush } from "@/lib/push/client";

const DISMISS_KEY = "life-os-notif-prompt-dismissed";

export function NotificationPermissionPrompt() {
  const [show, setShow] = useState(false);
  const [working, setWorking] = useState(false);

  useEffect(() => {
    if (!pushSupported()) return;
    if (typeof Notification === "undefined") return;
    if (Notification.permission !== "default") return; // already granted or denied — nothing to ask
    if (localStorage.getItem(DISMISS_KEY)) return;

    // Small delay so it doesn't fire instantly on page load
    const timer = setTimeout(() => setShow(true), 1500);
    return () => clearTimeout(timer);
  }, []);

  function dismiss() {
    setShow(false);
    localStorage.setItem(DISMISS_KEY, "1");
  }

  async function handleEnable() {
    setWorking(true);
    try {
      await subscribeToPush();
    } catch {
      // Permission denied or subscription failed — don't nag again this device
    } finally {
      setWorking(false);
      dismiss();
    }
  }

  if (!show) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 backdrop-blur-sm">
      <div className="w-full max-w-sm rounded-2xl border border-border bg-card p-6 shadow-2xl">
        <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-accent/15">
          <Bell className="h-6 w-6 text-accent" />
        </div>
        <h2 className="mt-4 text-center text-lg font-semibold text-foreground">
          Stay on top of your day
        </h2>
        <p className="mt-2 text-center text-sm text-muted-foreground">
          Turn on notifications to get alerted the moment a study session, task, or deadline is starting — even when Life OS isn&apos;t open.
        </p>
        <div className="mt-5 flex gap-2">
          <Button variant="outline" className="flex-1" onClick={dismiss} disabled={working}>
            Not now
          </Button>
          <Button className="flex-1" onClick={handleEnable} disabled={working}>
            {working ? "Enabling…" : "Enable notifications"}
          </Button>
        </div>
      </div>
    </div>
  );
}
