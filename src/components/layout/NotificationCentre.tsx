"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { Bell, BellOff, BookOpen, Calendar, CheckCircle2, Layers, Target, X, Zap } from "lucide-react";
import { cn } from "@/lib/utils";

type NotifType = "flashcards" | "exam" | "streak" | "task" | "session" | "system";

type Notification = {
  id: string;
  type: NotifType;
  title: string;
  body: string;
  href?: string;
  readAt?: string;
  createdAt: string;
};

const TYPE_ICONS: Record<NotifType, React.ElementType> = {
  flashcards: Layers,
  exam: Target,
  streak: Zap,
  task: CheckCircle2,
  session: BookOpen,
  system: Bell,
};

const TYPE_COLORS: Record<NotifType, string> = {
  flashcards: "text-amber-400",
  exam: "text-rose-400",
  streak: "text-orange-400",
  task: "text-success",
  session: "text-accent",
  system: "text-muted-foreground",
};

// Local notification store — built from app state
function buildLocalNotifications(): Notification[] {
  if (typeof window === "undefined") return [];
  try {
    const stored = localStorage.getItem("lifeos-notifications");
    return stored ? JSON.parse(stored) : [];
  } catch { return []; }
}

function saveLocalNotifications(notifs: Notification[]) {
  localStorage.setItem("lifeos-notifications", JSON.stringify(notifs.slice(0, 50)));
}

export function addNotification(notif: Omit<Notification, "id" | "createdAt">) {
  if (typeof window === "undefined") return;
  const all = buildLocalNotifications();
  const newNotif: Notification = {
    ...notif,
    id: `${Date.now()}-${Math.random().toString(36).slice(2)}`,
    createdAt: new Date().toISOString(),
  };
  saveLocalNotifications([newNotif, ...all]);
  window.dispatchEvent(new CustomEvent("lifeos-notification-added"));
}

function timeAgo(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return "just now";
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  return `${Math.floor(hrs / 24)}d ago`;
}

export function NotificationCentre() {
  const [open, setOpen] = useState(false);
  const [notifs, setNotifs] = useState<Notification[]>([]);
  const panelRef = useRef<HTMLDivElement>(null);

  function reload() {
    setNotifs(buildLocalNotifications());
  }

  useEffect(() => {
    reload();
    window.addEventListener("lifeos-notification-added", reload);
    return () => window.removeEventListener("lifeos-notification-added", reload);
  }, []);

  // Close on outside click
  useEffect(() => {
    if (!open) return;
    function handle(e: MouseEvent) {
      if (panelRef.current && !panelRef.current.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener("mousedown", handle);
    return () => document.removeEventListener("mousedown", handle);
  }, [open]);

  const unread = notifs.filter(n => !n.readAt).length;

  function markAllRead() {
    const updated = notifs.map(n => ({ ...n, readAt: n.readAt ?? new Date().toISOString() }));
    saveLocalNotifications(updated);
    setNotifs(updated);
  }

  function dismiss(id: string) {
    const updated = notifs.filter(n => n.id !== id);
    saveLocalNotifications(updated);
    setNotifs(updated);
  }

  function markRead(id: string) {
    const updated = notifs.map(n => n.id === id ? { ...n, readAt: new Date().toISOString() } : n);
    saveLocalNotifications(updated);
    setNotifs(updated);
  }

  return (
    <div className="relative" ref={panelRef}>
      <button
        type="button"
        onClick={() => { setOpen(v => !v); if (!open) markAllRead(); }}
        className="relative flex h-9 w-9 items-center justify-center rounded-xl border border-border/50 text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
        aria-label="Notifications"
      >
        <Bell className="h-4 w-4" />
        {unread > 0 && (
          <span className="absolute -right-1 -top-1 flex h-4 min-w-4 items-center justify-center rounded-full bg-accent px-1 text-[9px] font-bold text-white">
            {unread > 9 ? "9+" : unread}
          </span>
        )}
      </button>

      {open && (
        <div className="absolute right-0 top-11 z-50 w-80 rounded-2xl border border-border/70 bg-popover shadow-xl">
          {/* Header */}
          <div className="flex items-center justify-between border-b border-border/50 px-4 py-3">
            <p className="text-sm font-semibold text-foreground">Notifications</p>
            <div className="flex items-center gap-2">
              {notifs.length > 0 && (
                <button
                  type="button"
                  onClick={() => { saveLocalNotifications([]); setNotifs([]); }}
                  className="text-[11px] text-muted-foreground hover:text-foreground"
                >
                  Clear all
                </button>
              )}
              <button type="button" onClick={() => setOpen(false)}
                className="rounded p-0.5 text-muted-foreground/40 hover:text-muted-foreground">
                <X className="h-3.5 w-3.5" />
              </button>
            </div>
          </div>

          {/* List */}
          <div className="max-h-80 overflow-y-auto">
            {notifs.length === 0 ? (
              <div className="flex flex-col items-center gap-2 py-10 text-center">
                <BellOff className="h-8 w-8 text-muted-foreground/20" />
                <p className="text-sm text-muted-foreground">No notifications yet</p>
                <p className="text-xs text-muted-foreground/60">
                  Study completions, exam alerts, and streak reminders will appear here.
                </p>
              </div>
            ) : (
              notifs.map(n => {
                const Icon = TYPE_ICONS[n.type] ?? Bell;
                const color = TYPE_COLORS[n.type] ?? "text-muted-foreground";
                const content = (
                  <div
                    key={n.id}
                    className={cn(
                      "flex gap-3 px-4 py-3 transition-colors hover:bg-muted/30",
                      !n.readAt && "bg-accent/5"
                    )}
                    onClick={() => markRead(n.id)}
                  >
                    <div className={cn("mt-0.5 shrink-0", color)}>
                      <Icon className="h-4 w-4" />
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="text-xs font-semibold text-foreground">{n.title}</p>
                      <p className="mt-0.5 text-xs text-muted-foreground leading-snug">{n.body}</p>
                      <p className="mt-1 text-[10px] text-muted-foreground/50">{timeAgo(n.createdAt)}</p>
                    </div>
                    <button
                      type="button"
                      onClick={(e) => { e.stopPropagation(); dismiss(n.id); }}
                      className="shrink-0 rounded p-0.5 text-muted-foreground/20 hover:text-muted-foreground"
                    >
                      <X className="h-3 w-3" />
                    </button>
                  </div>
                );
                return n.href ? (
                  <Link key={n.id} href={n.href} onClick={() => setOpen(false)}>
                    {content}
                  </Link>
                ) : <div key={n.id}>{content}</div>;
              })
            )}
          </div>

          {/* Footer links */}
          <div className="border-t border-border/40 px-4 py-2.5">
            <Link
              href="/settings"
              onClick={() => setOpen(false)}
              className="flex items-center gap-1.5 text-[11px] text-muted-foreground hover:text-foreground"
            >
              <Calendar className="h-3 w-3" />
              Manage notification settings
            </Link>
          </div>
        </div>
      )}
    </div>
  );
}
