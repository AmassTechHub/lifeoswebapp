"use client";

import { useEffect, useRef, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { Bot, Loader2, Mic, MicOff, Volume2, VolumeX, X } from "lucide-react";
import { cn } from "@/lib/utils";

type State = "idle" | "listening" | "thinking" | "speaking";
type Msg = { role: "user" | "assistant"; text: string };

// Check for browser support
function hasSpeechRecognition(): boolean {
  return typeof window !== "undefined" && ("SpeechRecognition" in window || "webkitSpeechRecognition" in window);
}
function hasSpeechSynthesis(): boolean {
  return typeof window !== "undefined" && "speechSynthesis" in window;
}

function speak(text: string, onEnd?: () => void) {
  if (!hasSpeechSynthesis()) { onEnd?.(); return; }
  window.speechSynthesis.cancel();
  const utt = new SpeechSynthesisUtterance(text);
  utt.rate = 1.05;
  utt.pitch = 1.0;
  utt.lang = "en-US";
  // prefer a natural voice if available
  const voices = window.speechSynthesis.getVoices();
  const natural = voices.find(
    (v) => v.localService && (v.name.includes("Google") || v.name.includes("Samantha") || v.name.includes("Daniel"))
  );
  if (natural) utt.voice = natural;
  utt.onend = () => onEnd?.();
  window.speechSynthesis.speak(utt);
}

export function VoiceAssistant() {
  const [open, setOpen] = useState(false);
  const [state, setState] = useState<State>("idle");
  const [history, setHistory] = useState<Msg[]>([]);
  const [transcript, setTranscript] = useState("");
  const [muted, setMuted] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const recognitionRef = useRef<{ stop: () => void } | null>(null);
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [history, transcript]);

  function startListening() {
    if (!hasSpeechRecognition()) {
      setError("Speech recognition not supported in this browser. Try Chrome or Edge.");
      return;
    }
    setError(null);
    setTranscript("");

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const SR = (window as any).SpeechRecognition ?? (window as any).webkitSpeechRecognition;
    const recognition = new SR() as SpeechRecognition;
    recognitionRef.current = recognition;
    recognition.lang = "en-US";
    recognition.interimResults = true;
    recognition.maxAlternatives = 1;

    recognition.onresult = (e) => {
      const t = Array.from(e.results)
        .map((r) => r[0].transcript)
        .join("");
      setTranscript(t);
    };

    recognition.onend = () => {
      if (state !== "listening") return;
      const final = transcript.trim();
      if (final) sendToAI(final);
      else setState("idle");
    };

    recognition.onerror = (e) => {
      if (e.error === "no-speech") { setState("idle"); return; }
      setError(`Mic error: ${e.error}`);
      setState("idle");
    };

    setState("listening");
    recognition.start();
  }

  function stopListening() {
    recognitionRef.current?.stop();
    const final = transcript.trim();
    if (final) sendToAI(final);
    else setState("idle");
  }

  async function sendToAI(text: string) {
    setState("thinking");
    setTranscript("");
    const userMsg: Msg = { role: "user", text };
    setHistory((h) => [...h, userMsg]);

    try {
      const res = await fetch("/api/coach/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          message: text,
          history: [...history, userMsg].map(({ role, text: content }) => ({ role, content })),
          voiceMode: true,
        }),
      });
      const data = await res.json();
      const reply: string = data.reply ?? data.error ?? "Sorry, I couldn't process that.";
      const assistantMsg: Msg = { role: "assistant", text: reply };
      setHistory((h) => [...h, assistantMsg]);

      if (!muted) {
        setState("speaking");
        speak(reply, () => setState("idle"));
      } else {
        setState("idle");
      }
    } catch {
      setHistory((h) => [...h, { role: "assistant", text: "Network error. Check your connection." }]);
      setState("idle");
    }
  }

  function handleMicClick() {
    if (state === "listening") stopListening();
    else if (state === "idle") startListening();
  }

  function handleClose() {
    window.speechSynthesis?.cancel();
    recognitionRef.current?.stop();
    setOpen(false);
    setState("idle");
    setTranscript("");
  }

  return (
    <>
      {/* Floating trigger button */}
      <button
        type="button"
        onClick={() => setOpen(true)}
        className={cn(
          "fixed bottom-20 right-5 z-40 flex h-12 w-12 items-center justify-center rounded-full shadow-lg transition-all duration-200",
          "bg-accent text-white hover:scale-105 hover:shadow-xl active:scale-95",
          open && "hidden"
        )}
        aria-label="Open voice assistant"
        title="Voice Assistant (AI)"
      >
        <Mic className="h-5 w-5" />
      </button>

      {/* Panel */}
      <AnimatePresence>
        {open && (
          <motion.div
            key="voice-panel"
            initial={{ opacity: 0, y: 24, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 16, scale: 0.96 }}
            transition={{ duration: 0.2, ease: "easeOut" }}
            className="fixed bottom-4 right-4 z-50 flex w-[min(380px,calc(100vw-2rem))] flex-col overflow-hidden rounded-2xl border border-border/70 bg-card shadow-2xl"
          >
            {/* Header */}
            <div className="flex items-center gap-2.5 border-b border-border/50 px-4 py-3">
              <div className="flex h-7 w-7 items-center justify-center rounded-full bg-accent/15 text-accent">
                <Bot className="h-4 w-4" />
              </div>
              <div className="flex-1">
                <p className="text-sm font-semibold text-foreground">Voice Assistant</p>
                <p className="text-[10px] text-muted-foreground">
                  {state === "idle" && "Tap mic to speak"}
                  {state === "listening" && "Listening…"}
                  {state === "thinking" && "Thinking…"}
                  {state === "speaking" && "Speaking…"}
                </p>
              </div>
              <button
                type="button"
                onClick={() => setMuted((v) => !v)}
                className="rounded p-1 text-muted-foreground/50 hover:text-foreground"
                title={muted ? "Unmute" : "Mute voice"}
              >
                {muted ? <VolumeX className="h-4 w-4" /> : <Volume2 className="h-4 w-4" />}
              </button>
              <button type="button" onClick={handleClose} className="rounded p-1 text-muted-foreground/50 hover:text-foreground">
                <X className="h-4 w-4" />
              </button>
            </div>

            {/* Chat history */}
            <div className="flex max-h-72 min-h-30 flex-col gap-2.5 overflow-y-auto p-4">
              {history.length === 0 && !transcript && (
                <p className="text-center text-sm text-muted-foreground">
                  Say anything — plan your day, ask questions, or talk through what to work on next.
                </p>
              )}
              {history.map((msg, i) => (
                <div
                  key={i}
                  className={cn(
                    "max-w-[85%] rounded-xl px-3.5 py-2.5 text-sm leading-relaxed",
                    msg.role === "user"
                      ? "ml-auto bg-accent text-accent-foreground"
                      : "mr-auto border border-border/60 bg-muted/50 text-foreground"
                  )}
                >
                  {msg.text}
                </div>
              ))}
              {/* Live transcript */}
              {transcript && (
                <div className="ml-auto max-w-[85%] rounded-xl bg-accent/30 px-3.5 py-2.5 text-sm text-foreground italic">
                  {transcript}…
                </div>
              )}
              {error && (
                <p className="text-center text-xs text-danger">{error}</p>
              )}
              <div ref={bottomRef} />
            </div>

            {/* Mic button area */}
            <div className="border-t border-border/50 px-4 py-4">
              <div className="flex items-center justify-center">
                <button
                  type="button"
                  onClick={handleMicClick}
                  disabled={state === "thinking" || state === "speaking"}
                  className={cn(
                    "relative flex h-16 w-16 items-center justify-center rounded-full transition-all duration-200",
                    state === "listening"
                      ? "bg-danger shadow-lg shadow-danger/30 scale-110"
                      : state === "thinking" || state === "speaking"
                        ? "bg-muted cursor-not-allowed"
                        : "bg-accent shadow-md hover:scale-105 hover:shadow-lg active:scale-95"
                  )}
                  aria-label={state === "listening" ? "Stop listening" : "Start listening"}
                >
                  {/* Pulse ring when listening */}
                  {state === "listening" && (
                    <span className="absolute inset-0 animate-ping rounded-full bg-danger/40" />
                  )}
                  {state === "thinking" ? (
                    <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
                  ) : state === "listening" ? (
                    <MicOff className="h-6 w-6 text-white" />
                  ) : (
                    <Mic className="h-6 w-6 text-white" />
                  )}
                </button>
              </div>
              <p className="mt-2 text-center text-[11px] text-muted-foreground/50">
                {!hasSpeechRecognition()
                  ? "Use Chrome or Edge for voice input"
                  : state === "listening"
                    ? "Tap to stop and send"
                    : "Tap mic to start"}
              </p>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}
