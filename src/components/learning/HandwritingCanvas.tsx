"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { toast } from "sonner";
import {
  Download, Eraser, Loader2, Pen, RotateCcw, Save,
  Sparkles, Trash2, Type,
} from "lucide-react";
import { cn } from "@/lib/utils";

type Tool = "pen" | "eraser";
type StrokeColor = "#e2e8f0" | "#818cf8" | "#34d399" | "#f87171" | "#fbbf24" | "#000000";

const COLORS: { value: StrokeColor; label: string }[] = [
  { value: "#e2e8f0", label: "White" },
  { value: "#818cf8", label: "Indigo" },
  { value: "#34d399", label: "Green" },
  { value: "#f87171", label: "Red" },
  { value: "#fbbf24", label: "Yellow" },
  { value: "#000000", label: "Black" },
];

const SIZES = [2, 4, 7, 12, 20];

interface Props {
  /** If provided, "Convert & Save as note" will POST to save the transcription */
  courseId?: string;
  onSave?: (dataUrl: string, transcription?: string) => void;
  className?: string;
}

export function HandwritingCanvas({ courseId, onSave, className }: Props) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const isDrawing = useRef(false);
  const lastPoint = useRef<{ x: number; y: number } | null>(null);
  const ctxRef = useRef<CanvasRenderingContext2D | null>(null);

  const [tool, setTool] = useState<Tool>("pen");
  const [color, setColor] = useState<StrokeColor>("#e2e8f0");
  const [size, setSize] = useState(4);
  const [isEmpty, setIsEmpty] = useState(true);
  const [transcribing, setTranscribing] = useState(false);
  const [transcription, setTranscription] = useState<string | null>(null);

  // Resize canvas to container
  const resize = useCallback(() => {
    const canvas = canvasRef.current;
    const container = containerRef.current;
    if (!canvas || !container) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    // Save current drawing
    const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
    const dpr = Math.min(window.devicePixelRatio || 1, 2);

    canvas.width = container.clientWidth * dpr;
    canvas.height = container.clientHeight * dpr;
    canvas.style.width = `${container.clientWidth}px`;
    canvas.style.height = `${container.clientHeight}px`;
    ctx.scale(dpr, dpr);

    // Dark background
    ctx.fillStyle = "#0f172a";
    ctx.fillRect(0, 0, container.clientWidth, container.clientHeight);

    // Restore drawing
    ctx.putImageData(imageData, 0, 0);
    ctxRef.current = ctx;
  }, []);

  useEffect(() => {
    resize();
    const ro = new ResizeObserver(resize);
    if (containerRef.current) ro.observe(containerRef.current);
    return () => ro.disconnect();
  }, [resize]);

  function getPos(e: React.PointerEvent<HTMLCanvasElement>) {
    const canvas = canvasRef.current!;
    const rect = canvas.getBoundingClientRect();
    return { x: e.clientX - rect.left, y: e.clientY - rect.top };
  }

  function getContext(): CanvasRenderingContext2D | null {
    return ctxRef.current ?? canvasRef.current?.getContext("2d") ?? null;
  }

  function onPointerDown(e: React.PointerEvent<HTMLCanvasElement>) {
    // Support stylus pressure — scale stroke width
    const pressure = e.pressure > 0 ? e.pressure : 1;
    const ctx = getContext();
    if (!ctx) return;
    isDrawing.current = true;
    const pos = getPos(e);
    lastPoint.current = pos;
    ctx.beginPath();
    ctx.moveTo(pos.x, pos.y);

    if (tool === "eraser") {
      ctx.globalCompositeOperation = "destination-out";
      ctx.lineWidth = size * 4;
    } else {
      ctx.globalCompositeOperation = "source-over";
      ctx.strokeStyle = color;
      ctx.lineWidth = size * pressure;
    }
    ctx.lineCap = "round";
    ctx.lineJoin = "round";
    setIsEmpty(false);
    // Capture pointer so we get events even if cursor leaves canvas
    (e.target as HTMLCanvasElement).setPointerCapture(e.pointerId);
  }

  function onPointerMove(e: React.PointerEvent<HTMLCanvasElement>) {
    if (!isDrawing.current) return;
    const ctx = getContext();
    if (!ctx) return;
    const pressure = e.pressure > 0 ? e.pressure : 1;
    const pos = getPos(e);

    if (tool !== "eraser") {
      ctx.lineWidth = size * pressure;
    }

    ctx.lineTo(pos.x, pos.y);
    ctx.stroke();
    lastPoint.current = pos;
  }

  function onPointerUp() {
    if (!isDrawing.current) return;
    isDrawing.current = false;
    const ctx = getContext();
    if (ctx) {
      ctx.globalCompositeOperation = "source-over";
    }
  }

  function clearCanvas() {
    const canvas = canvasRef.current;
    const ctx = getContext();
    if (!canvas || !ctx) return;
    ctx.fillStyle = "#0f172a";
    ctx.fillRect(0, 0, canvas.width, canvas.height);
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
      toast.success("Notes converted to text");
    } catch {
      toast.error("Could not convert handwriting");
    } finally {
      setTranscribing(false);
    }
  }

  function saveAsImage() {
    const canvas = canvasRef.current;
    if (!canvas || isEmpty) return;
    const dataUrl = canvas.toDataURL("image/png");
    if (onSave) onSave(dataUrl);
    toast.success("Canvas saved");
  }

  return (
    <div className={cn("flex flex-col gap-3", className)}>
      {/* Toolbar */}
      <div className="flex flex-wrap items-center gap-2 rounded-xl border border-border/50 bg-muted/20 px-3 py-2">
        {/* Tool toggle */}
        <div className="flex gap-1 rounded-lg border border-border/50 bg-muted/30 p-0.5">
          <button
            type="button"
            onClick={() => setTool("pen")}
            title="Pen / Stylus"
            className={cn(
              "flex h-7 w-7 items-center justify-center rounded-md transition-all",
              tool === "pen" ? "bg-accent text-white" : "text-muted-foreground hover:text-foreground"
            )}
          >
            <Pen className="h-3.5 w-3.5" />
          </button>
          <button
            type="button"
            onClick={() => setTool("eraser")}
            title="Eraser"
            className={cn(
              "flex h-7 w-7 items-center justify-center rounded-md transition-all",
              tool === "eraser" ? "bg-accent text-white" : "text-muted-foreground hover:text-foreground"
            )}
          >
            <Eraser className="h-3.5 w-3.5" />
          </button>
        </div>

        {/* Color picker */}
        <div className="flex items-center gap-1">
          {COLORS.map((c) => (
            <button
              key={c.value}
              type="button"
              title={c.label}
              onClick={() => { setColor(c.value); setTool("pen"); }}
              className={cn(
                "h-5 w-5 rounded-full border-2 transition-all",
                color === c.value && tool === "pen"
                  ? "border-white scale-125 shadow-sm"
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
                size === s ? "bg-accent/20" : "hover:bg-muted/50"
              )}
            >
              <div
                className="rounded-full bg-foreground/70"
                style={{ width: Math.min(s * 2, 16), height: Math.min(s * 2, 16) }}
              />
            </button>
          ))}
        </div>

        {/* Actions */}
        <div className="ml-auto flex items-center gap-1.5">
          <button
            type="button"
            onClick={clearCanvas}
            disabled={isEmpty}
            title="Clear canvas"
            className="flex items-center gap-1 rounded-lg border border-border/50 px-2.5 py-1.5 text-xs text-muted-foreground transition-colors hover:border-danger/40 hover:text-danger disabled:opacity-40"
          >
            <Trash2 className="h-3 w-3" />
            Clear
          </button>
          <button
            type="button"
            onClick={downloadCanvas}
            disabled={isEmpty}
            title="Download as PNG"
            className="flex items-center gap-1 rounded-lg border border-border/50 px-2.5 py-1.5 text-xs text-muted-foreground transition-colors hover:border-border hover:text-foreground disabled:opacity-40"
          >
            <Download className="h-3 w-3" />
            Save
          </button>
          {courseId && (
            <button
              type="button"
              onClick={transcribeAndSave}
              disabled={isEmpty || transcribing}
              title="Convert handwriting to text using AI"
              className="flex items-center gap-1 rounded-lg border border-accent/30 bg-accent/10 px-2.5 py-1.5 text-xs font-semibold text-accent transition-colors hover:bg-accent/20 disabled:opacity-40"
            >
              {transcribing
                ? <Loader2 className="h-3 w-3 animate-spin" />
                : <Sparkles className="h-3 w-3" />
              }
              {transcribing ? "Converting…" : "Convert to text"}
            </button>
          )}
        </div>
      </div>

      {/* Canvas */}
      <div
        ref={containerRef}
        className="relative rounded-2xl overflow-hidden border border-border/50"
        style={{ height: "420px", touchAction: "none" }}
      >
        <canvas
          ref={canvasRef}
          onPointerDown={onPointerDown}
          onPointerMove={onPointerMove}
          onPointerUp={onPointerUp}
          onPointerLeave={onPointerUp}
          className="block w-full h-full cursor-crosshair"
          style={{ touchAction: "none" }}
        />
        {isEmpty && (
          <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center gap-2 text-center">
            <Pen className="h-8 w-8 text-muted-foreground/20" />
            <p className="text-sm text-muted-foreground/40">Draw with your finger, mouse, or stylus pen</p>
            <p className="text-xs text-muted-foreground/25">Supports Apple Pencil, Surface Pen, and S Pen</p>
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
              onClick={() => { navigator.clipboard.writeText(transcription); toast.success("Copied"); }}
              className="ml-auto text-xs text-muted-foreground hover:text-foreground"
            >
              Copy
            </button>
          </div>
          <p className="text-sm leading-relaxed text-foreground whitespace-pre-wrap">
            {transcription || "(No text detected — try writing more clearly)"}
          </p>
        </div>
      )}

      <p className="text-[10px] text-muted-foreground/40 text-center">
        Pressure-sensitive · works with stylus, finger, or mouse · "Convert to text" uses AI to read your handwriting
      </p>
    </div>
  );
}
