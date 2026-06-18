"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import {
  Bell,
  BellOff,
  Bot,
  Calendar,
  Check,
  Eye,
  EyeOff,
  Loader2,
  LogOut,
  Moon,
  Smartphone,
  User,
} from "lucide-react";

import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { authClient } from "@/lib/auth-client";
import { getExistingSubscription, pushSupported, subscribeToPush, unsubscribeFromPush } from "@/lib/push/client";
import { getInitials } from "@/lib/user";

interface SettingsPanelProps {
  user: {
    id: string;
    name: string;
    email: string;
    createdAt: Date;
  };
  hasServerKey?: boolean;
}

const PREFERENCES_KEY = "life-os-preferences";

type Preferences = {
  dailyReminder: boolean;
  weekStartsMonday: boolean;
  compactSidebar: boolean;
};

const defaultPreferences: Preferences = {
  dailyReminder: true,
  weekStartsMonday: true,
  compactSidebar: false,
};

function loadPreferences(): Preferences {
  if (typeof window === "undefined") return defaultPreferences;
  try {
    const stored = localStorage.getItem(PREFERENCES_KEY);
    return stored
      ? { ...defaultPreferences, ...JSON.parse(stored) }
      : defaultPreferences;
  } catch {
    return defaultPreferences;
  }
}

function savePreferences(prefs: Preferences) {
  localStorage.setItem(PREFERENCES_KEY, JSON.stringify(prefs));
}

