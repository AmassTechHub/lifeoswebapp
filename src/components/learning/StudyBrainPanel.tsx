"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Brain, Loader2, Sparkles } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";

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

  function ask() {
    if (!question.trim()) return;
    startTransition(async () => {
      setMessage(null);
      const res = await fetch("/api/study/ask", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ courseId, question }),
      });
      const data = await res.json();
      setOutput(data.reply ?? data.error ?? "No response");
      setCitations(Array.isArray(data.citations) ? data.citations : []);
    });
  }

  function generate(action: "summary" | "flashcards" | "exam-prep") {
    startTransition(async () => {
      setMessage(null);
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
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-base">
          <Brain className="h-5 w-5 text-accent" />
          Study Brain
          <span className="text-xs font-normal text-muted-foreground">
            Your NotebookLM replacement
          </span>
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <p className="text-sm text-muted-foreground">
          Ask questions from your notes and uploaded slides. AI only uses your {courseName}{" "}
          materials, not the public web.
        </p>

        <div className="flex flex-col gap-2 sm:flex-row">
          <Textarea
            value={question}
            onChange={(e) => setQuestion(e.target.value)}
            placeholder="Explain binary trees like I am preparing for an exam..."
            rows={2}
            className="flex-1"
          />
          <Button type="button" onClick={ask} disabled={pending} className="shrink-0">
            {pending ? <Loader2 className="h-4 w-4 animate-spin" /> : "Ask"}
          </Button>
        </div>

        <div className="flex flex-wrap gap-2">
          <Button
            type="button"
            size="sm"
            variant="secondary"
            disabled={pending}
            onClick={() => generate("summary")}
            className="gap-1"
          >
            <Sparkles className="h-3.5 w-3.5" />
            Generate summary
          </Button>
          <Button
            type="button"
            size="sm"
            variant="secondary"
            disabled={pending}
            onClick={() => generate("flashcards")}
          >
            Generate flashcards
          </Button>
          <Button
            type="button"
            size="sm"
            variant="outline"
            disabled={pending}
            onClick={() => generate("exam-prep")}
          >
            Exam prep sheet
          </Button>
        </div>

        {message && <p className="text-xs text-accent">{message}</p>}

        {output && (
          <div className="space-y-3">
            <div className="max-h-64 overflow-y-auto rounded-lg border border-border/70 bg-background/80 p-3 text-sm leading-relaxed whitespace-pre-wrap">
              {output}
            </div>
            {citations.length > 0 && (
              <div className="rounded-lg border border-accent/20 bg-accent/5 p-3">
                <p className="mb-2 text-xs font-semibold text-accent">Sources</p>
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
    </Card>
  );
}
