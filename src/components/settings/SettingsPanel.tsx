"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import {
  Calendar,
  Check,
  Loader2,
  LogOut,
  Moon,
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
import { getInitials } from "@/lib/user";

interface SettingsPanelProps {
  user: {
    id: string;
    name: string;
    email: string;
    createdAt: Date;
  };
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

export function SettingsPanel({ user }: SettingsPanelProps) {
  const router = useRouter();
  const [name, setName] = useState(user.name);
  const [profileSaving, setProfileSaving] = useState(false);
  const [profileMessage, setProfileMessage] = useState("");
  const [profileError, setProfileError] = useState("");
  const [loggingOut, setLoggingOut] = useState(false);
  const [preferences, setPreferences] = useState<Preferences>(defaultPreferences);
  const [prefsSaved, setPrefsSaved] = useState(false);

  useEffect(() => {
    setPreferences(loadPreferences());
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
    router.push("/");
    router.refresh();
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
