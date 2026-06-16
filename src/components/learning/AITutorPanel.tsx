"use client";

import { useState } from "react";
import { toast } from "sonner";
import {
  BookOpen, Brain, Check, ChevronRight,
  GraduationCap, Loader2, MessageCircle,
  RotateCcw, Target, X, Zap,
} from "lucide-react";

import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import { cn } from "@/lib/utils";

type Mode = "teach" | "quiz" | "socratic" | "predict" | "recap" | "concepts";

type QuizQuestion = {
  id: string;
  type: "mcq" | "short";
  question: string;
  options?: string[];
  answer?: string;
  sampleAnswer?: string;
  explanation: string;
};

type ConceptCard = {
  name: string;
  definition: string;
  example: string;
  hook: string;
  examTip: string;
};

const MODES: { key: Mode; label: string; icon: React.ElementType; desc: string; color: string }[] = [
  { key: "teach",    label: "Teach Me",       icon: GraduationCap, desc: "Structured lesson with exam-critical highlights", color: "text-accent" },
  { key: "quiz",     label: "Quiz Me",         icon: Target,        desc: "5 exam-style questions with instant feedback",    color: "text-purple-500" },
  { key: "socratic", label: "Socratic",        icon: MessageCircle, desc: "AI guides you with questions, not answers",       color: "text-blue-500" },
  { key: "predict",  label: "Exam Predictor",  icon: Brain,         desc: "What's most likely to appear in your exam",      color: "text-orange-500" },
  { key: "recap",    label: "Speed Recap",     icon: Zap,           desc: "10 must-know points for last-minute revision",   color: "text-yellow-500" },
  { key: "concepts", label: "Concept Cards",   icon: BookOpen,      desc: "Key concepts with examples and memory hooks",    color: "text-green-500" },
];

// ── Quiz component ───────────────────────────────────────────────────────────

