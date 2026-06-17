"use client";

import { useEffect, useRef, useState } from "react";
import { toast } from "sonner";
import {
  BookOpen, Brain, Check, CheckCircle2, ChevronDown, ChevronRight,
  FileText, GraduationCap, Headphones, Loader2, MessageCircle, Network,
  Pause, Play, RotateCcw, Square, Target, Volume2, X, Zap,
} from "lucide-react";

import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { cn } from "@/lib/utils";

type Mode =
  | "teach" | "quiz" | "examPrep" | "socratic" | "predict" | "recap" | "concepts" | "voice"
  | "podcast" | "studyGuide" | "mindmap";

type StudySource = { id: string; tag: string; kind: "note" | "material"; title: string; excerpt: string };

type QuizQuestion = {
  id: string;
  type: "mcq" | "short";
  question: string;
  options?: string[];
  answer?: string;
  sampleAnswer?: string;
  explanation: string;
  source?: string;
};

type ConceptCard = {
  name: string;
  definition: string;
  example: string;
  hook: string;
  examTip: string;
  source?: string;
};

type VoiceSection = { title: string; script: string };
type VoiceData = { sections: VoiceSection[]; totalEstimatedMinutes: number };

type PodcastTurn = { speaker: "A" | "B"; text: string };
type PodcastData = { turns: PodcastTurn[]; totalEstimatedMinutes: number };

type StudyGuideSection = { heading: string; content: string };
type StudyGuideFaq = { question: string; answer: string };
type StudyGuideTimelineItem = { label: string; detail: string };
type StudyGuideData = {
  overview: string;
  sections: StudyGuideSection[];
  faq: StudyGuideFaq[];
  timeline: StudyGuideTimelineItem[];
};

type MindMapNode = { label: string; children?: MindMapNode[] };
type MindMapData = { root: string; children: MindMapNode[] };

const MODES: { key: Mode; label: string; icon: React.ElementType; desc: string; color: string }[] = [
  { key: "teach",      label: "Teach Me",       icon: GraduationCap, desc: "Structured lesson with exam-critical highlights",    color: "text-accent" },
  { key: "quiz",       label: "Quiz Me",         icon: Target,        desc: "5 exam-style questions with instant feedback",       color: "text-purple-500" },
  { key: "examPrep",   label: "Exam Prep Quiz",  icon: CheckCircle2,  desc: "Many A-D questions covering everything in your slides & flashcards", color: "text-rose-500" },
  { key: "socratic",   label: "Socratic",        icon: MessageCircle, desc: "AI guides you with questions, not answers",          color: "text-blue-500" },
  { key: "predict",    label: "Exam Predictor",  icon: Brain,         desc: "What's most likely to appear in your exam",         color: "text-orange-500" },
  { key: "recap",      label: "Speed Recap",     icon: Zap,           desc: "10 must-know points for last-minute revision",      color: "text-yellow-500" },
  { key: "concepts",   label: "Concept Cards",   icon: BookOpen,      desc: "Key concepts with examples and memory hooks",       color: "text-green-500" },
  { key: "voice",      label: "Voice Tutor",     icon: Volume2,       desc: "AI narrates your course — listen and learn hands-free", color: "text-indigo-500" },
  { key: "podcast",    label: "Audio Overview",  icon: Headphones,    desc: "Two AI hosts discuss your course like a podcast",    color: "text-cyan-500" },
  { key: "studyGuide", label: "Study Guide",     icon: FileText,      desc: "Auto-generated guide: overview, FAQ, and timeline",  color: "text-teal-500" },
  { key: "mindmap",    label: "Mind Map",        icon: Network,       desc: "Visual breakdown of how topics connect",             color: "text-fuchsia-500" },
];

// ── Citations ────────────────────────────────────────────────────────────────

