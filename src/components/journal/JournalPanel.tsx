"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Bot, BookOpen, ChevronDown, ChevronUp, Loader2, Save, Sparkles } from "lucide-react";

import { saveJournalEntry, saveAIReflection } from "@/lib/actions/journal";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { cn } from "@/lib/utils";

type Entry = {
  id: string; date: Date; mood: string; content: string;
  wins: string; blockers: string; aiReflection: string;
};

const MOODS = [
  { value: "amazing", emoji: "🔥", label: "Amazing" },
  { value: "good", emoji: "😊", label: "Good" },
  { value: "neutral", emoji: "😐", label: "Neutral" },
  { value: "tired", emoji: "😴", label: "Tired" },
  { value: "stressed", emoji: "😤", label: "Stressed" },
  { value: "struggling", emoji: "😔", label: "Struggling" },
];

export function JournalPanel({
  today: initialToday,
  recent,
}: {
  today: Entry | null;
  recent: Entry[];
}) {
  const router = useRouter();
  const [mood, setMood] = useState(initialToday?.mood ?? "neutral");
  const [content, setContent] = useState(initialToday?.content ?? "");
  const [wins, setWins] = useState(initialToday?.wins ?? "");
  const [blockers, setBlockers] = useState(initialToday?.blockers ?? "");
  const [reflection, setReflection] = useState(initialToday?.aiReflection ?? "");
  const [reflecting, setReflecting] = useState(false);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();
  const [saved, setSaved] = useState(!!initialToday);

  const selectedMood = MOODS.find((m) => m.value === mood) ?? MOODS[2];

  async function handleSave() {
    const fd = new FormData();
    fd.append("mood", mood);
    fd.append("content", content);
    fd.append("wins", wins);
    fd.append("blockers", blockers);
    startTransition(async () => {
      const res = await saveJournalEntry(fd);
      if (res?.ok) { toast.success("Journal saved"); setSaved(true); router.refresh(); }
    });
  }

  async function handleReflect() {
    if (!saved && !content && !wins && !blockers) {
      toast.info("Write something first, then get your reflection.");
      return;
    }
    setReflecting(true);
    try {
      const res = await fetch("/api/ai/reflect", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ mood, content, wins, blockers }),
      });
      const data = await res.json() as { reflection?: string };
      const text = data.reflection ?? "";
      setReflection(text);
      if (text && saved) {
        await saveAIReflection(new Date(), text);
      }
    } catch {
      toast.error("Could not get reflection");
    } finally {
      setReflecting(false);
    }
  }

  return (
    <div className="space-y-6">
      {/* Today's entry */}
      <Card className="border-border/70 bg-card/80">
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="flex items-center gap-2">
              <BookOpen className="h-4 w-4 text-accent" />
              Today&apos;s Entry
            </CardTitle>
            <span className="text-xs text-muted-foreground">
              {new Date().toLocaleDateString("en-GH", { weekday: "long", month: "long", day: "numeric" })}
            </span>
          </div>
        </CardHeader>
        <CardContent className="space-y-5">
          {/* Mood picker */}
          <div>
            <p className="mb-2 text-xs font-semibold uppercase tracking-wider text-muted-foreground">How are you feeling?</p>
            <div className="flex flex-wrap gap-2">
              {MOODS.map((m) => (
                <button
                  key={m.value}
                  type="button"
                  onClick={() => setMood(m.value)}
                  className={cn(
                    "flex items-center gap-1.5 rounded-xl border px-3 py-2 text-sm transition-all",
                    mood === m.value
                      ? "border-accent/60 bg-accent/10 font-semibold text-foreground"
                      : "border-border/50 text-muted-foreground hover:border-border hover:bg-muted/30"
                  )}
                >
                  <span className="text-base">{m.emoji}</span>
                  <span>{m.label}</span>
                </button>
              ))}
            </div>
          </div>

          {/* What happened */}
          <div className="space-y-1.5">
            <label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
              What happened today?
            </label>
            <textarea
              value={content}
              onChange={(e) => setContent(e.target.value)}
              placeholder="Lecture went well, worked on my project, talked to a friend..."
              rows={3}
              className="w-full resize-none rounded-xl border border-border bg-background/50 px-3 py-2.5 text-sm text-foreground placeholder:text-muted-foreground/50 focus:border-accent focus:outline-none focus:ring-2 focus:ring-accent/20"
            />
          </div>

          {/* Wins */}
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-1.5">
              <label className="text-xs font-semibold uppercase tracking-wider text-success">
                Wins 🏆
              </label>
              <textarea
                value={wins}
                onChange={(e) => setWins(e.target.value)}
                placeholder="Finished the assignment, went to the gym..."
                rows={3}
                className="w-full resize-none rounded-xl border border-border bg-background/50 px-3 py-2.5 text-sm text-foreground placeholder:text-muted-foreground/50 focus:border-success focus:outline-none focus:ring-2 focus:ring-success/20"
              />
            </div>
            <div className="space-y-1.5">
              <label className="text-xs font-semibold uppercase tracking-wider text-warning">
                Blockers 🚧
              </label>
              <textarea
                value={blockers}
                onChange={(e) => setBlockers(e.target.value)}
                placeholder="Couldn't focus, internet was bad, feeling overwhelmed..."
                rows={3}
                className="w-full resize-none rounded-xl border border-border bg-background/50 px-3 py-2.5 text-sm text-foreground placeholder:text-muted-foreground/50 focus:border-warning focus:outline-none focus:ring-2 focus:ring-warning/20"
              />
            </div>
          </div>

          {/* Actions */}
          <div className="flex flex-wrap gap-3">
            <Button onClick={handleSave} disabled={pending} className="gap-2 flex-1 sm:flex-none">
              {pending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
              {saved ? "Update entry" : "Save entry"}
            </Button>
            <Button
              variant="outline"
              onClick={handleReflect}
              disabled={reflecting}
              className="gap-2 flex-1 border-accent/30 text-accent hover:bg-accent/10 sm:flex-none"
            >
              {reflecting ? <Loader2 className="h-4 w-4 animate-spin" /> : <Sparkles className="h-4 w-4" />}
              {reflecting ? "Reflecting…" : "AI Reflection"}
            </Button>
          </div>

          {/* AI Reflection */}
          {reflection && (
            <div className="flex gap-3 rounded-xl border border-accent/20 bg-accent/5 p-4">
              <Bot className="mt-0.5 h-4 w-4 shrink-0 text-accent" />
              <div>
                <p className="mb-1 text-xs font-semibold text-accent">AI Coach</p>
                <p className="text-sm leading-relaxed text-foreground">{reflection}</p>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Recent entries */}
      {recent.length > 0 && (
        <Card className="border-border/70 bg-card/80">
          <CardHeader>
            <CardTitle className="text-base">Past entries</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            {recent
              .filter((e) => {
                const d = new Date(e.date);
                d.setHours(0, 0, 0, 0);
                const today = new Date();
                today.setHours(0, 0, 0, 0);
                return d.getTime() !== today.getTime();
              })
              .slice(0, 10)
              .map((entry) => {
                const moodObj = MOODS.find((m) => m.value === entry.mood) ?? MOODS[2];
                const isOpen = expandedId === entry.id;
                return (
                  <div key={entry.id} className="rounded-xl border border-border/50 bg-background/30">
                    <button
                      type="button"
                      onClick={() => setExpandedId(isOpen ? null : entry.id)}
                      className="flex w-full items-center justify-between gap-3 px-4 py-3 text-left"
                    >
                      <div className="flex items-center gap-2">
                        <span className="text-lg">{moodObj.emoji}</span>
                        <div>
                          <p className="text-sm font-medium">
                            {new Date(entry.date).toLocaleDateString("en-GH", { weekday: "short", month: "short", day: "numeric" })}
                          </p>
                          {entry.content && (
                            <p className="line-clamp-1 text-xs text-muted-foreground">{entry.content}</p>
                          )}
                        </div>
                      </div>
                      {isOpen ? <ChevronUp className="h-4 w-4 shrink-0 text-muted-foreground" /> : <ChevronDown className="h-4 w-4 shrink-0 text-muted-foreground" />}
                    </button>
                    {isOpen && (
                      <div className="space-y-3 border-t border-border/50 px-4 pb-4 pt-3 text-sm">
                        {entry.content && (
                          <div>
                            <p className="mb-0.5 text-xs font-semibold text-muted-foreground">What happened</p>
                            <p className="text-foreground">{entry.content}</p>
                          </div>
                        )}
                        {entry.wins && (
                          <div>
                            <p className="mb-0.5 text-xs font-semibold text-success">Wins</p>
                            <p className="text-foreground">{entry.wins}</p>
                          </div>
                        )}
                        {entry.blockers && (
                          <div>
                            <p className="mb-0.5 text-xs font-semibold text-warning">Blockers</p>
                            <p className="text-foreground">{entry.blockers}</p>
                          </div>
                        )}
                        {entry.aiReflection && (
                          <div className="flex gap-2 rounded-lg border border-accent/20 bg-accent/5 p-3">
                            <Bot className="mt-0.5 h-3.5 w-3.5 shrink-0 text-accent" />
                            <p className="text-xs text-foreground">{entry.aiReflection}</p>
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                );
              })}
          </CardContent>
        </Card>
      )}
    </div>
  );
}
