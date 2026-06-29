"use client";

import { useState, useRef } from "react";
import { toast } from "sonner";
import {
  Bot, Brain, CheckCircle2, ChevronRight, Download, ExternalLink,
  FileImage, FileText, GraduationCap, Loader2, Maximize2,
  MessageCircle, Send, Sparkles, X,
} from "lucide-react";
import { cn } from "@/lib/utils";

type Material = {
  id: string;
  title: string;
  fileName: string;
  fileUrl: string;
  mimeType: string | null;
  createdAt: Date;
};

function isPDF(m: Material) {
  return m.mimeType === "application/pdf" || m.fileName.toLowerCase().endsWith(".pdf");
}
function isImage(m: Material) {
  return m.mimeType?.startsWith("image/") || /\.(png|jpg|jpeg|webp|gif)$/i.test(m.fileName);
}
function FileIcon({ m }: { m: Material }) {
  if (isPDF(m)) return <FileText className="h-4 w-4 shrink-0 text-red-400" />;
  if (isImage(m)) return <FileImage className="h-4 w-4 shrink-0 text-blue-400" />;
  return <FileText className="h-4 w-4 shrink-0 text-muted-foreground" />;
}

// Quick-ask prompts — the things that help you get an A
const QUICK_PROMPTS = [
  { label: "Explain simply", prompt: "Explain the key concept on this slide in simple terms, like I'm hearing it for the first time.", icon: Brain },
  { label: "What to remember", prompt: "What is the single most important thing to remember from this slide for an exam?", icon: CheckCircle2 },
  { label: "Likely exam Q", prompt: "Write 2 exam questions that could come from this slide, with model answers.", icon: GraduationCap },
  { label: "Real example", prompt: "Give a real-world example of the concept on this slide.", icon: Sparkles },
  { label: "Connect topics", prompt: "How does this slide connect to other topics in the course? What should I know first, and what does this lead to?", icon: ChevronRight },
];

type Message = { role: "user" | "ai"; text: string };

function AIPanel({
  courseId,
  slideTitle,
  onClose,
}: {
  courseId: string | undefined;
  slideTitle: string;
  onClose: () => void;
}) {
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const bottomRef = useRef<HTMLDivElement>(null);

  async function ask(question: string) {
    if (!question.trim() || loading) return;
    const userMsg: Message = { role: "user", text: question };
    setMessages((prev) => [...prev, userMsg]);
    setInput("");
    setLoading(true);

    try {
      const contextPrefix = `I am currently reading a slide titled "${slideTitle}". `;
      const res = await fetch("/api/study/ask", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          courseId,
          question: contextPrefix + question,
        }),
      });
      const data = await res.json();
      const reply = data.reply ?? data.error ?? "Could not get a response.";
      setMessages((prev) => [...prev, { role: "ai", text: reply }]);
      setTimeout(() => bottomRef.current?.scrollIntoView({ behavior: "smooth" }), 100);
    } catch {
      toast.error("AI request failed");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="flex h-full flex-col rounded-2xl border border-accent/20 bg-card/95 shadow-xl">
      {/* Header */}
      <div className="flex shrink-0 items-center justify-between border-b border-border/50 px-4 py-3">
        <div className="flex items-center gap-2">
          <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-accent/15">
            <Bot className="h-4 w-4 text-accent" />
          </div>
          <div>
            <p className="text-sm font-semibold text-foreground">Slide AI</p>
            <p className="text-[10px] text-muted-foreground/60 truncate max-w-[140px]">{slideTitle}</p>
          </div>
        </div>
        <button
          type="button"
          onClick={onClose}
          className="rounded-lg p-1 text-muted-foreground/40 hover:text-muted-foreground"
        >
          <X className="h-4 w-4" />
        </button>
      </div>

      {/* Quick prompts */}
      {messages.length === 0 && (
        <div className="shrink-0 border-b border-border/40 p-3 space-y-2">
          <p className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground/50">
            Quick ask
          </p>
          <div className="flex flex-wrap gap-1.5">
            {QUICK_PROMPTS.map((p) => {
              const Icon = p.icon;
              return (
                <button
                  key={p.label}
                  type="button"
                  onClick={() => ask(p.prompt)}
                  className="flex items-center gap-1 rounded-lg border border-border/50 bg-muted/30 px-2.5 py-1.5 text-[11px] font-medium text-muted-foreground transition-colors hover:border-accent/30 hover:bg-accent/5 hover:text-accent"
                >
                  <Icon className="h-3 w-3" />
                  {p.label}
                </button>
              );
            })}
          </div>
        </div>
      )}

      {/* Chat */}
      <div className="flex-1 overflow-y-auto p-3 space-y-3 min-h-0">
        {messages.length === 0 ? (
          <div className="flex flex-col items-center gap-2 pt-6 text-center">
            <Sparkles className="h-8 w-8 text-accent/30" />
            <p className="text-sm font-medium text-muted-foreground">Ask anything about this slide</p>
            <p className="text-xs text-muted-foreground/60">
              Or use the quick-ask buttons above to get instant exam insights
            </p>
          </div>
        ) : (
          messages.map((m, i) => (
            <div key={i} className={cn("flex gap-2", m.role === "user" && "flex-row-reverse")}>
              <div className={cn(
                "flex h-6 w-6 shrink-0 items-center justify-center rounded-full text-[10px] font-bold",
                m.role === "ai" ? "bg-accent/15 text-accent" : "bg-muted text-foreground"
              )}>
                {m.role === "ai" ? "AI" : "You"}
              </div>
              <div className={cn(
                "max-w-[85%] rounded-2xl px-3 py-2 text-sm leading-relaxed",
                m.role === "ai" ? "bg-muted/50 text-foreground" : "bg-accent text-white"
              )}>
                {m.text}
              </div>
            </div>
          ))
        )}
        {loading && (
          <div className="flex gap-2">
            <div className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-accent/15 text-[10px] font-bold text-accent">AI</div>
            <div className="rounded-2xl bg-muted/50 px-3 py-2.5">
              <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
            </div>
          </div>
        )}
        <div ref={bottomRef} />
      </div>

      {/* Input */}
      <div className="shrink-0 border-t border-border/40 p-3">
        <div className="flex gap-2">
          <input
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); ask(input); } }}
            placeholder="Ask about this slide…"
            className="flex-1 rounded-xl border border-border bg-background/50 px-3 py-2 text-sm placeholder:text-muted-foreground/50 focus:border-accent focus:outline-none focus:ring-1 focus:ring-accent/20"
          />
          <button
            type="button"
            onClick={() => ask(input)}
            disabled={!input.trim() || loading}
            className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-accent text-white transition-opacity disabled:opacity-40 hover:opacity-90"
          >
            <Send className="h-4 w-4" />
          </button>
        </div>
        <p className="mt-1.5 text-[10px] text-muted-foreground/50 text-center">
          AI answers are grounded in your course materials
        </p>
      </div>
    </div>
  );
}