function CitationChip({ tag, sources }: { tag: string; sources: StudySource[] }) {
  const [open, setOpen] = useState(false);
  const source = sources.find((s) => s.tag === tag);
  if (!source) return null;

  return (
    <span className="relative inline-block">
      <button
        type="button"
        onClick={(e) => { e.stopPropagation(); setOpen((v) => !v); }}
        className="mx-0.5 inline-flex h-4 min-w-4 -translate-y-0.5 items-center justify-center rounded-full bg-accent/15 px-1 align-middle text-[10px] font-bold text-accent hover:bg-accent/25"
      >
        {tag.replace("S", "")}
      </button>
      {open && (
        <span className="absolute bottom-full left-0 z-30 mb-1 w-64 -translate-x-1/2 rounded-lg border border-border bg-popover p-2.5 text-left text-xs shadow-xl">
          <span className="block text-[10px] font-semibold uppercase tracking-wide text-accent">
            {source.kind === "material" ? "Slide" : "Note"}
          </span>
          <span className="mt-0.5 block font-medium text-foreground">{source.title}</span>
          <span className="mt-1 block max-h-24 overflow-y-auto text-muted-foreground">
            {source.excerpt.slice(0, 220)}{source.excerpt.length > 220 ? "…" : ""}
          </span>
        </span>
      )}
    </span>
  );
}

function renderWithCitations(text: string, sources: StudySource[]): React.ReactNode[] {
  const regex = /\[(S\d+)\]/g;
  const parts: React.ReactNode[] = [];
  let lastIndex = 0;
  let match: RegExpExecArray | null;
  let key = 0;
  while ((match = regex.exec(text))) {
    if (match.index > lastIndex) parts.push(text.slice(lastIndex, match.index));
    parts.push(<CitationChip key={`c${key++}`} tag={match[1]} sources={sources} />);
    lastIndex = match.index + match[0].length;
  }
  parts.push(text.slice(lastIndex));
  return parts;
}

function SourceTag({ tag, sources }: { tag?: string; sources: StudySource[] }) {
  if (!tag) return null;
  const source = sources.find((s) => s.tag === tag);
  if (!source) return null;
  return (
    <span className="inline-flex items-center gap-1 rounded-full bg-muted/60 px-2 py-0.5 text-[10px] font-medium text-muted-foreground">
      From: {source.title}
    </span>
  );
}

// ── Quiz component ───────────────────────────────────────────────────────────

