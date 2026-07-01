"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { toast } from "sonner";
import {
  Download, Eraser, Grid, Loader2, Moon, Pen,
  Redo2, Sparkles, Sun, Trash2, Type, Undo2,
} from "lucide-react";
import { cn } from "@/lib/utils";

type Tool = "pen" | "eraser" | "highlighter";

const DARK_BG = "#0f172a";
const LIGHT_BG = "#ffffff";

const DARK_COLORS = [
  { value: "#f1f5f9", label: "White" },
  { value: "#818cf8", label: "Indigo" },
  { value: "#34d399", label: "Green" },
  { value: "#f87171", label: "Red" },
  { value: "#fbbf24", label: "Yellow" },
  { value: "#60a5fa", label: "Blue" },
];

const LIGHT_COLORS = [
  { value: "#1e293b", label: "Black" },
  { value: "#4f46e5", label: "Indigo" },
  { value: "#059669", label: "Green" },
  { value: "#dc2626", label: "Red" },
  { value: "#d97706", label: "Orange" },
  { value: "#2563eb", label: "Blue" },
];

const SIZES = [2, 4, 7, 12, 20];
const MAX_HISTORY = 40;

interface Props {
  courseId?: string;
  onSave?: (dataUrl: string, transcription?: string) => void;
  className?: string;
}