function QuizMode({ questions, courseName }: { questions: QuizQuestion[]; courseName: string }) {
  const [idx, setIdx] = useState(0);
  const [selected, setSelected] = useState<string | null>(null);
  const [shortAnswer, setShortAnswer] = useState("");
  const [revealed, setRevealed] = useState(false);
  const [score, setScore] = useState(0);
  const [done, setDone] = useState(false);

  const q = questions[idx];
  if (!q) return null;

  function checkMCQ(option: string) {
    setSelected(option);
    setRevealed(true);
    const letter = option.charAt(0);
    if (letter === q.answer) setScore((s) => s + 1);
  }

  function checkShort() {
    setRevealed(true);
  }

  function next() {
    if (idx + 1 >= questions.length) { setDone(true); return; }
    setIdx((i) => i + 1);
    setSelected(null);
    setShortAnswer("");
    setRevealed(false);
  }

  if (done) {
    const pct = Math.round((score / questions.length) * 100);
    return (
      <div className="rounded-2xl border border-border/70 bg-card/80 p-8 text-center">
        <div className={cn("mx-auto mb-3 flex h-16 w-16 items-center justify-center rounded-full text-white text-2xl font-bold",
          pct >= 80 ? "bg-success" : pct >= 60 ? "bg-accent" : pct >= 40 ? "bg-warning" : "bg-danger"
        )}>
          {pct}%
        </div>
        <p className="text-lg font-bold text-foreground">
          {pct >= 80 ? "Excellent!" : pct >= 60 ? "Good work!" : pct >= 40 ? "Keep practising" : "More revision needed"}
        </p>
        <p className="mt-1 text-sm text-muted-foreground">{score} of {questions.length} correct on {courseName}</p>
        <Button className="mt-5 gap-2" onClick={() => { setIdx(0); setScore(0); setDone(false); setRevealed(false); setSelected(null); }}>
          <RotateCcw className="h-4 w-4" /> Retake
        </Button>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Progress */}
      <div className="flex items-center justify-between text-xs text-muted-foreground">
        <span>Question {idx + 1} of {questions.length}</span>
        <span>{score} correct</span>
      </div>
      <div className="h-1.5 w-full rounded-full bg-muted/50">
        <div className="h-full rounded-full bg-accent transition-all" style={{ width: `${((idx) / questions.length) * 100}%` }} />
      </div>

      <Card className="border-border/70 bg-card/80">
        <CardContent className="space-y-4 pt-5">
          <div className="flex items-start gap-2">
            <span className={cn("shrink-0 rounded-lg px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide text-white",
              q.type === "mcq" ? "bg-purple-500" : "bg-blue-500"
            )}>
              {q.type === "mcq" ? "Multiple Choice" : "Short Answer"}
            </span>
          </div>
          <p className="text-sm font-semibold text-foreground leading-relaxed">{q.question}</p>

          {q.type === "mcq" && q.options && (
            <div className="space-y-2">
              {q.options.map((opt) => {
                const letter = opt.charAt(0);
                const isCorrect = letter === q.answer;
                const isSelected = selected === opt;
                return (
                  <button
                    key={opt}
                    disabled={revealed}
                    onClick={() => checkMCQ(opt)}
                    className={cn(
                      "flex w-full items-center gap-3 rounded-xl border px-4 py-3 text-left text-sm transition-all",
                      !revealed && "hover:border-accent/40 hover:bg-accent/5",
                      revealed && isCorrect && "border-success/40 bg-success/10 text-success font-semibold",
                      revealed && isSelected && !isCorrect && "border-danger/40 bg-danger/10 text-danger",
                      !revealed && "border-border/60",
                      revealed && !isSelected && !isCorrect && "border-border/30 opacity-50"
                    )}
                  >
                    <span className={cn("flex h-6 w-6 shrink-0 items-center justify-center rounded-full border text-xs font-bold",
                      revealed && isCorrect ? "border-success bg-success text-white" :
                      revealed && isSelected && !isCorrect ? "border-danger bg-danger text-white" :
                      "border-border"
                    )}>
                      {revealed && isCorrect ? <Check className="h-3.5 w-3.5" /> : revealed && isSelected ? <X className="h-3.5 w-3.5" /> : letter}
                    </span>
                    <span className="flex-1">{opt.slice(3)}</span>
                  </button>
                );
              })}
            </div>
          )}

          {q.type === "short" && (
            <div className="space-y-2">
              <Textarea
                value={shortAnswer}
                onChange={(e) => setShortAnswer(e.target.value)}
                placeholder="Type your answer..."
                rows={3}
                disabled={revealed}
                className="resize-none text-sm"
              />
              {!revealed && (
                <Button size="sm" onClick={checkShort} disabled={!shortAnswer.trim()}>
                  Check answer
                </Button>
              )}
            </div>
          )}

          {revealed && (
            <div className="rounded-xl border border-accent/20 bg-accent/5 p-4">
              {q.type === "short" && (
                <div className="mb-3">
                  <p className="text-xs font-semibold uppercase tracking-wide text-accent">Sample answer</p>
                  <p className="mt-1 text-sm text-foreground">{q.sampleAnswer}</p>
                </div>
              )}
              <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Explanation</p>
              <p className="mt-1 text-sm text-muted-foreground">{q.explanation}</p>
            </div>
          )}

          {revealed && (
            <Button className="w-full gap-2" onClick={next}>
              {idx + 1 >= questions.length ? "See results" : "Next question"}
              <ChevronRight className="h-4 w-4" />
            </Button>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

// ── Concept Cards component ─────────────────────────────────────────────────

function ConceptCardsMode({ concepts }: { concepts: ConceptCard[] }) {
  const [active, setActive] = useState(0);
  const [flipped, setFlipped] = useState(false);

  const c = concepts[active];
  if (!c) return null;

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between text-xs text-muted-foreground">
        <span>{concepts.length} concepts</span>
        <span>{active + 1} / {concepts.length}</span>
      </div>

      {/* Card */}
      <div
        onClick={() => setFlipped((v) => !v)}
        className="cursor-pointer select-none"
      >
        <Card className={cn("min-h-48 border-border/70 bg-card/80 transition-all hover:border-accent/30", flipped && "border-accent/40 bg-accent/5")}>
          <CardContent className="flex flex-col justify-between gap-4 pt-6 pb-5">
            {!flipped ? (
              <>
                <div>
                  <p className="text-xs font-semibold uppercase tracking-wide text-accent">Concept</p>
                  <p className="mt-2 text-2xl font-bold text-foreground">{c.name}</p>
                  <p className="mt-2 text-sm text-muted-foreground leading-relaxed">{c.definition}</p>
                </div>
                <p className="text-xs text-muted-foreground/50 text-center">Tap to see example & tips</p>
              </>
            ) : (
              <>
                <div className="space-y-3">
                  <div>
                    <p className="text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">Example</p>
                    <p className="mt-1 text-sm text-foreground">{c.example}</p>
                  </div>
                  <div>
                    <p className="text-[10px] font-semibold uppercase tracking-wide text-yellow-500">Memory hook</p>
                    <p className="mt-1 text-sm text-foreground">{c.hook}</p>
                  </div>
                  <div>
                    <p className="text-[10px] font-semibold uppercase tracking-wide text-accent">Exam tip</p>
                    <p className="mt-1 text-sm text-foreground">{c.examTip}</p>
                  </div>
                </div>
                <p className="text-xs text-muted-foreground/50 text-center">Tap to flip back</p>
              </>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Navigation */}
      <div className="flex items-center justify-between gap-3">
        <Button variant="outline" size="sm" disabled={active === 0}
          onClick={() => { setActive((i) => i - 1); setFlipped(false); }}>
          ← Prev
        </Button>
        <div className="flex gap-1.5">
          {concepts.map((_, i) => (
            <button key={i} onClick={() => { setActive(i); setFlipped(false); }}
              className={cn("h-1.5 rounded-full transition-all", i === active ? "w-6 bg-accent" : "w-1.5 bg-border")} />
          ))}
        </div>
        <Button variant="outline" size="sm" disabled={active === concepts.length - 1}
          onClick={() => { setActive((i) => i + 1); setFlipped(false); }}>
          Next →
        </Button>
      </div>
    </div>
  );
}

// ── Socratic conversation ────────────────────────────────────────────────────

type Message = { role: "user" | "assistant"; content: string };

function SocraticMode({ courseId, courseName }: { courseId: string; courseName: string }) {
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [started, setStarted] = useState(false);

  async function send(userMsg?: string) {
    const newMessages: Message[] = userMsg
      ? [...messages, { role: "user", content: userMsg }]
      : messages;

    setMessages(newMessages);
    setInput("");
    setLoading(true);

    try {
      const res = await fetch("/api/study/ai-tutor", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          courseId,
          mode: "socratic",
          conversationHistory: newMessages,
        }),
      });
      const data = await res.json();
      if (data.error) { toast.error(data.error); return; }
      setMessages((prev) => [...prev, { role: "assistant", content: data.text }]);
    } catch {
      toast.error("Failed to get response");
    } finally {
      setLoading(false);
    }
  }

  if (!started) {
    return (
      <div className="rounded-2xl border border-border/70 bg-card/80 p-8 text-center">
        <MessageCircle className="mx-auto h-10 w-10 text-blue-500/60" />
        <h3 className="mt-3 font-semibold text-foreground">Socratic Mode</h3>
        <p className="mt-1.5 text-sm text-muted-foreground max-w-sm mx-auto">
          The AI will never give you answers — only questions that guide you to discover them yourself.
          This is the most effective way to truly understand a topic.
        </p>
        <Button className="mt-5" onClick={() => { setStarted(true); send(); }}>
          Start session
        </Button>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="rounded-xl border border-border/70 bg-card/80 p-4 space-y-3 max-h-[50vh] overflow-y-auto">
        {messages.map((m, i) => (
          <div key={i} className={cn("flex gap-2.5", m.role === "user" && "flex-row-reverse")}>
            <div className={cn(
              "shrink-0 flex h-7 w-7 items-center justify-center rounded-full text-xs font-bold",
              m.role === "assistant" ? "bg-blue-500/15 text-blue-500" : "bg-accent/15 text-accent"
            )}>
              {m.role === "assistant" ? "AI" : "You"}
            </div>
            <div className={cn(
              "rounded-2xl px-3.5 py-2.5 text-sm leading-relaxed max-w-[80%]",
              m.role === "assistant" ? "bg-muted/50 text-foreground" : "bg-accent text-white"
            )}>
              {m.content}
            </div>
          </div>
        ))}
        {loading && (
          <div className="flex gap-2.5">
            <div className="flex h-7 w-7 items-center justify-center rounded-full bg-blue-500/15 text-xs font-bold text-blue-500">AI</div>
            <div className="rounded-2xl bg-muted/50 px-3.5 py-2.5">
              <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
            </div>
          </div>
        )}
      </div>
      <div className="flex gap-2">
        <Textarea
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); if (input.trim() && !loading) send(input.trim()); } }}
          placeholder="Respond to the question... (Enter to send)"
          rows={2}
          className="flex-1 resize-none text-sm"
        />
        <Button onClick={() => send(input.trim())} disabled={!input.trim() || loading}>
          {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <ChevronRight className="h-4 w-4" />}
        </Button>
      </div>
    </div>
  );
}