function QuizMode({ questions, courseName, sources }: { questions: QuizQuestion[]; courseName: string; sources: StudySource[] }) {
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
              {q.source && <div className="mt-2"><SourceTag tag={q.source} sources={sources} /></div>}
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

function ConceptCardsMode({ concepts, sources }: { concepts: ConceptCard[]; sources: StudySource[] }) {
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
                  {c.source && <div className="mt-2"><SourceTag tag={c.source} sources={sources} /></div>}
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

function SocraticMode({ courseId }: { courseId: string }) {
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

// ── Voice Walkthrough ────────────────────────────────────────────────────────

function VoiceWalkthrough({ data, courseName }: { data: VoiceData; courseName: string }) {
  const [currentIdx, setCurrentIdx] = useState(0);
  const [playing, setPlaying] = useState(false);
  const [rate, setRateState] = useState(1.0);
  const rateRef = useRef(1.0);

  // Stable ref — onend closures always call the latest version
  const playRef = useRef<(idx: number) => void>(null!);
  playRef.current = (idx: number) => {
    if (idx >= data.sections.length) {
      setPlaying(false);
      setCurrentIdx(0);
      return;
    }
    window.speechSynthesis.cancel();
    const utterance = new SpeechSynthesisUtterance(data.sections[idx].script);
    utterance.rate = rateRef.current;
    utterance.onend = () => playRef.current(idx + 1);
    utterance.onerror = () => setPlaying(false);
    setCurrentIdx(idx);
    setPlaying(true);
    window.speechSynthesis.speak(utterance);
  };

  useEffect(() => () => { window.speechSynthesis?.cancel(); }, []);

  function handlePlay() {
    if (playing) {
      window.speechSynthesis.pause();
      setPlaying(false);
    } else if (window.speechSynthesis.paused) {
      window.speechSynthesis.resume();
      setPlaying(true);
    } else {
      playRef.current(currentIdx);
    }
  }

  function handleStop() {
    window.speechSynthesis.cancel();
    setPlaying(false);
    setCurrentIdx(0);
  }

  function jumpTo(idx: number) {
    const wasPlaying = playing;
    window.speechSynthesis.cancel();
    setPlaying(false);
    setCurrentIdx(idx);
    if (wasPlaying) setTimeout(() => playRef.current(idx), 50);
  }

  function changeRate(r: number) {
    rateRef.current = r;
    setRateState(r);
    if (playing) {
      window.speechSynthesis.cancel();
      setTimeout(() => playRef.current(currentIdx), 50);
    }
  }

  const section = data.sections[currentIdx];
  const progress = data.sections.length > 1
    ? (currentIdx / (data.sections.length - 1)) * 100
    : playing ? 100 : 0;

  return (
    <div className="space-y-4">
      {/* Status bar */}
      <div className="rounded-xl border border-indigo-500/20 bg-indigo-500/5 p-4">
        <div className="mb-2.5 flex items-center gap-2">
          <Volume2 className={cn("h-4 w-4 text-indigo-400", playing && "animate-pulse")} />
          <span className="text-sm font-semibold text-foreground">Voice Walkthrough</span>
          <span className="text-xs text-muted-foreground">· {courseName}</span>
          <span className="ml-auto text-xs text-muted-foreground">~{data.totalEstimatedMinutes} min</span>
        </div>
        <div className="h-1.5 w-full rounded-full bg-muted/40">
          <div className="h-full rounded-full bg-indigo-500 transition-all duration-700" style={{ width: `${progress}%` }} />
        </div>
        <p className="mt-1.5 text-[10px] text-muted-foreground">
          Section {currentIdx + 1} of {data.sections.length}
        </p>
      </div>

      {/* Current section display */}
      <div className="rounded-xl border border-border/70 bg-card/80 p-5">
        <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-indigo-400">
          {section?.title}
        </p>
        <p className="text-sm leading-relaxed text-foreground/90">{section?.script}</p>
      </div>

      {/* Playback controls */}
      <div className="flex flex-wrap items-center gap-3">
        <button
          onClick={handlePlay}
          className="flex items-center gap-2 rounded-xl bg-indigo-500 px-5 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-indigo-600"
        >
          {playing ? <Pause className="h-4 w-4" /> : <Play className="h-4 w-4" />}
          {playing ? "Pause" : "Play"}
        </button>
        <button
          onClick={handleStop}
          disabled={!playing && currentIdx === 0}
          className="flex items-center gap-2 rounded-xl border border-border/60 px-4 py-2.5 text-sm text-muted-foreground transition-colors hover:text-foreground disabled:opacity-40"
        >
          <Square className="h-3.5 w-3.5" />
          Stop
        </button>
        <div className="ml-auto flex items-center gap-2">
          <span className="text-xs text-muted-foreground">Speed</span>
          <select
            value={rate}
            onChange={(e) => changeRate(Number(e.target.value))}
            className="rounded-lg border border-border/60 bg-background px-2 py-1.5 text-xs text-foreground"
          >
            {[0.75, 1, 1.25, 1.5, 2].map((r) => (
              <option key={r} value={r}>{r}x</option>
            ))}
          </select>
        </div>
      </div>

      {/* Section list */}
      <div className="space-y-1">
        <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Sections</p>
        {data.sections.map((s, i) => (
          <button
            key={i}
            onClick={() => jumpTo(i)}
            className={cn(
              "flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-left text-sm transition-all",
              i === currentIdx
                ? "border border-indigo-500/20 bg-indigo-500/10 font-semibold text-indigo-400"
                : i < currentIdx
                  ? "text-muted-foreground/50 hover:text-muted-foreground"
                  : "text-muted-foreground hover:bg-muted/30 hover:text-foreground"
            )}
          >
            <span className={cn(
              "flex h-5 w-5 shrink-0 items-center justify-center rounded-full text-[10px] font-bold",
              i === currentIdx ? "bg-indigo-500 text-white" :
              i < currentIdx ? "bg-success/20 text-success" : "bg-muted/40 text-muted-foreground"
            )}>
              {i < currentIdx ? "✓" : i + 1}
            </span>
            <span className="min-w-0 flex-1 truncate">{s.title}</span>
            {i === currentIdx && playing && (
              <Volume2 className="h-3.5 w-3.5 shrink-0 animate-pulse text-indigo-400" />
            )}
          </button>
        ))}
      </div>
    </div>
  );
}

// ── Podcast / Audio Overview (two hosts) ────────────────────────────────────

const HOST_INFO = {
  A: { name: "Maya", color: "text-cyan-400", bg: "bg-cyan-500/15" },
  B: { name: "Dr. K", color: "text-violet-400", bg: "bg-violet-500/15" },
};

function stripCitations(text: string): string {
  return text.replace(/\[S\d+\]/g, "");
}

function PodcastWalkthrough({ data, courseName, sources }: { data: PodcastData; courseName: string; sources: StudySource[] }) {
  const [currentIdx, setCurrentIdx] = useState(0);
  const [playing, setPlaying] = useState(false);
  const [rate, setRateState] = useState(1.0);
  const rateRef = useRef(1.0);
  const voicesRef = useRef<SpeechSynthesisVoice[]>([]);

  useEffect(() => {
    function loadVoices() { voicesRef.current = window.speechSynthesis?.getVoices() ?? []; }
    loadVoices();
    window.speechSynthesis?.addEventListener("voiceschanged", loadVoices);
    return () => window.speechSynthesis?.removeEventListener("voiceschanged", loadVoices);
  }, []);

  const playRef = useRef<(idx: number) => void>(null!);
  playRef.current = (idx: number) => {
    if (idx >= data.turns.length) { setPlaying(false); setCurrentIdx(0); return; }
    window.speechSynthesis.cancel();
    const turn = data.turns[idx];
    const utterance = new SpeechSynthesisUtterance(stripCitations(turn.text));
    const voices = voicesRef.current;
    if (voices.length > 1) {
      utterance.voice = turn.speaker === "A" ? voices[0] : voices[voices.length - 1];
    } else {
      utterance.pitch = turn.speaker === "A" ? 1.25 : 0.85;
    }
    utterance.rate = rateRef.current;
    utterance.onend = () => playRef.current(idx + 1);
    utterance.onerror = () => setPlaying(false);
    setCurrentIdx(idx);
    setPlaying(true);
    window.speechSynthesis.speak(utterance);
  };

  useEffect(() => () => { window.speechSynthesis?.cancel(); }, []);

  function handlePlay() {
    if (playing) {
      window.speechSynthesis.pause();
      setPlaying(false);
    } else if (window.speechSynthesis.paused) {
      window.speechSynthesis.resume();
      setPlaying(true);
    } else {
      playRef.current(currentIdx);
    }
  }

  function handleStop() {
    window.speechSynthesis.cancel();
    setPlaying(false);
    setCurrentIdx(0);
  }

  function changeRate(r: number) {
    rateRef.current = r;
    setRateState(r);
    if (playing) {
      window.speechSynthesis.cancel();
      setTimeout(() => playRef.current(currentIdx), 50);
    }
  }

  const progress = data.turns.length > 1 ? (currentIdx / (data.turns.length - 1)) * 100 : playing ? 100 : 0;

  return (
    <div className="space-y-4">
      <div className="rounded-xl border border-cyan-500/20 bg-cyan-500/5 p-4">
        <div className="mb-2.5 flex items-center gap-2">
          <Headphones className={cn("h-4 w-4 text-cyan-400", playing && "animate-pulse")} />
          <span className="text-sm font-semibold text-foreground">Audio Overview</span>
          <span className="text-xs text-muted-foreground">· {courseName}</span>
          <span className="ml-auto text-xs text-muted-foreground">~{data.totalEstimatedMinutes} min</span>
        </div>
        <div className="h-1.5 w-full rounded-full bg-muted/40">
          <div className="h-full rounded-full bg-cyan-500 transition-all duration-700" style={{ width: `${progress}%` }} />
        </div>
      </div>

      {/* Transcript */}
      <div className="max-h-[50vh] space-y-3 overflow-y-auto rounded-xl border border-border/70 bg-card/80 p-4">
        {data.turns.map((turn, i) => {
          const host = HOST_INFO[turn.speaker];
          return (
            <div key={i} className={cn("flex gap-2.5", turn.speaker === "B" && "flex-row-reverse")}>
              <div className={cn("shrink-0 flex h-7 w-7 items-center justify-center rounded-full text-[10px] font-bold", host.bg, host.color)}>
                {host.name.slice(0, 2)}
              </div>
              <div className={cn(
                "max-w-[85%] rounded-2xl px-3.5 py-2.5 text-sm leading-relaxed transition-colors",
                i === currentIdx && playing ? cn(host.bg, "font-medium text-foreground") : "bg-muted/40 text-foreground/90"
              )}>
                <p className={cn("mb-0.5 text-[10px] font-semibold", host.color)}>{host.name}</p>
                {renderWithCitations(turn.text, sources)}
              </div>
            </div>
          );
        })}
      </div>

      {/* Controls */}
      <div className="flex flex-wrap items-center gap-3">
        <button
          onClick={handlePlay}
          className="flex items-center gap-2 rounded-xl bg-cyan-500 px-5 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-cyan-600"
        >
          {playing ? <Pause className="h-4 w-4" /> : <Play className="h-4 w-4" />}
          {playing ? "Pause" : "Play"}
        </button>
        <button
          onClick={handleStop}
          disabled={!playing && currentIdx === 0}
          className="flex items-center gap-2 rounded-xl border border-border/60 px-4 py-2.5 text-sm text-muted-foreground transition-colors hover:text-foreground disabled:opacity-40"
        >
          <Square className="h-3.5 w-3.5" />
          Stop
        </button>
        <div className="ml-auto flex items-center gap-2">
          <span className="text-xs text-muted-foreground">Speed</span>
          <select
            value={rate}
            onChange={(e) => changeRate(Number(e.target.value))}
            className="rounded-lg border border-border/60 bg-background px-2 py-1.5 text-xs text-foreground"
          >
            {[0.75, 1, 1.25, 1.5, 2].map((r) => (
              <option key={r} value={r}>{r}x</option>
            ))}
          </select>
        </div>
      </div>
    </div>
  );
}

// ── Study Guide ──────────────────────────────────────────────────────────────

function StudyGuideView({ data, sources }: { data: StudyGuideData; sources: StudySource[] }) {
  const [openFaq, setOpenFaq] = useState<number | null>(null);

  return (
    <div className="space-y-5">
      <div className="rounded-xl border border-teal-500/20 bg-teal-500/5 p-4">
        <p className="mb-1 text-xs font-semibold uppercase tracking-wide text-teal-500">Overview</p>
        <p className="text-sm leading-relaxed text-foreground/90">{renderWithCitations(data.overview, sources)}</p>
      </div>

      <div className="space-y-3">
        {data.sections.map((s, i) => (
          <Card key={i} className="border-border/70 bg-card/80">
            <CardContent className="pt-4">
              <p className="font-semibold text-foreground">{s.heading}</p>
              <p className="mt-1.5 text-sm leading-relaxed text-muted-foreground">{renderWithCitations(s.content, sources)}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      {data.timeline.length > 0 && (
        <div>
          <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">Timeline</p>
          <div className="space-y-0">
            {data.timeline.map((t, i) => (
              <div key={i} className="flex gap-3">
                <div className="flex flex-col items-center">
                  <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-teal-500 text-[10px] font-bold text-white">{i + 1}</span>
                  {i < data.timeline.length - 1 && <span className="w-px flex-1 bg-border/60" />}
                </div>
                <div className="pb-4">
                  <p className="text-sm font-semibold text-foreground">{t.label}</p>
                  <p className="text-xs text-muted-foreground">{t.detail}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {data.faq.length > 0 && (
        <div>
          <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">FAQ</p>
          <div className="space-y-1.5">
            {data.faq.map((f, i) => (
              <div key={i} className="rounded-lg border border-border/60 bg-card/80">
                <button
                  type="button"
                  onClick={() => setOpenFaq((cur) => (cur === i ? null : i))}
                  className="flex w-full items-center justify-between gap-2 px-3.5 py-2.5 text-left text-sm font-medium text-foreground"
                >
                  {f.question}
                  <ChevronDown className={cn("h-4 w-4 shrink-0 text-muted-foreground transition-transform", openFaq === i && "rotate-180")} />
                </button>
                {openFaq === i && (
                  <p className="px-3.5 pb-3 text-sm text-muted-foreground">{renderWithCitations(f.answer, sources)}</p>
                )}
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

// ── Mind Map ─────────────────────────────────────────────────────────────────

function MindMapBranch({ node, depth }: { node: MindMapNode; depth: number }) {
  const colors = ["text-fuchsia-400", "text-purple-400", "text-blue-400"];
  return (
    <div className={cn(depth > 0 && "ml-4 border-l border-border/50 pl-4")}>
      <p className={cn("py-1 text-sm font-semibold", colors[Math.min(depth, colors.length - 1)])}>
        {node.label}
      </p>
      {node.children && node.children.length > 0 && (
        <div>
          {node.children.map((child, i) => (
            <MindMapBranch key={i} node={child} depth={depth + 1} />
          ))}
        </div>
      )}
    </div>
  );
}

function MindMapView({ data }: { data: MindMapData }) {
  return (
    <div className="space-y-4">
      <div className="rounded-xl border border-fuchsia-500/20 bg-fuchsia-500/5 px-4 py-3 text-center">
        <Network className="mx-auto mb-1 h-5 w-5 text-fuchsia-400" />
        <p className="text-lg font-bold text-foreground">{data.root}</p>
      </div>
      <Card className="border-border/70 bg-card/80">
        <CardContent className="space-y-1 pt-5">
          {data.children.map((branch, i) => (
            <MindMapBranch key={i} node={branch} depth={0} />
          ))}
        </CardContent>
      </Card>
    </div>
  );
}

// ── Main Panel ───────────────────────────────────────────────────────────────

export function AITutorPanel({
  courseId,
  courseName,
  initialMode,
}: {
  courseId: string;
  courseName: string;
  initialMode?: Mode;
}) {
  const [mode, setMode] = useState<Mode | null>(initialMode ?? null);
  const [examPrepSetup, setExamPrepSetup] = useState(initialMode === "examPrep");
  const [examPrepCount, setExamPrepCount] = useState(15);
  const [loading, setLoading] = useState(false);
  const [textResult, setTextResult] = useState<string | null>(null);
  const [quizData, setQuizData] = useState<QuizQuestion[] | null>(null);
  const [conceptData, setConceptData] = useState<ConceptCard[] | null>(null);
  const [voiceData, setVoiceData] = useState<VoiceData | null>(null);
  const [podcastData, setPodcastData] = useState<PodcastData | null>(null);
  const [studyGuideData, setStudyGuideData] = useState<StudyGuideData | null>(null);
  const [mindMapData, setMindMapData] = useState<MindMapData | null>(null);
  const [sources, setSources] = useState<StudySource[]>([]);

  async function runMode(m: Mode, numQuestions?: number) {
    if (m === "socratic") { setMode(m); return; }
    if (m === "examPrep" && numQuestions === undefined) { setMode(m); setExamPrepSetup(true); return; }

    setMode(m);
    setExamPrepSetup(false);
    setTextResult(null);
    setQuizData(null);
    setConceptData(null);
    setPodcastData(null);
    setStudyGuideData(null);
    setMindMapData(null);
    setLoading(true);

    try {
      const res = await fetch("/api/study/ai-tutor", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ courseId, mode: m, ...(numQuestions ? { numQuestions } : {}) }),
      });
      const data = await res.json();

      if (data.error) { toast.error(data.error); setMode(null); return; }
      setSources(data.sources ?? []);

      if ((m === "quiz" || m === "examPrep") && data.data?.questions) {
        const questions: QuizQuestion[] = data.data.questions.map((q: QuizQuestion) => ({
          ...q,
          type: q.type ?? "mcq",
        }));
        setQuizData(questions);
      } else if (m === "concepts" && data.data?.concepts) {
        setConceptData(data.data.concepts);
      } else if (m === "voice" && data.data?.sections) {
        setVoiceData(data.data);
      } else if (m === "podcast" && data.data?.turns) {
        setPodcastData(data.data);
      } else if (m === "studyGuide" && data.data?.sections) {
        setStudyGuideData(data.data);
      } else if (m === "mindmap" && data.data?.children) {
        setMindMapData(data.data);
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
    window.speechSynthesis?.cancel();
    setMode(null);
    setExamPrepSetup(false);
    setTextResult(null);
    setQuizData(null);
    setConceptData(null);
    setVoiceData(null);
    setPodcastData(null);
    setStudyGuideData(null);
    setMindMapData(null);
  }

  // Mode selector
  if (!mode) {
    return (
      <div className="space-y-4">
        <div className="rounded-xl border border-accent/20 bg-accent/5 px-4 py-3">
          <p className="text-sm font-semibold text-foreground">AI Tutor — {courseName}</p>
          <p className="mt-0.5 text-xs text-muted-foreground">Choose a learning mode. AI uses your notes, uploaded slides, and flashcards.</p>
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

  // Exam prep question-count picker (shown before generating)
  if (mode === "examPrep" && examPrepSetup) {
    return (
      <div className="space-y-4">
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
        <div className="rounded-2xl border border-border/70 bg-card/80 p-6 space-y-4">
          <p className="text-sm text-muted-foreground">
            AI will generate multiple-choice questions (A–D) covering everything examinable in your notes, uploaded slides, and flashcards for this course.
          </p>
          <div className="flex items-center gap-3">
            <label className="text-sm font-medium text-foreground">Number of questions:</label>
            <Input
              type="number" min={5} max={25}
              value={examPrepCount}
              onChange={(e) => setExamPrepCount(Math.min(Math.max(parseInt(e.target.value) || 15, 5), 25))}
              className="h-9 w-20"
            />
          </div>
          <Button className="w-full gap-2" onClick={() => runMode("examPrep", examPrepCount)}>
            <CheckCircle2 className="h-4 w-4" /> Generate {examPrepCount} questions
          </Button>
        </div>
      </div>
    );
  }

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
             mode === "examPrep" ? `Generating ${examPrepCount} exam questions from your slides…` :
             mode === "concepts" ? "Extracting concepts…" :
             mode === "predict" ? "Analysing exam patterns…" :
             mode === "recap" ? "Distilling key points…" :
             mode === "voice" ? "Writing your narration script…" :
             mode === "podcast" ? "Producing your two-host audio overview…" :
             mode === "studyGuide" ? "Building your study guide…" :
             mode === "mindmap" ? "Mapping how topics connect…" :
             "Preparing your lesson…"}
          </p>
        </div>
      ) : mode === "socratic" ? (
        <SocraticMode courseId={courseId} />
      ) : (mode === "quiz" || mode === "examPrep") && quizData ? (
        <QuizMode questions={quizData} courseName={courseName} sources={sources} />
      ) : mode === "concepts" && conceptData ? (
        <ConceptCardsMode concepts={conceptData} sources={sources} />
      ) : mode === "voice" && voiceData ? (
        <VoiceWalkthrough data={voiceData} courseName={courseName} />
      ) : mode === "podcast" && podcastData ? (
        <PodcastWalkthrough data={podcastData} courseName={courseName} sources={sources} />
      ) : mode === "studyGuide" && studyGuideData ? (
        <StudyGuideView data={studyGuideData} sources={sources} />
      ) : mode === "mindmap" && mindMapData ? (
        <MindMapView data={mindMapData} />
      ) : textResult ? (
        <Card className="border-border/70 bg-card/80">
          <CardContent className="space-y-2 pt-5">
            <div className="prose prose-sm max-w-none dark:prose-invert space-y-2">
              {textResult.split("\n").map((line, i) => (
                <p key={i} className="whitespace-pre-wrap text-sm leading-relaxed text-foreground/90">
                  {renderWithCitations(line, sources)}
                </p>
              ))}
            </div>
            {sources.length > 0 && (
              <p className="pt-2 text-[11px] text-muted-foreground/60">
                Tap a numbered circle to see which note or slide a claim came from.
              </p>
            )}
          </CardContent>
        </Card>
      ) : null}
    </div>
  );
}
