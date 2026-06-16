"use client";

import { useEffect, useRef, useState } from "react";
import { toast } from "sonner";
import {
  Bot,
  Loader2,
  Send,
  Sparkles,
  User,
  Zap,
} from "lucide-react";

import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

type Message = { role: "user" | "assistant"; content: string };

const STARTERS = [
  { label: "Plan my day", prompt: "Plan my day based on my study and content work" },
  { label: "Study help", prompt: "Help me summarize binary trees for an exam" },
  { label: "Content idea", prompt: "Give me a hook and outline for a tech YouTube video" },
  { label: "This week", prompt: "What should I focus on this week to make real progress?" },
];

export function CoachPanel() {
  const [messages, setMessages] = useState<Message[]>([
    {
      role: "assistant",
      content:
        "I'm your Life OS AI Coach. I know your tasks, goals, habits, study courses, and schedule.\n\nAsk me to plan your day, coach you through a tough topic, help script content, or tell you exactly what to focus on next.",
    },
  ]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const bottomRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  async function send(text?: string) {
    const message = (text ?? input).trim();
    if (!message || loading) return;

    const userMsg: Message = { role: "user", content: message };
    setMessages((m) => [...m, userMsg]);
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
      const data = await res.json();
      const reply = data.reply ?? data.error ?? "Something went wrong. Try again.";
      setMessages((m) => [...m, { role: "assistant", content: reply }]);

      if (!data.configured) {
        toast.info("Set ANTHROPIC_API_KEY in your .env to unlock the full AI Coach");
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
        <div className="flex-1 overflow-y-auto px-4 py-4 space-y-4 sm:px-6">
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

        {/* Input bar */}
        <div className="border-t border-border p-4">
          <div className="flex items-end gap-3">
            <div className="relative flex-1">
              <textarea
                ref={inputRef}
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder="Ask anything: study, content, planning..."
                rows={1}
                className="w-full resize-none rounded-xl border border-border bg-background px-4 py-3 text-sm leading-relaxed text-foreground placeholder:text-muted-foreground focus:border-accent focus:outline-none focus:ring-2 focus:ring-accent/20 max-h-32 overflow-y-auto"
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
              {loading ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Send className="h-4 w-4" />
              )}
            </Button>
          </div>
          <p className="mt-2 text-center text-[10px] text-muted-foreground/50">
            Enter to send · Shift+Enter for new line
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
      <div
        className={cn(
          "max-w-[85%] rounded-2xl px-4 py-3 text-sm leading-relaxed sm:max-w-[80%]",
          isUser
            ? "rounded-tr-none bg-accent text-white"
            : "rounded-tl-none bg-muted text-foreground"
        )}
      >
        <FormattedMessage content={m.content} />
      </div>
    </div>
  );
}

function FormattedMessage({ content }: { content: string }) {
  const lines = content.split("\n");
  return (
    <div className="space-y-1.5">
      {lines.map((line, i) => {
        if (line.startsWith("### ")) {
          return <p key={i} className="font-bold text-base">{line.slice(4)}</p>;
        }
        if (line.startsWith("## ")) {
          return <p key={i} className="font-bold">{line.slice(3)}</p>;
        }
        if (line.startsWith("**") && line.endsWith("**")) {
          return <p key={i} className="font-semibold">{line.slice(2, -2)}</p>;
        }
        if (line.startsWith("- ") || line.startsWith("• ")) {
          return (
            <div key={i} className="flex items-start gap-2">
              <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-current opacity-60" />
              <span>{line.slice(2)}</span>
            </div>
          );
        }
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