// ── Main Panel ───────────────────────────────────────────────────────────────

export function AITutorPanel({ courseId, courseName }: { courseId: string; courseName: string }) {
  const [mode, setMode] = useState<Mode | null>(null);
  const [loading, setLoading] = useState(false);
  const [textResult, setTextResult] = useState<string | null>(null);
  const [quizData, setQuizData] = useState<QuizQuestion[] | null>(null);
  const [conceptData, setConceptData] = useState<ConceptCard[] | null>(null);

  async function runMode(m: Mode) {
    if (m === "socratic") { setMode(m); return; }

    setMode(m);
    setTextResult(null);
    setQuizData(null);
    setConceptData(null);
    setLoading(true);

    try {
      const res = await fetch("/api/study/ai-tutor", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ courseId, mode: m }),
      });
      const data = await res.json();

      if (data.error) { toast.error(data.error); setMode(null); return; }

      if (m === "quiz" && data.data?.questions) {
        setQuizData(data.data.questions);
      } else if (m === "concepts" && data.data?.concepts) {
        setConceptData(data.data.concepts);
      } else {
        setTextResult(data.text ?? "");
      }
    } catch {
      toast.error("Failed to start session");
      setMode(null);
    } finally {
      setLoading(false);
    }
  }

  function reset() {
    setMode(null);
    setTextResult(null);
    setQuizData(null);
    setConceptData(null);
  }

  // Mode selector
  if (!mode) {
    return (
      <div className="space-y-4">
        <div className="rounded-xl border border-accent/20 bg-accent/5 px-4 py-3">
          <p className="text-sm font-semibold text-foreground">AI Tutor — {courseName}</p>
          <p className="mt-0.5 text-xs text-muted-foreground">Choose a learning mode. AI uses your notes and uploaded slides.</p>
        </div>
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {MODES.map(({ key, label, icon: Icon, desc, color }) => (
            <button
              key={key}
              onClick={() => runMode(key)}
              className="flex flex-col gap-2 rounded-xl border border-border/60 bg-card/80 p-4 text-left transition-all hover:border-accent/30 hover:bg-accent/5"
            >
              <Icon className={cn("h-5 w-5", color)} />
              <p className="font-semibold text-foreground text-sm">{label}</p>
              <p className="text-xs text-muted-foreground leading-relaxed">{desc}</p>
            </button>
          ))}
        </div>
      </div>
    );
  }

  const modeInfo = MODES.find((m) => m.key === mode)!;

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <modeInfo.icon className={cn("h-5 w-5", modeInfo.color)} />
          <p className="font-semibold text-foreground">{modeInfo.label}</p>
          <span className="text-xs text-muted-foreground">· {courseName}</span>
        </div>
        <button onClick={reset} className="flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground">
          <RotateCcw className="h-3.5 w-3.5" /> Change mode
        </button>
      </div>

      {/* Content */}
      {loading ? (
        <div className="rounded-2xl border border-border/70 bg-card/80 flex flex-col items-center justify-center gap-3 py-16">
          <Loader2 className="h-8 w-8 animate-spin text-accent" />
          <p className="text-sm text-muted-foreground">
            {mode === "quiz" ? "Generating questions…" :
             mode === "concepts" ? "Extracting concepts…" :
             mode === "predict" ? "Analysing exam patterns…" :
             mode === "recap" ? "Distilling key points…" :
             "Preparing your lesson…"}
          </p>
        </div>
      ) : mode === "socratic" ? (
        <SocraticMode courseId={courseId} courseName={courseName} />
      ) : mode === "quiz" && quizData ? (
        <QuizMode questions={quizData} courseName={courseName} />
      ) : mode === "concepts" && conceptData ? (
        <ConceptCardsMode concepts={conceptData} />
      ) : textResult ? (
        <Card className="border-border/70 bg-card/80">
          <CardContent className="pt-5">
            <div className="prose prose-sm max-w-none dark:prose-invert">
              <p className="whitespace-pre-wrap text-sm leading-relaxed text-foreground/90">{textResult}</p>
            </div>
          </CardContent>
        </Card>
      ) : null}
    </div>
  );
}