function MoMoSettingsCard() {
  const [subscriptionKey, setSubscriptionKey] = useState("");
  const [userId, setUserId] = useState("");
  const [apiSecret, setApiSecret] = useState("");
  const [environment, setEnvironment] = useState<"sandbox" | "production">("sandbox");
  const [configured, setConfigured] = useState(false);
  const [saving, setSaving] = useState(false);
  const [showSecret, setShowSecret] = useState(false);
  const [showKey, setShowKey] = useState(false);

  useEffect(() => {
    fetch("/api/settings/momo")
      .then((r) => r.json())
      .then((d) => {
        setConfigured(d.configured);
        setEnvironment(d.environment ?? "sandbox");
      })
      .catch(() => null);
  }, []);

  async function handleSave(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    try {
      await fetch("/api/settings/momo", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ subscriptionKey, userId, apiSecret, environment }),
      });
      setConfigured(!!(subscriptionKey && userId && apiSecret));
      toast.success("MoMo credentials saved");
      setSubscriptionKey("");
      setUserId("");
      setApiSecret("");
    } catch {
      toast.error("Failed to save credentials");
    } finally {
      setSaving(false);
    }
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Smartphone className="h-4 w-4 text-accent" />
            <CardTitle>MoMo integration</CardTitle>
          </div>
          {configured && (
            <span className="flex items-center gap-1 rounded-full bg-success/10 px-2.5 py-1 text-[11px] font-semibold text-success">
              <Check className="h-3 w-3" />
              Connected
            </span>
          )}
        </div>
        <CardDescription>
          Connect your MTN MoMo API credentials so you can send money directly from Finance and have expenses tracked automatically.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="mb-4 rounded-lg border border-warning/20 bg-warning/5 px-4 py-3 text-xs text-warning">
          <strong>Sandbox mode</strong> — these credentials work with MTN&apos;s free sandbox. Get yours at{" "}
          <span className="underline">momoapi.mtn.com</span> → Developer Portal → Subscribe to Disbursements.
          Switch to production when MTN approves your account.
        </div>

        <form onSubmit={handleSave} className="space-y-4">
          <div className="space-y-1.5">
            <Label>Subscription key (Ocp-Apim-Subscription-Key)</Label>
            <div className="relative">
              <Input
                type={showKey ? "text" : "password"}
                value={subscriptionKey}
                onChange={(e) => setSubscriptionKey(e.target.value)}
                placeholder={configured ? "••••••••••• (saved)" : "From MTN developer portal"}
                className="pr-10"
              />
              <button
                type="button"
                onClick={() => setShowKey((v) => !v)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
              >
                {showKey ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
              </button>
            </div>
          </div>

          <div className="space-y-1.5">
            <Label>User ID (UUID)</Label>
            <Input
              value={userId}
              onChange={(e) => setUserId(e.target.value)}
              placeholder={configured ? "•••-•••-••• (saved)" : "UUID you created in sandbox"}
              className="font-mono text-sm"
            />
          </div>

          <div className="space-y-1.5">
            <Label>API secret</Label>
            <div className="relative">
              <Input
                type={showSecret ? "text" : "password"}
                value={apiSecret}
                onChange={(e) => setApiSecret(e.target.value)}
                placeholder={configured ? "••••••••••• (saved)" : "Generated from your sandbox user"}
                className="pr-10"
              />
              <button
                type="button"
                onClick={() => setShowSecret((v) => !v)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
              >
                {showSecret ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
              </button>
            </div>
          </div>

          <div className="space-y-1.5">
            <Label>Environment</Label>
            <select
              value={environment}
              onChange={(e) => setEnvironment(e.target.value as "sandbox" | "production")}
              className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm focus:border-accent focus:outline-none focus:ring-2 focus:ring-accent/20"
            >
              <option value="sandbox">Sandbox (testing)</option>
              <option value="production">Production (real money)</option>
            </select>
          </div>

          <Button type="submit" disabled={saving} className="gap-2">
            {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Check className="h-4 w-4" />}
            Save MoMo credentials
          </Button>
        </form>
      </CardContent>
    </Card>
  );
}

function NotificationSettingsCard() {
  const [supported, setSupported] = useState(true);
  const [subscribed, setSubscribed] = useState(false);
  const [loading, setLoading] = useState(true);
  const [working, setWorking] = useState(false);

  useEffect(() => {
    setSupported(pushSupported());
    getExistingSubscription()
      .then((sub) => setSubscribed(!!sub))
      .catch(() => setSubscribed(false))
      .finally(() => setLoading(false));
  }, []);

  async function handleEnable() {
    setWorking(true);
    try {
      await subscribeToPush();
      setSubscribed(true);
      toast.success("Notifications enabled — you'll get an alert whenever a study session, task, or event is starting.");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Could not enable notifications");
    } finally {
      setWorking(false);
    }
  }

  async function handleDisable() {
    setWorking(true);
    try {
      await unsubscribeFromPush();
      setSubscribed(false);
      toast.success("Notifications disabled");
    } catch {
      toast.error("Could not disable notifications");
    } finally {
      setWorking(false);
    }
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center gap-2">
          <Bell className="h-4 w-4 text-accent" />
          <CardTitle>Notifications</CardTitle>
        </div>
        <CardDescription>
          Get a real push notification whenever a scheduled study session, task block, or calendar event is starting — even if the tab isn&apos;t focused.
        </CardDescription>
      </CardHeader>
      <CardContent>
        {!supported ? (
          <p className="rounded-lg border border-warning/20 bg-warning/5 px-4 py-3 text-xs text-warning">
            This browser doesn&apos;t support push notifications. Try Chrome, Edge, or Firefox.
          </p>
        ) : loading ? (
          <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
        ) : (
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between rounded-lg border border-border/60 px-4 py-4">
            <div>
              <p className="text-sm font-medium">{subscribed ? "Notifications are on" : "Notifications are off"}</p>
              <p className="text-xs text-muted-foreground">
                {subscribed
                  ? "We'll alert this device when something on your timetable is starting."
                  : "Turn this on to get alerted automatically when it's time."}
              </p>
            </div>
            <Button
              type="button"
              variant={subscribed ? "outline" : "default"}
              disabled={working}
              onClick={subscribed ? handleDisable : handleEnable}
              className="shrink-0 gap-2"
            >
              {working ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : subscribed ? (
                <BellOff className="h-4 w-4" />
              ) : (
                <Bell className="h-4 w-4" />
              )}
              {subscribed ? "Disable" : "Enable notifications"}
            </Button>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

function PreferenceToggle({
  label,
  description,
  checked,
  onChange,
}: {
  label: string;
  description: string;
  checked: boolean;
  onChange: (value: boolean) => void;
}) {
  return (
    <div className="flex items-start justify-between gap-4 rounded-lg border border-border/60 px-4 py-3">
      <div>
        <p className="text-sm font-medium">{label}</p>
        <p className="mt-0.5 text-xs text-muted-foreground">{description}</p>
      </div>
      <button
        type="button"
        role="switch"
        aria-checked={checked}
        onClick={() => onChange(!checked)}
        className={`relative h-6 w-11 shrink-0 rounded-full transition-colors ${
          checked ? "bg-accent" : "bg-secondary/50"
        }`}
      >
        <span
          className={`absolute top-0.5 left-0.5 h-5 w-5 rounded-full bg-white shadow transition-transform ${
            checked ? "translate-x-5" : "translate-x-0"
          }`}
        />
      </button>
    </div>
  );
}

export function SettingsPanel({ user, hasServerKey = false }: SettingsPanelProps) {
  const router = useRouter();
  const [name, setName] = useState(user.name);
  const [profileSaving, setProfileSaving] = useState(false);
  const [profileMessage, setProfileMessage] = useState("");
  const [profileError, setProfileError] = useState("");
  const [loggingOut, setLoggingOut] = useState(false);
  const [preferences, setPreferences] = useState<Preferences>(defaultPreferences);
  const [prefsSaved, setPrefsSaved] = useState(false);
  const [apiKey, setApiKey] = useState("");
  const [showKey, setShowKey] = useState(false);
  const [keySaving, setKeySaving] = useState(false);

  useEffect(() => {
    setPreferences(loadPreferences());
    const stored = localStorage.getItem("life-os-openai-key");
    if (stored) setApiKey(stored);
  }, []);

  async function handleProfileSave(e: React.FormEvent) {
    e.preventDefault();
    setProfileSaving(true);
    setProfileMessage("");
    setProfileError("");

    const trimmed = name.trim();
    if (!trimmed) {
      setProfileError("Name cannot be empty.");
      setProfileSaving(false);
      return;
    }

    const { error } = await authClient.updateUser({ name: trimmed });

    setProfileSaving(false);

    if (error) {
      setProfileError(error.message ?? "Could not update profile.");
      return;
    }

    setProfileMessage("Profile updated.");
    router.refresh();
  }

  function handlePreferenceChange(key: keyof Preferences, value: boolean) {
    const next = { ...preferences, [key]: value };
    setPreferences(next);
    savePreferences(next);
    setPrefsSaved(true);
    setTimeout(() => setPrefsSaved(false), 2000);
  }

  async function handleSignOut() {
    setLoggingOut(true);
    await authClient.signOut();
    // Hard navigation — discards client-side router cache so the next user
    // to sign in on this device can never see this account's cached pages.
    window.location.href = "/";
  }

  async function handleSaveApiKey(e: React.FormEvent) {
    e.preventDefault();
    setKeySaving(true);
    const trimmed = apiKey.trim();
    if (!trimmed) {
      localStorage.removeItem("life-os-openai-key");
      toast.success("API key cleared");
    } else {
      localStorage.setItem("life-os-openai-key", trimmed);
      await fetch("/api/settings/api-key", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ key: trimmed }),
      }).catch(() => null);
      toast.success("API key saved. AI Coach is now fully powered.");
    }
    setKeySaving(false);
  }

  const memberSince = new Date(user.createdAt).toLocaleDateString("en-US", {
    month: "long",
    year: "numeric",
  });

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <div className="flex items-center gap-2">
            <User className="h-4 w-4 text-accent" />
            <CardTitle>Profile</CardTitle>
          </div>
          <CardDescription>
            Your personal details shown across Life OS.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="mb-6 flex items-center gap-4">
            <div className="flex h-14 w-14 items-center justify-center rounded-full bg-accent/15 text-lg font-semibold text-accent">
              {getInitials(name || user.name)}
            </div>
            <div>
              <p className="font-medium">{name || user.name}</p>
              <p className="text-sm text-muted-foreground">{user.email}</p>
            </div>
          </div>

          <form onSubmit={handleProfileSave} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="name">Display name</Label>
              <Input
                id="name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Your name"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="email">Email</Label>
              <Input id="email" value={user.email} disabled />
              <p className="text-xs text-muted-foreground">
                Email cannot be changed yet.
              </p>
            </div>
            {profileError && (
              <p className="text-sm text-danger">{profileError}</p>
            )}
            {profileMessage && (
              <p className="text-sm text-success">{profileMessage}</p>
            )}
            <Button type="submit" disabled={profileSaving}>
              {profileSaving ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Saving...
                </>
              ) : (
                "Save profile"
              )}
            </Button>
          </form>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Moon className="h-4 w-4 text-accent" />
              <CardTitle>Preferences</CardTitle>
            </div>
            {prefsSaved && (
              <span className="flex items-center gap-1 text-xs text-success">
                <Check className="h-3.5 w-3.5" />
                Saved
              </span>
            )}
          </div>
          <CardDescription>
            Customize how Life OS works for you.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          <PreferenceToggle
            label="Daily planning reminder"
            description="Get a nudge to review today's focus each morning."
            checked={preferences.dailyReminder}
            onChange={(v) => handlePreferenceChange("dailyReminder", v)}
          />
          <PreferenceToggle
            label="Week starts on Monday"
            description="Align calendars and weekly goals to ISO weeks."
            checked={preferences.weekStartsMonday}
            onChange={(v) => handlePreferenceChange("weekStartsMonday", v)}
          />
          <PreferenceToggle
            label="Compact sidebar"
            description="Reduce sidebar spacing for smaller screens."
            checked={preferences.compactSidebar}
            onChange={(v) => handlePreferenceChange("compactSidebar", v)}
          />
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <div className="flex items-center gap-2">
            <Bot className="h-4 w-4 text-accent" />
            <CardTitle>AI Coach</CardTitle>
          </div>
          <CardDescription>
            The AI Coach, daily briefs, and smart coaching already work out of the box — no setup needed. Adding your own Claude API key here is optional: it lifts the free daily message limit and lets you use your own Anthropic billing instead of the shared one. Get a free key at console.anthropic.com if you want that.
          </CardDescription>
        </CardHeader>
        <CardContent>
          {hasServerKey && !apiKey && (
            <div className="mb-4 flex items-center gap-2 rounded-lg border border-success/20 bg-success/5 px-4 py-3 text-sm text-success">
              <Check className="h-4 w-4 shrink-0" />
              API key is saved. Enter a new key below to replace it.
            </div>
          )}
          <form onSubmit={handleSaveApiKey} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="api-key">Claude (Anthropic) API key</Label>
              <div className="relative">
                <Input
                  id="api-key"
                  type={showKey ? "text" : "password"}
                  value={apiKey}
                  onChange={(e) => setApiKey(e.target.value)}
                  placeholder={hasServerKey ? "sk-ant-••••• (key saved)" : "sk-ant-..."}
                  className="pr-10"
                />
                <button
                  type="button"
                  onClick={() => setShowKey((v) => !v)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                >
                  {showKey ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
              <p className="text-xs text-muted-foreground">
                Your key is stored securely in your account and used only to power your AI Coach.
              </p>
            </div>
            <div className="flex items-center gap-3">
              <Button type="submit" disabled={keySaving}>
                {keySaving ? <Loader2 className="h-4 w-4 animate-spin" /> : "Save key"}
              </Button>
              {hasServerKey && (
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  className="text-danger hover:text-danger"
                  onClick={async () => {
                    setApiKey("");
                    localStorage.removeItem("life-os-openai-key");
                    await fetch("/api/settings/api-key", {
                      method: "POST",
                      headers: { "Content-Type": "application/json" },
                      body: JSON.stringify({ key: "" }),
                    }).catch(() => null);
                    toast.success("API key removed");
                  }}
                >
                  Remove key
                </Button>
              )}
            </div>
          </form>
        </CardContent>
      </Card>

      <NotificationSettingsCard />

      <MoMoSettingsCard />

      <Card>
        <CardHeader>
          <div className="flex items-center gap-2">
            <Calendar className="h-4 w-4 text-accent" />
            <CardTitle>Account</CardTitle>
          </div>
          <CardDescription>
            Session and membership details.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="rounded-lg border border-border/60 px-4 py-3 text-sm">
            <p className="text-muted-foreground">Member since</p>
            <p className="mt-0.5 font-medium">{memberSince}</p>
          </div>

          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between rounded-lg border border-border/60 px-4 py-4">
            <div>
              <p className="text-sm font-medium">Sign out</p>
              <p className="text-xs text-muted-foreground">
                End your session on this device.
              </p>
            </div>
            <Button
              variant="danger"
              onClick={handleSignOut}
              disabled={loggingOut}
              className="shrink-0"
            >
              {loggingOut ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <LogOut className="h-4 w-4" />
              )}
              Sign out
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
