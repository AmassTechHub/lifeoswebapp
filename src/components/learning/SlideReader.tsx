"use client";

import { useState } from "react";
import { Download, ExternalLink, FileImage, FileText, Maximize2 } from "lucide-react";
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
  return (
    m.mimeType?.startsWith("image/") ||
    /\.(png|jpg|jpeg|webp|gif|svg)$/i.test(m.fileName)
  );
}

function FileIcon({ m }: { m: Material }) {
  if (isPDF(m)) return <FileText className="h-4 w-4 shrink-0 text-red-400" />;
  if (isImage(m)) return <FileImage className="h-4 w-4 shrink-0 text-blue-400" />;
  return <FileText className="h-4 w-4 shrink-0 text-muted-foreground" />;
}

export function SlideReader({ materials }: { materials: Material[] }) {
  const [selected, setSelected] = useState<Material | null>(materials[0] ?? null);
  const [fullscreen, setFullscreen] = useState(false);

  if (materials.length === 0) {
    return (
      <div className="rounded-2xl border border-dashed border-border bg-muted/20 px-6 py-14 text-center">
        <FileText className="mx-auto h-10 w-10 text-muted-foreground/30" />
        <p className="mt-3 text-sm font-medium text-muted-foreground">No slides uploaded yet</p>
        <p className="mt-1 text-xs text-muted-foreground/60">
          Upload PDF slides or images in the Materials tab — they appear here for reading.
        </p>
      </div>
    );
  }

  return (
    <div className="grid gap-4 lg:grid-cols-[220px_1fr]">
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
      {selected ? (
        <div
          className={cn(
            "flex flex-col overflow-hidden rounded-2xl border border-border/70 bg-card/80",
            fullscreen && "fixed inset-4 z-50 shadow-2xl"
          )}
        >
          {/* Toolbar */}
          <div className="flex shrink-0 items-center justify-between gap-2 border-b border-border/60 px-4 py-2.5">
            <p className="truncate text-sm font-medium text-foreground">
              {selected.title || selected.fileName}
            </p>
            <div className="flex shrink-0 items-center gap-1.5">
              <button
                onClick={() => setFullscreen((v) => !v)}
                className="rounded-lg border border-border/60 p-1.5 text-muted-foreground hover:border-accent/30 hover:text-foreground"
                title={fullscreen ? "Exit full screen" : "Full screen"}
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

          {/* Content area */}
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
              <p className="text-sm text-muted-foreground">
                Preview not available for this file type.
              </p>
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
      ) : null}

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