export function HandwritingCanvas({ courseId, onSave, className }: Props) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const isDrawing = useRef(false);
  const ctxRef = useRef<CanvasRenderingContext2D | null>(null);
  const historyRef = useRef<ImageData[]>([]);
  const historyIndexRef = useRef(-1);

  const [tool, setTool] = useState<Tool>("pen");
  const [color, setColor] = useState("#f1f5f9");
  const [size, setSize] = useState(4);
  const [isEmpty, setIsEmpty] = useState(true);
  const [transcribing, setTranscribing] = useState(false);
  const [transcription, setTranscription] = useState<string | null>(null);
  const [darkMode, setDarkMode] = useState(true);
  const [showGrid, setShowGrid] = useState(false);
  const [canUndo, setCanUndo] = useState(false);
  const [canRedo, setCanRedo] = useState(false);

  const bg = darkMode ? DARK_BG : LIGHT_BG;
  const COLORS = darkMode ? DARK_COLORS : LIGHT_COLORS;

  // Switch to appropriate default color when toggling dark/light
  useEffect(() => {
    setColor(darkMode ? "#f1f5f9" : "#1e293b");
  }, [darkMode]);

  function saveSnapshot() {
    const canvas = canvasRef.current;
    const ctx = ctxRef.current;
    if (!canvas || !ctx) return;
    const snap = ctx.getImageData(0, 0, canvas.width, canvas.height);
    // Trim redo history
    historyRef.current = historyRef.current.slice(0, historyIndexRef.current + 1);
    historyRef.current.push(snap);
    if (historyRef.current.length > MAX_HISTORY) historyRef.current.shift();
    historyIndexRef.current = historyRef.current.length - 1;
    setCanUndo(historyIndexRef.current > 0);
    setCanRedo(false);
  }

  function undo() {
    const ctx = ctxRef.current;
    const canvas = canvasRef.current;
    if (!ctx || !canvas || historyIndexRef.current <= 0) return;
    historyIndexRef.current--;
    ctx.putImageData(historyRef.current[historyIndexRef.current], 0, 0);
    setCanUndo(historyIndexRef.current > 0);
    setCanRedo(true);
    setIsEmpty(false);
  }

  function redo() {
    const ctx = ctxRef.current;
    const canvas = canvasRef.current;
    if (!ctx || !canvas || historyIndexRef.current >= historyRef.current.length - 1) return;
    historyIndexRef.current++;
    ctx.putImageData(historyRef.current[historyIndexRef.current], 0, 0);
    setCanUndo(true);
    setCanRedo(historyIndexRef.current < historyRef.current.length - 1);
  }

  const drawGrid = useCallback((ctx: CanvasRenderingContext2D, w: number, h: number) => {
    const spacing = 28;
    ctx.save();
    ctx.strokeStyle = darkMode ? "rgba(148,163,184,0.12)" : "rgba(100,116,139,0.15)";
    ctx.lineWidth = 0.5;
    for (let x = spacing; x < w; x += spacing) {
      ctx.beginPath(); ctx.moveTo(x, 0); ctx.lineTo(x, h); ctx.stroke();
    }
    for (let y = spacing; y < h; y += spacing) {
      ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(w, y); ctx.stroke();
    }
    ctx.restore();
  }, [darkMode]);

  const initCanvas = useCallback(() => {
    const canvas = canvasRef.current;
    const container = containerRef.current;
    if (!canvas || !container) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    const w = container.clientWidth;
    const h = container.clientHeight;

    // Save current drawing before resize
    let prevData: ImageData | null = null;
    if (canvas.width > 0 && canvas.height > 0) {
      try { prevData = ctx.getImageData(0, 0, canvas.width, canvas.height); } catch { /* ignore */ }
    }

    canvas.width = w * dpr;
    canvas.height = h * dpr;
    canvas.style.width = `${w}px`;
    canvas.style.height = `${h}px`;
    ctx.scale(dpr, dpr);
    ctx.fillStyle = bg;
    ctx.fillRect(0, 0, w, h);
    if (showGrid) drawGrid(ctx, w, h);
    if (prevData) ctx.putImageData(prevData, 0, 0);
    ctxRef.current = ctx;
  }, [bg, showGrid, drawGrid]);

  useEffect(() => {
    initCanvas();
    const ro = new ResizeObserver(initCanvas);
    if (containerRef.current) ro.observe(containerRef.current);
    return () => ro.disconnect();
  }, [initCanvas]);

  // Re-draw grid when toggled without erasing content
  useEffect(() => {
    const ctx = ctxRef.current;
    const canvas = canvasRef.current;
    const container = containerRef.current;
    if (!ctx || !canvas || !container) return;
    const w = container.clientWidth;
    const h = container.clientHeight;
    if (showGrid) drawGrid(ctx, w, h);
    else {
      // Repaint bg under grid lines without losing strokes — just re-init
      initCanvas();
    }
  }, [showGrid, drawGrid, initCanvas]);

  function getPos(e: React.PointerEvent<HTMLCanvasElement>) {
    const rect = canvasRef.current!.getBoundingClientRect();
    return { x: e.clientX - rect.left, y: e.clientY - rect.top };
  }

  function onPointerDown(e: React.PointerEvent<HTMLCanvasElement>) {
    const ctx = ctxRef.current;
    if (!ctx) return;
    (e.target as HTMLCanvasElement).setPointerCapture(e.pointerId);
    saveSnapshot();
    isDrawing.current = true;
    const pos = getPos(e);
    const pressure = e.pressure > 0 ? e.pressure : 1;

    ctx.beginPath();
    ctx.moveTo(pos.x, pos.y);

    if (tool === "eraser") {
      ctx.globalCompositeOperation = "destination-out";
      ctx.lineWidth = size * 5;
    } else if (tool === "highlighter") {
      ctx.globalCompositeOperation = "source-over";
      ctx.globalAlpha = 0.35;
      ctx.strokeStyle = color;
      ctx.lineWidth = size * 4 * pressure;
    } else {
      ctx.globalCompositeOperation = "source-over";
      ctx.globalAlpha = 1;
      ctx.strokeStyle = color;
      ctx.lineWidth = size * pressure;
    }
    ctx.lineCap = "round";
    ctx.lineJoin = "round";
    setIsEmpty(false);
  }

  function onPointerMove(e: React.PointerEvent<HTMLCanvasElement>) {
    if (!isDrawing.current) return;
    const ctx = ctxRef.current;
    if (!ctx) return;
    const pressure = e.pressure > 0 ? e.pressure : 1;
    const pos = getPos(e);

    if (tool === "eraser") {
      ctx.lineWidth = size * 5;
    } else if (tool === "highlighter") {
      ctx.lineWidth = size * 4 * pressure;
    } else {
      ctx.lineWidth = size * pressure;
    }

    ctx.lineTo(pos.x, pos.y);
    ctx.stroke();
    // Start new path from here for smooth pressure variation
    ctx.beginPath();
    ctx.moveTo(pos.x, pos.y);
  }

  function onPointerUp() {
    if (!isDrawing.current) return;
    isDrawing.current = false;
    const ctx = ctxRef.current;
    if (ctx) {
      ctx.globalCompositeOperation = "source-over";
      ctx.globalAlpha = 1;
    }
  }

  function clearCanvas() {
    const canvas = canvasRef.current;
    const ctx = ctxRef.current;
    const container = containerRef.current;
    if (!canvas || !ctx || !container) return;
    saveSnapshot();
    const w = container.clientWidth;
    const h = container.clientHeight;
    ctx.globalCompositeOperation = "source-over";
    ctx.globalAlpha = 1;
    ctx.fillStyle = bg;
    ctx.fillRect(0, 0, w, h);
    if (showGrid) drawGrid(ctx, w, h);
    setIsEmpty(true);
    setTranscription(null);
  }

  function downloadCanvas() {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const link = document.createElement("a");
    link.download = `lifeos-note-${Date.now()}.png`;
    link.href = canvas.toDataURL("image/png");
    link.click();
  }

  async function transcribeAndSave() {
    const canvas = canvasRef.current;
    if (!canvas || isEmpty) return;
    setTranscribing(true);
    setTranscription(null);
    try {
      const dataUrl = canvas.toDataURL("image/png");
      const res = await fetch("/api/study/transcribe-handwriting", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ image: dataUrl, courseId }),
      });
      const data = await res.json();
      if (!res.ok) {
        toast.error(data.error ?? "Transcription failed");
        return;
      }
      setTranscription(data.text ?? "");
      if (onSave) onSave(dataUrl, data.text);
      if (data.saved) toast.success("Handwriting converted and saved as a note");
      else toast.success("Handwriting converted to text");
    } catch {
      toast.error("Could not convert handwriting");
    } finally {
      setTranscribing(false);
    }
  }

  // Keyboard shortcuts
  useEffect(() => {
    function handleKey(e: KeyboardEvent) {
      if ((e.metaKey || e.ctrlKey) && e.key === "z") {
        e.preventDefault();
        if (e.shiftKey) redo(); else undo();
      }
    }
    window.addEventListener("keydown", handleKey);
    return () => window.removeEventListener("keydown", handleKey);
  }, []);

  return (
    <div className={cn("flex flex-col gap-3", className)}>
      {/* Toolbar */}
      <div className="flex flex-wrap items-center gap-2 rounded-xl border border-border/50 bg-muted/20 px-3 py-2">
        {/* Tool toggle */}
        <div className="flex gap-1 rounded-lg border border-border/50 bg-muted/30 p-0.5">
          {(["pen", "highlighter", "eraser"] as Tool[]).map((t) => (
            <button
              key={t}
              type="button"
              onClick={() => setTool(t)}
              title={t.charAt(0).toUpperCase() + t.slice(1)}
              className={cn(
                "flex h-7 w-7 items-center justify-center rounded-md transition-all",
                tool === t ? "bg-accent text-white" : "text-muted-foreground hover:text-foreground"
              )}
            >
              {t === "pen" ? <Pen className="h-3.5 w-3.5" /> :
               t === "eraser" ? <Eraser className="h-3.5 w-3.5" /> :
               <span className="text-[10px] font-bold">HL</span>}
            </button>
          ))}
        </div>

        {/* Colors */}
        <div className="flex items-center gap-1">
          {COLORS.map((c) => (
            <button
              key={c.value}
              type="button"
              title={c.label}
              onClick={() => { setColor(c.value); if (tool === "eraser") setTool("pen"); }}
              className={cn(
                "h-5 w-5 rounded-full border-2 transition-all",
                color === c.value && tool !== "eraser"
                  ? "scale-125 border-white shadow-sm"
                  : "border-transparent opacity-60 hover:opacity-100"
              )}
              style={{ backgroundColor: c.value }}
            />
          ))}
        </div>

        {/* Stroke size */}
        <div className="flex items-center gap-1">
          {SIZES.map((s) => (
            <button
              key={s}
              type="button"
              onClick={() => setSize(s)}
              className={cn(
                "flex h-7 w-7 items-center justify-center rounded-md transition-all",
                size === s ? "bg-accent/20 ring-1 ring-accent/40" : "hover:bg-muted/50"
              )}
            >
              <div
                className="rounded-full"
                style={{
                  width: Math.min(s * 2, 16),
                  height: Math.min(s * 2, 16),
                  backgroundColor: color,
                  opacity: tool === "eraser" ? 0.3 : 1,
                }}
              />
            </button>
          ))}
        </div>

        {/* Right-side controls */}
        <div className="ml-auto flex items-center gap-1.5">
          {/* Undo / Redo */}
          <button type="button" onClick={undo} disabled={!canUndo} title="Undo (Ctrl+Z)"
            className="flex h-7 w-7 items-center justify-center rounded-lg border border-border/50 text-muted-foreground disabled:opacity-30 hover:text-foreground">
            <Undo2 className="h-3.5 w-3.5" />
          </button>
          <button type="button" onClick={redo} disabled={!canRedo} title="Redo (Ctrl+Shift+Z)"
            className="flex h-7 w-7 items-center justify-center rounded-lg border border-border/50 text-muted-foreground disabled:opacity-30 hover:text-foreground">
            <Redo2 className="h-3.5 w-3.5" />
          </button>

          {/* Grid toggle */}
          <button type="button" onClick={() => setShowGrid(v => !v)} title="Toggle grid"
            className={cn(
              "flex h-7 w-7 items-center justify-center rounded-lg border transition-all",
              showGrid ? "border-accent/40 bg-accent/10 text-accent" : "border-border/50 text-muted-foreground hover:text-foreground"
            )}>
            <Grid className="h-3.5 w-3.5" />
          </button>

          {/* Dark/light toggle */}
          <button type="button" onClick={() => setDarkMode(v => !v)} title="Toggle background"
            className="flex h-7 w-7 items-center justify-center rounded-lg border border-border/50 text-muted-foreground hover:text-foreground">
            {darkMode ? <Sun className="h-3.5 w-3.5" /> : <Moon className="h-3.5 w-3.5" />}
          </button>

          <button type="button" onClick={clearCanvas} disabled={isEmpty} title="Clear"
            className="flex items-center gap-1 rounded-lg border border-border/50 px-2.5 py-1.5 text-xs text-muted-foreground hover:border-danger/40 hover:text-danger disabled:opacity-40">
            <Trash2 className="h-3 w-3" />
            Clear
          </button>
          <button type="button" onClick={downloadCanvas} disabled={isEmpty} title="Download PNG"
            className="flex items-center gap-1 rounded-lg border border-border/50 px-2.5 py-1.5 text-xs text-muted-foreground hover:text-foreground disabled:opacity-40">
            <Download className="h-3 w-3" />
            Save
          </button>
          {courseId && (
            <button type="button" onClick={transcribeAndSave} disabled={isEmpty || transcribing}
              title="Convert handwriting to text using AI"
              className="flex items-center gap-1 rounded-lg border border-accent/30 bg-accent/10 px-2.5 py-1.5 text-xs font-semibold text-accent hover:bg-accent/20 disabled:opacity-40">
              {transcribing ? <Loader2 className="h-3 w-3 animate-spin" /> : <Sparkles className="h-3 w-3" />}
              {transcribing ? "Converting…" : "Convert to text"}
            </button>
          )}
        </div>
      </div>

      {/* Canvas */}
      <div
        ref={containerRef}
        className="relative overflow-hidden rounded-2xl border border-border/50"
        style={{ height: 440, touchAction: "none" }}
      >
        <canvas
          ref={canvasRef}
          onPointerDown={onPointerDown}
          onPointerMove={onPointerMove}
          onPointerUp={onPointerUp}
          onPointerLeave={onPointerUp}
          className="block h-full w-full"
          style={{ touchAction: "none", cursor: tool === "eraser" ? "cell" : "crosshair" }}
        />
        {isEmpty && (
          <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center gap-2 text-center">
            <Pen className="h-10 w-10 text-muted-foreground/15" />
            <p className="text-sm text-muted-foreground/30">Draw with finger, mouse, or stylus</p>
            <p className="text-xs text-muted-foreground/20">Apple Pencil · Surface Pen · S Pen · Mouse</p>
          </div>
        )}
      </div>

      {/* Transcription result */}
      {transcription !== null && (
        <div className="rounded-xl border border-accent/20 bg-accent/5 p-4 space-y-2">
          <div className="flex items-center gap-2">
            <Type className="h-4 w-4 text-accent" />
            <p className="text-sm font-semibold text-accent">Converted text</p>
            <button
              type="button"
              onClick={() => { navigator.clipboard.writeText(transcription); toast.success("Copied to clipboard"); }}
              className="ml-auto text-xs text-muted-foreground hover:text-foreground"
            >
              Copy
            </button>
          </div>
          <p className="text-sm leading-relaxed text-foreground whitespace-pre-wrap">
            {transcription || "(No text detected — try writing more clearly with larger strokes)"}
          </p>
          {courseId && transcription && (
            <p className="text-[10px] text-success">Saved as a note in this course.</p>
          )}
        </div>
      )}

      <p className="text-center text-[10px] text-muted-foreground/40">
        Undo: Ctrl+Z · Redo: Ctrl+Shift+Z · Pressure-sensitive on stylus devices
      </p>
    </div>
  );
}
