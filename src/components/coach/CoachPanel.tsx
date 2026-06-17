"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import {
  Bot,
  CalendarPlus,
  CheckCircle2,
  Loader2,
  Send,
  Sparkles,
  Target,
  User,
  Zap,
} from "lucide-react";

import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import type { ActionRecord } from "@/app/api/coach/chat/route";

type Message = {
  role: "user" | "assistant";
  content: string;
  actions?: ActionRecord[];
};

const ACTION_ICONS: Record<ActionRecord["type"], React.ElementType> = {
  task: CheckCircle2,
  event: CalendarPlus,
  goal: Target,
  habit: Zap,
  deadline: CalendarPlus,
};

const ACTION_LABELS: Record<ActionRecord["type"], string> = {
  task: "Task",
  event: "Calendar block",
  goal: "Goal",
  habit: "Habit",
  deadline: "Deadline",
};

const STARTERS = [
  { label: "Plan my day", prompt: "Plan my day and create the time blocks in my calendar" },
  { label: "Add content blocks", prompt: "Add 3 content creation blocks to my calendar this week (evenings, 1-2h each)" },
  { label: "Create study tasks", prompt: "Create study tasks for each of my courses this week" },
  { label: "Set a weekly goal", prompt: "Help me set a realistic weekly goal and add it to Life OS" },
];

export function CoachPanel() {
  const router = useRouter();
  const [messages, setMessages] = useState<Message[]>([
    {
      role: "assistant",
      content:
        "I'm your Life OS AI Coach. I know your tasks, goals, habits, study courses, and schedule.\n\nI can also **act** — ask me to create tasks, block time in your calendar, set goals, add deadlines, or build habits and I'll do it instantly.\n\nWhat do you need?",
    },
  ]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  async function send(text?: string) {
    const message = (text ?? input).trim();
    if (!message || loading) return;

    setMessages((m) => [...m, { role: "user", content: message }]);
    setInput("");
    setLoading(true);

    try {
      const res = await fetch("/api/coach/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          message,
          history: messages.map(({ role, content }) => ({ role, content })),
        }),
      });
      const data = (await res.json()) as {
        reply?: string;
        error?: string;
        actions?: ActionRecord[];
        configured?: boolean;
      };

      const reply = data.reply ?? data.error ?? "Something went wrong. Try again.";
      const actions = data.actions ?? [];

      setMessages((m) => [...m, { role: "assistant", content: reply, actions }]);

      if (!data.configured) {
        toast.info("Set ANTHROPIC_API_KEY in your environment to unlock the full AI Coach");
      }

      if (actions.length > 0) {
        router.refresh();
        const summary = actions.map((a) => `${ACTION_LABELS[a.type]}: "${a.label}"`).join(", ");
        toast.success(`Created → ${summary}`);
      }
    } catch {
      setMessages((m) => [
        ...m,
        { role: "assistant", content: "Network error. Check your connection and try again." },
      ]);
    } finally {
      setLoading(false);
    }
  }

  function handleKeyDown(e: React.KeyboardEvent<HTMLTextAreaElement>) {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      send();
    }
  }

  return (
    <div className="flex h-[calc(100dvh-10rem)] min-h-96 flex-col gap-4">
      {/* Starter prompts */}
      <div className="flex flex-wrap gap-2">
        {STARTERS.map((s) => (
          <button
            key={s.label}
            type="button"
            onClick={() => send(s.prompt)}
            disabled={loading}
            className="inline-flex items-center gap-1.5 rounded-full border border-border bg-card px-3 py-1.5 text-xs font-medium text-muted-foreground transition-all hover:border-accent/40 hover:bg-accent/5 hover:text-foreground disabled:opacity-50"
          >
            <Sparkles className="h-3 w-3 text-accent" />
            {s.label}
          </button>
        ))}
      </div>

      {/* Chat window */}
      <div className="flex flex-1 flex-col overflow-hidden rounded-2xl border border-border bg-card/80">
        <div className="flex-1 space-y-4 overflow-y-auto px-4 py-4 sm:px-6">
          {messages.map((m, i) => (
            <MessageBubble key={i} message={m} />
          ))}

          {loading && (
            <div className="flex items-start gap-3">
              <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-accent/15">
                <Bot className="h-4 w-4 text-accent" />
              </div>
              <div className="rounded-2xl rounded-tl-none bg-muted px-4 py-3">
                <div className="flex items-center gap-1.5">
                  <span className="h-2 w-2 animate-bounce rounded-full bg-muted-foreground/60 [animation-delay:-0.3s]" />
                  <span className="h-2 w-2 animate-bounce rounded-full bg-muted-foreground/60 [animation-delay:-0.15s]" />
                  <span className="h-2 w-2 animate-bounce rounded-full bg-muted-foreground/60" />
                </div>
              </div>
            </div>
          )}
          <div ref={bottomRef} />
        </div>

        {/* Input */}
        <div className="border-t border-border p-4">
          <div className="flex items-end gap-3">
            <div className="relative flex-1">
              <textarea
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder="Ask anything — or say 'add content blocks to my schedule this week'..."
                rows={1}
                className="max-h-32 w-full resize-none overflow-y-auto rounded-xl border border-border bg-background px-4 py-3 text-sm leading-relaxed text-foreground placeholder:text-muted-foreground focus:border-accent focus:outline-none focus:ring-2 focus:ring-accent/20"
                style={{ minHeight: "48px" }}
                disabled={loading}
              />
            </div>
            <Button
              type="button"
              onClick={() => send()}
              disabled={loading || !input.trim()}
              className="h-12 w-12 shrink-0 rounded-xl p-0"
            >
              {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
            </Button>
          </div>
          <p className="mt-2 text-center text-[10px] text-muted-foreground/50">
            Enter to send · Shift+Enter for new line · Coach can create tasks, events & goals
          </p>
        </div>
      </div>
    </div>
  );
}