export function SlideReader({
  materials,
  courseId,
  onRequestExamPrep,
}: {
  materials: Material[];
  courseId?: string;
  onRequestExamPrep?: () => void;
}) {
  const [selected, setSelected] = useState<Material | null>(materials[0] ?? null);
  const [fullscreen, setFullscreen] = useState(false);
  const [aiOpen, setAiOpen] = useState(false);

  if (materials.length === 0) {
    return (
      <div className="rounded-2xl border border-dashed border-border bg-muted/20 px-6 py-14 text-center">
        <FileText className="mx-auto h-10 w-10 text-muted-foreground/30" />
        <p className="mt-3 text-sm font-medium text-muted-foreground">No slides uploaded yet</p>
        <p className="mt-1 text-xs text-muted-foreground/60">
          Upload PDF slides or images in the Materials tab — they appear here for reading with AI assistance.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {/* AI panel hint */}
      {!aiOpen && (
        <div className="flex items-center justify-between rounded-xl border border-accent/20 bg-accent/5 px-4 py-2.5">
          <div className="flex items-center gap-2">
            <Bot className="h-4 w-4 text-accent" />
            <p className="text-sm text-foreground">
              <span className="font-semibold">AI Study Assistant</span>
              <span className="text-muted-foreground ml-1">— ask questions about any slide while you read</span>
            </p>
          </div>
          <button
            type="button"
            onClick={() => setAiOpen(true)}
            className="flex items-center gap-1.5 rounded-lg bg-accent px-3 py-1.5 text-xs font-semibold text-white transition-opacity hover:opacity-90"
          >
            <MessageCircle className="h-3.5 w-3.5" />
            Open AI
          </button>
        </div>
      )}

      <div className={cn("grid gap-4", aiOpen ? "lg:grid-cols-[180px_1fr_300px]" : "lg:grid-cols-[220px_1fr]")}>
        {/* Slide list */}
        <div className="space-y-1.5">
          <p className="px-1 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
            {materials.length} file{materials.length !== 1 ? "s" : ""}
          </p>
          {materials.map((m) => (
            <button
              key={m.id}
              onClick={() => setSelected(m)}
              className={cn(
                "flex w-full items-center gap-2.5 rounded-xl border px-3 py-2.5 text-left transition-colors",
                selected?.id === m.id
                  ? "border-accent/40 bg-accent/10 text-foreground"
                  : "border-border/50 text-muted-foreground hover:border-accent/20 hover:bg-muted/30 hover:text-foreground"
              )}
            >
              <FileIcon m={m} />
              <div className="min-w-0">
                <p className="truncate text-sm font-medium leading-tight">
                  {m.title || m.fileName}
                </p>
                <p className="text-[10px] text-muted-foreground/60">
                  {isPDF(m) ? "PDF" : isImage(m) ? "Image" : "File"} ·{" "}
                  {new Date(m.createdAt).toLocaleDateString("en", { month: "short", day: "numeric" })}
                </p>
              </div>
            </button>
          ))}
        </div>

        {/* Viewer */}
        {selected && (
          <div
            className={cn(
              "min-w-0 flex flex-col overflow-hidden rounded-2xl border border-border/70 bg-card/80",
              fullscreen && "fixed inset-4 z-50 shadow-2xl"
            )}
          >
            {/* Toolbar */}
            <div className="flex shrink-0 items-center justify-between gap-2 border-b border-border/60 px-4 py-2.5">
              <p className="truncate text-sm font-medium text-foreground">
                {selected.title || selected.fileName}
              </p>
              <div className="flex shrink-0 items-center gap-1.5">
                {/* AI toggle */}
                <button
                  onClick={() => setAiOpen((v) => !v)}
                  className={cn(
                    "flex items-center gap-1 rounded-lg px-2.5 py-1.5 text-xs font-semibold transition-colors",
                    aiOpen
                      ? "bg-accent/20 text-accent border border-accent/30"
                      : "border border-border/60 text-muted-foreground hover:border-accent/30 hover:text-accent"
                  )}
                >
                  <Bot className="h-3.5 w-3.5" />
                  {aiOpen ? "AI on" : "Ask AI"}
                </button>
                {onRequestExamPrep && (
                  <button
                    onClick={onRequestExamPrep}
                    className="flex items-center gap-1 rounded-lg border border-rose-500/30 bg-rose-500/10 px-2.5 py-1.5 text-xs font-semibold text-rose-500 hover:bg-rose-500/20"
                  >
                    <GraduationCap className="h-3.5 w-3.5" />
                    Exam prep
                  </button>
                )}
                <button
                  onClick={() => setFullscreen((v) => !v)}
                  className="rounded-lg border border-border/60 p-1.5 text-muted-foreground hover:border-accent/30 hover:text-foreground"
                >
                  <Maximize2 className="h-3.5 w-3.5" />
                </button>
                <a
                  href={selected.fileUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-1 rounded-lg border border-border/60 px-2.5 py-1.5 text-xs text-muted-foreground hover:border-accent/30 hover:text-foreground"
                >
                  <ExternalLink className="h-3.5 w-3.5" />
                  Open
                </a>
                <a
                  href={selected.fileUrl}
                  download={selected.fileName}
                  className="flex items-center gap-1 rounded-lg border border-border/60 px-2.5 py-1.5 text-xs text-muted-foreground hover:border-accent/30 hover:text-foreground"
                >
                  <Download className="h-3.5 w-3.5" />
                  Save
                </a>
              </div>
            </div>

            {/* Content */}
            {isPDF(selected) ? (
              <iframe
                key={selected.id}
                src={selected.fileUrl}
                className={cn("w-full border-0 flex-1", fullscreen ? "h-full" : "h-[72vh]")}
                title={selected.title || selected.fileName}
              />
            ) : isImage(selected) ? (
              <div className={cn("flex items-center justify-center overflow-auto p-6 bg-muted/20", fullscreen ? "flex-1" : "h-[72vh]")}>
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={selected.fileUrl}
                  alt={selected.title || selected.fileName}
                  className="max-h-full max-w-full object-contain rounded-lg shadow-md"
                />
              </div>
            ) : (
              <div className="flex flex-1 flex-col items-center justify-center gap-3 p-8 text-center">
                <FileText className="h-12 w-12 text-muted-foreground/30" />
                <p className="text-sm text-muted-foreground">Preview not available for this file type.</p>
                <a
                  href={selected.fileUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-1.5 rounded-lg bg-accent px-4 py-2 text-sm font-semibold text-white"
                >
                  <ExternalLink className="h-4 w-4" />
                  Open file
                </a>
              </div>
            )}
          </div>
        )}

        {/* AI Panel */}
        {aiOpen && selected && (
          <div className={cn("h-[75vh]", fullscreen && "hidden")}>
            <AIPanel
              courseId={courseId}
              slideTitle={selected.title || selected.fileName}
              onClose={() => setAiOpen(false)}
            />
          </div>
        )}
      </div>

      {/* Fullscreen backdrop */}
      {fullscreen && (
        <div
          className="fixed inset-0 z-40 bg-black/60 backdrop-blur-sm"
          onClick={() => setFullscreen(false)}
        />
      )}
    </div>
  );
}
