"use client";

import { useEffect, useState } from "react";
import { Download } from "lucide-react";

type BeforeInstallPromptEvent = Event & { prompt: () => Promise<void>; userChoice: Promise<{ outcome: string }> };

export function PWARegister() {
  const [installPrompt, setInstallPrompt] = useState<BeforeInstallPromptEvent | null>(null);
  const [showBanner, setShowBanner] = useState(false);

  useEffect(() => {
    if (typeof window === "undefined" || !("serviceWorker" in navigator)) return;

    navigator.serviceWorker
      .register("/sw.js", { scope: "/" })
      .then((reg) => {
        reg.addEventListener("updatefound", () => {
          const worker = reg.installing;
          worker?.addEventListener("statechange", () => {
            if (worker.state === "installed" && navigator.serviceWorker.controller) {
              // New version available — could show update toast
            }
          });
        });
      })
      .catch(() => null);

    const handler = (e: Event) => {
      e.preventDefault();
      setInstallPrompt(e as BeforeInstallPromptEvent);
      const dismissed = sessionStorage.getItem("pwa-banner-dismissed");
      if (!dismissed) setShowBanner(true);
    };

    window.addEventListener("beforeinstallprompt", handler);
    return () => window.removeEventListener("beforeinstallprompt", handler);
  }, []);

  async function handleInstall() {
    if (!installPrompt) return;
    await installPrompt.prompt();
    const { outcome } = await installPrompt.userChoice;
    if (outcome === "accepted") setShowBanner(false);
  }

  function dismiss() {
    setShowBanner(false);
    sessionStorage.setItem("pwa-banner-dismissed", "1");
  }

  if (!showBanner) return null;

  return (
    <div className="fixed bottom-4 left-1/2 z-50 -translate-x-1/2 w-[calc(100vw-2rem)] max-w-sm">
      <div className="flex items-center gap-3 rounded-2xl border border-border/80 bg-card/95 px-4 py-3 shadow-lg backdrop-blur-md">
        <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-accent/15">
          <Download className="h-4 w-4 text-accent" />
        </div>
        <div className="min-w-0 flex-1">
          <p className="text-sm font-semibold text-foreground">Install Life OS</p>
          <p className="text-xs text-muted-foreground">Add to your home screen for offline access</p>
        </div>
        <div className="flex shrink-0 gap-2">
          <button
            type="button"
            onClick={dismiss}
            className="rounded-lg px-2.5 py-1.5 text-xs text-muted-foreground hover:bg-muted"
          >
            Later
          </button>
          <button
            type="button"
            onClick={handleInstall}
            className="rounded-lg bg-accent px-3 py-1.5 text-xs font-semibold text-white hover:bg-accent/90"
          >
            Install
          </button>
        </div>
      </div>
    </div>
  );
}
