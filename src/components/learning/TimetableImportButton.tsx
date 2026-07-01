"use client";

import { useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Check, FileImage, Loader2, Sparkles, Upload } from "lucide-react";
import { cn } from "@/lib/utils";

export function TimetableImportButton() {
  const router = useRouter();
  const inputRef = useRef<HTMLInputElement>(null);
  const [processing, setProcessing] = useState(false);
  const [done, setDone] = useState(false);

  async function handleFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;

    setProcessing(true);
    setDone(false);
    toast.info("Reading your timetable…");

    const fd = new FormData();
    fd.set("file", file);
    fd.set("mode", "preview");

    try {
      // Step 1: extract blocks
      const extractRes = await fetch("/api/timetable/upload", { method: "POST", body: fd });
      const extractData = await extractRes.json();

      if (!extractRes.ok || !Array.isArray(extractData.blocks) || extractData.blocks.length === 0) {
        toast.error(extractData.error ?? "Could not read timetable. Try a clearer image or PDF.");
        return;
      }

      toast.info(`Found ${extractData.blocks.length} class blocks. Applying…`);

      // Step 2: apply immediately
      const applyFd = new FormData();
      applyFd.set("mode", "apply");
      applyFd.set("blocks", JSON.stringify(extractData.blocks));
      applyFd.set("fileName", file.name);

      const applyRes = await fetch("/api/timetable/upload", { method: "POST", body: applyFd });
      const applyData = await applyRes.json();

      if (!applyRes.ok) {
        toast.error(applyData.error ?? "Could not apply timetable");
        return;
      }

      setDone(true);
      toast.success(
        `Timetable imported! ${applyData.coursesCreated ?? 0} courses added, ${applyData.generatedEvents} events scheduled.`,
        { duration: 6000 }
      );
      router.refresh();
    } catch {
      toast.error("Import failed. Try again.");
    } finally {
      setProcessing(false);
      if (inputRef.current) inputRef.current.value = "";
    }
  }

  return (
    <div className="rounded-2xl border border-dashed border-border/60 bg-muted/10 p-6 text-center">
      <div className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-xl bg-accent/10">
        <FileImage className="h-6 w-6 text-accent" />
      </div>
      <p className="font-semibold text-foreground">Import timetable from image</p>
      <p className="mt-1 text-sm text-muted-foreground">
        Upload a photo of your printed timetable or a PDF. AI extracts your courses and class times automatically.
      </p>

      <div className="mt-4 flex flex-col items-center gap-2">
        <input
          ref={inputRef}
          type="file"
          accept=".pdf,.png,.jpg,.jpeg,.webp,application/pdf"
          className="hidden"
          onChange={handleFile}
        />
        <button
          type="button"
          onClick={() => inputRef.current?.click()}
          disabled={processing}
          className={cn(
            "flex items-center gap-2 rounded-xl px-5 py-2.5 text-sm font-semibold transition-all",
            done
              ? "bg-success/15 text-success"
              : "bg-accent text-white hover:opacity-90 disabled:opacity-60"
          )}
        >
          {processing ? (
            <><Loader2 className="h-4 w-4 animate-spin" /> Reading timetable…</>
          ) : done ? (
            <><Check className="h-4 w-4" /> Imported successfully</>
          ) : (
            <><Upload className="h-4 w-4" /> Upload timetable image / PDF</>
          )}
        </button>

        <div className="flex items-center gap-1.5 rounded-lg border border-accent/15 bg-accent/5 px-3 py-2">
          <Sparkles className="h-3.5 w-3.5 text-accent" />
          <p className="text-xs text-muted-foreground">
            Requires <span className="font-medium text-foreground">OPENAI_API_KEY</span> in your environment for AI extraction.
            Works best with KNUST-style timetable PDFs.
          </p>
        </div>

        <a
          href="/dashboard#timetable"
          className="text-xs text-accent hover:underline"
        >
          Or use the full timetable editor →
        </a>
      </div>
    </div>
  );
}