function MessageBubble({ message: m }: { message: Message }) {
  const isUser = m.role === "user";

  return (
    <div className={cn("flex items-start gap-3", isUser && "flex-row-reverse")}>
      <div
        className={cn(
          "flex h-8 w-8 shrink-0 items-center justify-center rounded-full",
          isUser ? "bg-accent text-white" : "bg-accent/15 text-accent"
        )}
      >
        {isUser ? <User className="h-4 w-4" /> : <Bot className="h-4 w-4" />}
      </div>

      <div className={cn("max-w-[85%] space-y-2 sm:max-w-[80%]", isUser && "items-end")}>
        <div
          className={cn(
            "rounded-2xl px-4 py-3 text-sm leading-relaxed",
            isUser
              ? "rounded-tr-none bg-accent text-white"
              : "rounded-tl-none bg-muted text-foreground"
          )}
        >
          <FormattedMessage content={m.content} isUser={isUser} />
        </div>

        {/* Action chips — displayed when the AI created things */}
        {m.actions && m.actions.length > 0 && (
          <div className="flex flex-wrap gap-1.5 pl-1">
            {m.actions.map((a, i) => {
              const Icon = ACTION_ICONS[a.type];
              return (
                <span
                  key={i}
                  className="inline-flex items-center gap-1.5 rounded-full border border-success/30 bg-success/10 px-2.5 py-1 text-xs font-medium text-success"
                >
                  <Icon className="h-3 w-3 shrink-0" />
                  <span className="font-semibold">{ACTION_LABELS[a.type]}:</span>
                  <span className="max-w-45 truncate">{a.label}</span>
                </span>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}

function FormattedMessage({ content, isUser }: { content: string; isUser: boolean }) {
  const lines = content.split("\n");
  return (
    <div className="space-y-1.5">
      {lines.map((line, i) => {
        if (line.startsWith("### "))
          return <p key={i} className="text-base font-bold">{line.slice(4)}</p>;
        if (line.startsWith("## "))
          return <p key={i} className="font-bold">{line.slice(3)}</p>;

        // Full-line bold
        if (/^\*\*[^*]+\*\*$/.test(line.trim()))
          return <p key={i} className="font-semibold">{line.trim().slice(2, -2)}</p>;

        // Inline bold fragments
        if (line.includes("**")) {
          const fragments = line.split(/(\*\*[^*]+\*\*)/g);
          return (
            <p key={i}>
              {fragments.map((frag, j) =>
                frag.startsWith("**") && frag.endsWith("**") ? (
                  <strong key={j}>{frag.slice(2, -2)}</strong>
                ) : (
                  frag
                )
              )}
            </p>
          );
        }

        if (line.startsWith("- ") || line.startsWith("• "))
          return (
            <div key={i} className="flex items-start gap-2">
              <span
                className={cn(
                  "mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full",
                  isUser ? "bg-white/60" : "bg-current opacity-50"
                )}
              />
              <span>{line.slice(2)}</span>
            </div>
          );

        if (/^\d+\. /.test(line)) {
          const num = line.match(/^(\d+)\. /)?.[1];
          return (
            <div key={i} className="flex items-start gap-2">
              <span className="shrink-0 font-semibold opacity-70">{num}.</span>
              <span>{line.replace(/^\d+\. /, "")}</span>
            </div>
          );
        }

        if (line.trim() === "") return <div key={i} className="h-1" />;
        return <p key={i}>{line}</p>;
      })}
    </div>
  );
}
