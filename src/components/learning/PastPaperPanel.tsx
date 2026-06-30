"use client";

import { useState } from "react";
import { toast } from "sonner";
import {
  AlertCircle, BookOpen, Check, CheckCircle2, ChevronDown, ChevronRight,
  ChevronUp, FileText, GraduationCap, Loader2, RotateCcw, Sparkles,
  Target, Upload, X, Zap,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import { cn } from "@/lib/utils";

type QuestionType = "mcq" | "short" | "essay";

type Question = {
  id: string;
  type: QuestionType;
  marks: number;
  question: string;
  options?: string[];
  answer?: string;
  explanation?: string;
  markingScheme?: string[];
  sampleAnswer?: string;
  examTip?: string;
};

type PaperResult = {
  paperName: string;
  courseName: string;
  paperSummary: string;
  topTopics: string[];
  questions: Question[];
};

type QuestionState = {
  selected?: string;
  shortAnswer: string;
  revealed: boolean;
  correct?: boolean;
};

function MCQQuestion({
  q,
  state,
  onSelect,
  onReveal,
  onNext,
  isLast,
}: {
  q: Question;
  state: QuestionState;
  onSelect: (opt: string) => void;
  onReveal: () => void;
  onNext: () => void;
  isLast: boolean;
}) {
  return (
    <div className="space-y-3">
      <div className="space-y-2">
        {q.options?.map((opt) => {
          const letter = opt.charAt(0);
          const isCorrect = letter === q.answer;
          const isSelected = state.selected === opt;
          return (
            <button
              key={opt}
              disabled={state.revealed}
              onClick={() => onSelect(opt)}
              className={cn(
                "flex w-full items-start gap-3 rounded-xl border px-4 py-3 text-left text-sm transition-all",
                !state.revealed && "hover:border-accent/40 hover:bg-accent/5",
                !state.revealed && state.selected === opt && "border-accent/40 bg-accent/10",
                !state.revealed && state.selected !== opt && "border-border/50",
                state.revealed && isCorrect && "border-success/40 bg-success/10 font-medium text-success",
                state.revealed && isSelected && !isCorrect && "border-danger/40 bg-danger/10 text-danger",
                state.revealed && !isSelected && !isCorrect && "border-border/30 opacity-40"
              )}
            >
              <span className={cn(
                "flex h-6 w-6 shrink-0 items-center justify-center rounded-full border text-xs font-bold",
                state.revealed && isCorrect ? "border-success bg-success text-white" :
                state.revealed && isSelected && !isCorrect ? "border-danger bg-danger text-white" :
                "border-border"
              )}>
                {state.revealed && isCorrect ? <Check className="h-3.5 w-3.5" /> :
                 state.revealed && isSelected ? <X className="h-3.5 w-3.5" /> : letter}
              </span>
              <span className="flex-1 leading-relaxed">{opt.slice(3)}</span>
            </button>
          );
        })}
      </div>

      {!state.revealed && state.selected && (
        <Button className="w-full" onClick={onReveal}>Check answer</Button>
      )}

      {state.revealed && (
        <>
          <div className="rounded-xl border border-accent/20 bg-accent/5 p-4 space-y-2">
            <p className="text-xs font-semibold uppercase tracking-wide text-accent">Explanation</p>
            <p className="text-sm text-foreground">{q.explanation}</p>
            {q.examTip && (
              <div className="mt-2 flex items-start gap-1.5 border-t border-accent/10 pt-2">
                <Zap className="mt-0.5 h-3.5 w-3.5 shrink-0 text-yellow-400" />
                <p className="text-xs text-muted-foreground"><span className="font-semibold text-yellow-400">Exam tip:</span> {q.examTip}</p>
              </div>
            )}
          </div>
          <Button className="w-full gap-2" onClick={onNext}>
            {isLast ? "See results" : "Next question"}
            <ChevronRight className="h-4 w-4" />
          </Button>
        </>
      )}
    </div>
  );
}

function ShortEssayQuestion({
  q,
  state,
  onChange,
  onReveal,
  onNext,
  isLast,
}: {
  q: Question;
  state: QuestionState;
  onChange: (v: string) => void;
  onReveal: () => void;
  onNext: () => void;
  isLast: boolean;
}) {
  return (
    <div className="space-y-3">
      <Textarea
        value={state.shortAnswer}
        onChange={(e) => onChange(e.target.value)}
        placeholder={q.type === "essay" ? "Write your full answer here…" : "Type your answer…"}
        rows={q.type === "essay" ? 8 : 4}
        disabled={state.revealed}
        className="resize-none text-sm"
      />

      {!state.revealed && (
        <Button className="w-full" onClick={onReveal} disabled={!state.shortAnswer.trim()}>
          Show marking scheme
        </Button>
      )}

      {state.revealed && (
        <>
          {q.markingScheme && q.markingScheme.length > 0 && (
            <div className="rounded-xl border border-accent/20 bg-accent/5 p-4 space-y-2">
              <p className="text-xs font-semibold uppercase tracking-wide text-accent">Marking scheme ({q.marks} marks)</p>
              <ul className="space-y-1.5">
                {q.markingScheme.map((point, i) => (
                  <li key={i} className="flex items-start gap-2 text-sm text-foreground">
                    <CheckCircle2 className="mt-0.5 h-3.5 w-3.5 shrink-0 text-success" />
                    {point}
                  </li>
                ))}
              </ul>
            </div>
          )}

          {q.sampleAnswer && (
            <details className="rounded-xl border border-border/50">
              <summary className="cursor-pointer px-4 py-3 text-sm font-medium text-muted-foreground hover:text-foreground">
                View model answer
              </summary>
              <div className="border-t border-border/50 px-4 py-3">
                <p className="whitespace-pre-wrap text-sm text-foreground">{q.sampleAnswer}</p>
              </div>
            </details>
          )}

          {q.examTip && (
            <div className="flex items-start gap-2 rounded-xl border border-yellow-500/20 bg-yellow-500/5 px-3 py-2.5">
              <Zap className="mt-0.5 h-3.5 w-3.5 shrink-0 text-yellow-400" />
              <p className="text-xs text-muted-foreground"><span className="font-semibold text-yellow-400">Exam tip:</span> {q.examTip}</p>
            </div>
          )}

          <Button className="w-full gap-2" onClick={onNext}>
            {isLast ? "See results" : "Next question"}
            <ChevronRight className="h-4 w-4" />
          </Button>
        </>
      )}
    </div>
  );
}

export function PastPaperPanel({ courseId, courseName }: { courseId: string; courseName: string }) {
  const [file, setFile] = useState<File | null>(null);
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<PaperResult | null>(null);
  const [quizActive, setQuizActive] = useState(false);
  const [currentIdx, setCurrentIdx] = useState(0);
  const [states, setStates] = useState<Record<string, QuestionState>>({});
  const [done, setDone] = useState(false);
  const [showTopics, setShowTopics] = useState(false);

  async function handleUpload() {
    if (!file) return;
    setLoading(true);
    try {
      const fd = new FormData();
      fd.set("courseId", courseId);
      fd.set("file", file);

      const res = await fetch("/api/study/past-paper", { method: "POST", body: fd });
      const data = await res.json();

      if (!res.ok) {
        toast.error(data.error ?? "Failed to analyse paper");
        return;
      }

      setResult(data);
      // Init question states
      const init: Record<string, QuestionState> = {};
      for (const q of data.questions) init[q.id] = { shortAnswer: "", revealed: false };
      setStates(init);
      toast.success(`${data.questions.length} practice questions generated`);
    } catch {
      toast.error("Upload failed. Try again.");
    } finally {
      setLoading(false);
    }
  }

  function updateState(id: string, patch: Partial<QuestionState>) {
    setStates((prev) => ({ ...prev, [id]: { ...prev[id], ...patch } }));
  }

  function handleNext() {
    if (!result) return;
    const next = currentIdx + 1;
    if (next >= result.questions.length) {
      setDone(true);
    } else {
      setCurrentIdx(next);
    }
  }

  function restart() {
    if (!result) return;
    setCurrentIdx(0);
    setDone(false);
    const init: Record<string, QuestionState> = {};
    for (const q of result.questions) init[q.id] = { shortAnswer: "", revealed: false };
    setStates(init);
  }

  // Upload UI
  if (!result) {
    return (
      <Card className="border-border/70 bg-card/80">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <FileText className="h-5 w-5 text-accent" />
            Past Paper Practice
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="rounded-xl border border-accent/20 bg-accent/5 p-4">
            <p className="text-sm font-medium text-foreground">How it works</p>
            <ol className="mt-2 space-y-1.5 text-sm text-muted-foreground">
              <li className="flex items-start gap-2">
                <span className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-accent/20 text-[11px] font-bold text-accent">1</span>
                Upload a past exam paper (PDF)
              </li>
              <li className="flex items-start gap-2">
                <span className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-accent/20 text-[11px] font-bold text-accent">2</span>
                AI analyses the paper style, marks, and question types
              </li>
              <li className="flex items-start gap-2">
                <span className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-accent/20 text-[11px] font-bold text-accent">3</span>
                Practice with new questions in the exact same format — with marking schemes
              </li>
            </ol>
          </div>

          <div
            onClick={() => document.getElementById("past-paper-input")?.click()}
            className={cn(
              "cursor-pointer rounded-2xl border-2 border-dashed p-8 text-center transition-all",
              file ? "border-success/40 bg-success/5" : "border-border/50 hover:border-accent/40 hover:bg-accent/5"
            )}
          >
            {file ? (
              <div className="flex flex-col items-center gap-2">
                <FileText className="h-8 w-8 text-success" />
                <p className="font-medium text-foreground">{file.name}</p>
                <p className="text-xs text-muted-foreground">{(file.size / 1024).toFixed(0)} KB · Click to change</p>
              </div>
            ) : (
              <div className="flex flex-col items-center gap-2">
                <Upload className="h-8 w-8 text-muted-foreground/40" />
                <p className="font-medium text-foreground">Upload past exam paper</p>
                <p className="text-xs text-muted-foreground">PDF files only · Max 10MB</p>
              </div>
            )}
          </div>
          <input
            id="past-paper-input"
            type="file"
            accept=".pdf,application/pdf,text/plain"
            className="hidden"
            onChange={(e) => setFile(e.target.files?.[0] ?? null)}
          />

          <Button
            className="w-full gap-2"
            disabled={!file || loading}
            onClick={handleUpload}
          >
            {loading ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" />
                Analysing paper…
              </>
            ) : (
              <>
                <Sparkles className="h-4 w-4" />
                Generate practice questions
              </>
            )}
          </Button>

          <div className="flex items-start gap-2 rounded-lg border border-border/40 bg-muted/20 px-3 py-2.5">
            <AlertCircle className="mt-0.5 h-3.5 w-3.5 shrink-0 text-muted-foreground/50" />
            <p className="text-xs text-muted-foreground">
              Works best with text-based PDFs. Scanned image PDFs may not extract correctly. AI also uses your uploaded notes for {courseName}.
            </p>
          </div>
        </CardContent>
      </Card>
    );
  }

  // Results — overview before starting quiz
  if (!quizActive && !done) {
    return (
      <div className="space-y-4">
        <Card className="border-success/20 bg-success/5">
          <CardContent className="pt-5">
            <div className="flex items-start gap-3">
              <CheckCircle2 className="mt-0.5 h-5 w-5 shrink-0 text-success" />
              <div className="space-y-1">
                <p className="font-semibold text-foreground">Paper analysed: {result.paperName}</p>
                <p className="text-sm text-muted-foreground">{result.paperSummary}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Top topics */}
        {result.topTopics.length > 0 && (
          <Card className="border-border/70 bg-card/80">
            <CardContent className="pt-4">
              <button
                type="button"
                onClick={() => setShowTopics((v) => !v)}
                className="flex w-full items-center justify-between"
              >
                <p className="text-sm font-semibold text-foreground flex items-center gap-2">
                  <Target className="h-4 w-4 text-accent" />
                  Top topics this paper tests
                </p>
                {showTopics ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
              </button>
              {showTopics && (
                <div className="mt-3 flex flex-wrap gap-2">
                  {result.topTopics.map((t) => (
                    <span key={t} className="rounded-full border border-accent/20 bg-accent/5 px-3 py-1 text-xs font-medium text-accent">
                      {t}
                    </span>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        )}

        {/* Question breakdown */}
        <Card className="border-border/70 bg-card/80">
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center gap-2 text-base">
              <GraduationCap className="h-5 w-5 text-accent" />
              {result.questions.length} practice questions ready
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            {(["mcq", "short", "essay"] as QuestionType[]).map((type) => {
              const count = result.questions.filter((q) => q.type === type).length;
              if (!count) return null;
              const labels = { mcq: "Multiple choice", short: "Short answer", essay: "Essay / long answer" };
              const colors = { mcq: "text-accent", short: "text-amber-400", essay: "text-purple-400" };
              return (
                <div key={type} className="flex items-center justify-between rounded-lg border border-border/40 bg-muted/20 px-3 py-2">
                  <p className="text-sm text-foreground">{labels[type]}</p>
                  <span className={cn("text-sm font-bold", colors[type])}>{count}</span>
                </div>
              );
            })}
          </CardContent>
        </Card>

        <div className="flex gap-3">
          <Button className="flex-1 gap-2" onClick={() => setQuizActive(true)}>
            <BookOpen className="h-4 w-4" />
            Start practice exam
          </Button>
          <Button variant="outline" onClick={() => { setResult(null); setFile(null); }}>
            Upload different paper
          </Button>
        </div>
      </div>
    );
  }

  // Done screen
  if (done) {
    const mcqQs = result.questions.filter((q) => q.type === "mcq");
    const correct = mcqQs.filter((q) => {
      const s = states[q.id];
      return s?.selected && s.selected.charAt(0) === q.answer;
    }).length;
    const pct = mcqQs.length > 0 ? Math.round((correct / mcqQs.length) * 100) : null;

    return (
      <div className="space-y-4">
        <Card className="border-border/70 bg-card/80">
          <CardContent className="flex flex-col items-center gap-4 py-10 text-center">
            <GraduationCap className={cn("h-12 w-12", pct !== null && pct >= 70 ? "text-yellow-400" : "text-muted-foreground/40")} />
            <div>
              <p className="text-xl font-bold">Practice complete</p>
              {pct !== null && (
                <p className="mt-1 text-sm text-muted-foreground">
                  MCQs: {correct}/{mcqQs.length} correct ({pct}%)
                </p>
              )}
              <p className="mt-1 text-sm text-muted-foreground">
                Review the marking schemes above to identify gaps.
              </p>
            </div>
            <div className="flex gap-3">
              <Button onClick={restart} className="gap-2">
                <RotateCcw className="h-4 w-4" /> Try again
              </Button>
              <Button variant="outline" onClick={() => { setResult(null); setFile(null); setDone(false); }}>
                New paper
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  // Active quiz
  const q = result.questions[currentIdx];
  if (!q) return null;
  const state = states[q.id] ?? { shortAnswer: "", revealed: false };
  const isLast = currentIdx === result.questions.length - 1;
  const typeLabel = { mcq: "Multiple Choice", short: "Short Answer", essay: "Essay" }[q.type];
  const typeColor = { mcq: "bg-accent/20 text-accent", short: "bg-amber-500/20 text-amber-400", essay: "bg-purple-500/20 text-purple-400" }[q.type];

  return (
    <div className="space-y-4">
      {/* Progress */}
      <div className="space-y-1.5">
        <div className="flex items-center justify-between text-xs text-muted-foreground">
          <span>{result.paperName}</span>
          <span>{currentIdx + 1} / {result.questions.length}</span>
        </div>
        <div className="h-1.5 w-full overflow-hidden rounded-full bg-muted/40">
          <div
            className="h-full rounded-full bg-accent transition-all"
            style={{ width: `${((currentIdx) / result.questions.length) * 100}%` }}
          />
        </div>
      </div>

      <Card className="border-border/70 bg-card/80">
        <CardContent className="space-y-4 pt-5">
          {/* Question header */}
          <div className="flex items-center gap-2">
            <span className={cn("rounded-lg px-2.5 py-0.5 text-[11px] font-bold", typeColor)}>
              {typeLabel}
            </span>
            <span className="text-[11px] text-muted-foreground">{q.marks} mark{q.marks !== 1 ? "s" : ""}</span>
          </div>

          <p className="text-sm font-semibold leading-relaxed text-foreground">{q.question}</p>

          {q.type === "mcq" ? (
            <MCQQuestion
              q={q}
              state={state}
              onSelect={(opt) => updateState(q.id, { selected: opt })}
              onReveal={() => {
                const letter = state.selected?.charAt(0);
                updateState(q.id, { revealed: true, correct: letter === q.answer });
              }}
              onNext={handleNext}
              isLast={isLast}
            />
          ) : (
            <ShortEssayQuestion
              q={q}
              state={state}
              onChange={(v) => updateState(q.id, { shortAnswer: v })}
              onReveal={() => updateState(q.id, { revealed: true })}
              onNext={handleNext}
              isLast={isLast}
            />
          )}
        </CardContent>
      </Card>
    </div>
  );
}
