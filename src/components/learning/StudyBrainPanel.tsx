"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Brain, ChevronDown, ChevronUp, Loader2, Send, Sparkles } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import { cn } from "@/lib/utils";

const QUICK_PROMPTS = [
  "Explain this course as if I'm preparing for an exam",
  "What are the most important topics to know?",
  "Summarise the key formulas and definitions",
  "Give me 5 likely exam questions with answers",
  "What are the hardest concepts in this course?",
];

export function StudyBrainPanel({
  courseId,
  courseName,
}: {
  courseId: string;
  courseName: string;
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [question, setQuestion] = useState("");
  const [output, setOutput] = useState<string | null>(null);
  const [citations, setCitations] = useState<
    { sourceId: string; title: string; quote: string; kind: string }[]
  >([]);
  const [message, setMessage] = useState<string | null>(null);
  const [expanded, setExpanded] = useState(true);

  function ask(q?: string) {
    const text = (q ?? question).trim();
    if (!text) return;
    if (!q) setQuestion("");
    startTransition(async () => {
      setMessage(null);
      setOutput(null);
      const res = await fetch("/api/study/ask", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ courseId, question: text }),
      });
      const data = await res.json();
      setOutput(data.reply ?? data.error ?? "No response");
      setCitations(Array.isArray(data.citations) ? data.citations : []);
    });
  }

  function generate(action: "summary" | "flashcards" | "exam-prep") {
    startTransition(async () => {
      setMessage(null);
      setOutput(null);
      const res = await fetch("/api/study/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ courseId, action }),
      });
      const data = await res.json();
      if (!res.ok) {
        setMessage(data.error ?? "Generation failed");
        return;
      }
      if (action === "flashcards") {
        setMessage(`Created ${data.flashcardsCreated ?? 0} flashcards for ${courseName}.`);
        toast.success(`${data.flashcardsCreated ?? 0} flashcards created`);
        router.refresh();
        return;
      }
      setOutput(data.content ?? "Done");
      if (action === "summary") {
        setMessage("Summary saved to your Summaries tab.");
        toast.success("Summary saved");
        router.refresh();
      }
    });
  }

  return (
    <Card className="border-accent/25 bg-accent/5">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2 text-base">
            <Brain className="h-5 w-5 text-accent" />
            Study Brain
            <span className="text-xs font-normal text-muted-foreground">
              Your NotebookLM replacement
            </span>
          </CardTitle>
          <button
            type="button"
            onClick={() => setExpanded((v) => !v)}
            className="rounded-lg p-1.5 text-muted-foreground transition-colors hover:bg-muted/50 hover:text-foreground"
          >
            {expanded ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
          </button>
        </div>
        {!expanded && (
          <p className="text-xs text-muted-foreground">
            Ask questions from your notes and slides — AI only uses your {courseName} materials.
          </p>
        )}
      </CardHeader>

      {expanded && (
        <CardContent className="space-y-4">
          <p className="text-sm text-muted-foreground">
            Ask questions from your notes and uploaded slides. AI only uses your{" "}
            <span className="font-medium text-foreground">{courseName}</span> materials, not the public web.
          </p>

          {/* Quick prompt chips */}
          <div className="flex flex-wrap gap-1.5">
            {QUICK_PROMPTS.map((p) => (
              <button
                key={p}
                type="button"
                disabled={pending}
                onClick={() => ask(p)}
                className="rounded-full border border-accent/20 bg-accent/5 px-3 py-1 text-xs text-accent transition-colors hover:bg-accent/15 disabled:opacity-40"
              >
                {p.length > 35 ? p.slice(0, 35) + "…" : p}
              </button>
            ))}
          </div>

          {/* Ask input */}
          <div className="flex gap-2">
            <Textarea
              value={question}
              onChange={(e) => setQuestion(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter" && !e.shiftKey) {
                  e.preventDefault();
                  if (question.trim() && !pending) ask();
                }
              }}
              placeholder="Explain binary trees like I am preparing for an exam…"
              rows={2}
              className="flex-1 resize-none text-sm"
            />
            <Button
              type="button"
              onClick={() => ask()}
              disabled={pending || !question.trim()}
              size="icon"
              className="h-auto w-10 shrink-0 self-end"
            >
              {pending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
            </Button>
          </div>

          {/* Generate actions */}
          <div className="grid grid-cols-3 gap-2">
            <button
              type="button"
              disabled={pending}
              onClick={() => generate("summary")}
              className="flex flex-col items-center gap-1 rounded-xl border border-border/60 bg-background/50 px-2 py-2.5 text-center text-[11px] font-medium text-muted-foreground transition-all hover:border-accent/30 hover:bg-accent/5 hover:text-accent disabled:opacity-40"
            >
              <Sparkles className="h-4 w-4" />
              Generate summary
            </button>
            <button
              type="button"
              disabled={pending}
              onClick={() => generate("flashcards")}
              className="flex flex-col items-center gap-1 rounded-xl border border-border/60 bg-background/50 px-2 py-2.5 text-center text-[11px] font-medium text-muted-foreground transition-all hover:border-accent/30 hover:bg-accent/5 hover:text-accent disabled:opacity-40"
            >
              <Brain className="h-4 w-4" />
              Make flashcards
            </button>
            <button
              type="button"
              disabled={pending}
              onClick={() => generate("exam-prep")}
              className="flex flex-col items-center gap-1 rounded-xl border border-border/60 bg-background/50 px-2 py-2.5 text-center text-[11px] font-medium text-muted-foreground transition-all hover:border-accent/30 hover:bg-accent/5 hover:text-accent disabled:opacity-40"
            >
              <Send className="h-4 w-4" />
              Exam prep sheet
            </button>
          </div>

          {message && (
            <p className="rounded-lg border border-accent/20 bg-accent/5 px-3 py-2 text-xs font-medium text-accent">
              {message}
            </p>
          )}

          {pending && !output && (
            <div className="flex items-center gap-2 rounded-lg border border-border/50 bg-muted/20 px-3 py-3">
              <Loader2 className="h-4 w-4 animate-spin text-accent" />
              <p className="text-sm text-muted-foreground">Thinking through your {courseName} materials…</p>
            </div>
          )}

          {output && (
            <div className="space-y-3">
              <div className="max-h-72 overflow-y-auto rounded-xl border border-border/70 bg-background/80 p-4 text-sm leading-relaxed whitespace-pre-wrap">
                {output}
              </div>
              {citations.length > 0 && (
                <div className="rounded-lg border border-accent/20 bg-accent/5 p-3">
                  <p className="mb-2 text-xs font-semibold text-accent">Sources used</p>
                  <ul className="space-y-2">
                    {citations.map((c) => (
                      <li key={c.sourceId} className="text-xs text-muted-foreground">
                        <span className="font-medium text-foreground">
                          [{c.kind}] {c.title}
                        </span>
                        {c.quote && (
                          <span className="mt-0.5 block italic">&ldquo;{c.quote}&rdquo;</span>
                        )}
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
          )}
        </CardContent>
      )}
    </Card>
  );
}
