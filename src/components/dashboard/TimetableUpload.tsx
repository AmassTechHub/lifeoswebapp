"use client";

import { useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { toast } from "sonner";
import { Calendar, Check, FileUp, Loader2, Sparkles, Upload, Users } from "lucide-react";

import { TimetableBlockEditor } from "@/components/dashboard/TimetableBlockEditor";
import { TimetableWeekPreview } from "@/components/dashboard/TimetableWeekPreview";
import { dashboardCardClass } from "@/components/dashboard/dashboard-styles";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import type { TimetableBlock } from "@/lib/timetable/types";

export function TimetableUpload() {
  const inputRef = useRef<HTMLInputElement>(null);
  const router = useRouter();
  const [processing, setProcessing] = useState(false);
  const [previewing, setPreviewing] = useState(false);
  const [applied, setApplied] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [fileName, setFileName] = useState<string | null>(null);
  const [blocks, setBlocks] = useState<TimetableBlock[]>([]);
  const [extractionSource, setExtractionSource] = useState<string | null>(null);
  const [group, setGroup] = useState<number | null>(1);

  useEffect(() => {
    let cancelled = false;
    async function loadExisting() {
      try {
        const res = await fetch("/api/timetable/template");
        const data = await res.json();
        if (cancelled || !data.hasTimetable) return;
        setBlocks(data.blocks ?? []);
        setPreviewing(true);
        setApplied(true);
        setMessage("Timetable active. Edit and re-apply if needed.");
      } catch {
        // no-op
      }
    }
    loadExisting();
    return () => { cancelled = true; };
  }, []);

  async function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;

    setProcessing(true);
    setMessage(null);
    setError(null);
    setApplied(false);
    setFileName(file.name);
    setBlocks([]);

    const fd = new FormData();
    fd.set("file", file);
    fd.set("mode", "preview");

    try {
      const res = await fetch("/api/timetable/upload", { method: "POST", body: fd });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error ?? "Upload failed");
        toast.error(data.error ?? "Upload failed");
      } else {
        const parsed = Array.isArray(data.blocks) ? (data.blocks as TimetableBlock[]) : [];
        setBlocks(parsed);
        setExtractionSource(data.extractionSource ?? null);
        setPreviewing(true);
        if (data.aiUsed) {
          const groupBlocks = parsed.filter((b) => b.group === group || b.group == null);
          setMessage(`AI extracted ${parsed.length} blocks (${groupBlocks.length} for Group ${group ?? "all"}). Review below, then apply.`);
          toast.success(`Extracted ${parsed.length} course blocks`);
        } else {
          setMessage("No AI key set. Showing starter blocks. Edit them, then apply.");
        }
      }
    } catch {
      setError("Upload failed. Try again.");
      toast.error("Upload failed");
    } finally {
      setProcessing(false);
      if (inputRef.current) inputRef.current.value = "";
    }
  }

  async function applyTimetable() {
    const validBlocks = blocks.filter((b) => b.title.trim().length > 0);
    if (validBlocks.length === 0) {
      setError("Add at least one course with a name.");
      return;
    }

    setProcessing(true);
    setError(null);
    setMessage(null);
    try {
      const fd = new FormData();
      fd.set("mode", "apply");
      fd.set("blocks", JSON.stringify(validBlocks));
      if (group) fd.set("group", String(group));
      if (fileName) fd.set("fileName", fileName);

      const res = await fetch("/api/timetable/upload", { method: "POST", body: fd });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error ?? "Apply failed");
        toast.error("Apply failed");
      } else {
        const courseList = Array.isArray(data.courseNames) ? data.courseNames : [];
        setMessage(
          `Timetable applied: ${data.coursesCreated ?? 0} courses in Study Hub, ${data.generatedEvents} class events for 14 days.`
        );
        setApplied(true);
        setPreviewing(true);
        toast.success(`Timetable live! ${data.coursesCreated ?? 0} courses added to Study Hub.`);
        if (courseList.length > 0) {
          console.info("Courses created:", courseList);
        }
        router.refresh();
      }
    } catch {
      setError("Could not apply timetable. Try again.");
      toast.error("Apply failed");
    } finally {
      setProcessing(false);
    }
  }

  // Count blocks filtered for the selected group
  const filteredCount = blocks.filter((b) => group == null || b.group === group || b.group == null).length;

  return (
    <Card id="timetable" className={dashboardCardClass(true)}>
      <CardHeader>
        <div className="flex items-center justify-between gap-3">
          <CardTitle className="flex items-center gap-2 text-base">
            <Calendar className="h-4 w-4 text-accent" />
            Timetable Intelligence
          </CardTitle>
          <div className="flex items-center gap-2">
            {applied && (
              <span className="flex items-center gap-1 rounded-md bg-success/15 px-2 py-0.5 text-[10px] font-semibold text-success">
                <Check className="h-3 w-3" />
                Active
              </span>
            )}
            <span className="rounded-md bg-accent/15 px-2 py-0.5 text-[10px] font-semibold text-accent">
              AUTO
            </span>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        <p className="mb-4 text-sm leading-relaxed text-muted-foreground">
          Upload your timetable image or PDF. Life OS extracts your classes, lets you pick your group, and builds your personal schedule.
        </p>

        {/* Group selector */}
        <div className="mb-4">
          <p className="mb-2 flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
            <Users className="h-3.5 w-3.5" /> Your group
          </p>
          <div className="flex gap-2">
            {[null, 1, 2].map((g) => (
              <button
                key={String(g)}
                type="button"
                onClick={() => setGroup(g)}
                className={`rounded-lg border px-3 py-1.5 text-sm font-medium transition-all ${
                  group === g
                    ? "border-accent bg-accent/10 text-accent"
                    : "border-border/60 text-muted-foreground hover:border-accent/40 hover:text-foreground"
                }`}
              >
                {g == null ? "All groups" : `Group ${g}`}
              </button>
            ))}
          </div>
        </div>

        {extractionSource && blocks.length > 0 && (
          <p className="mb-2 text-xs text-muted-foreground">
            Source: {extractionSource} · {filteredCount} blocks for {group ? `Group ${group}` : "all groups"}
          </p>
        )}

        {message && (
          <div className="mb-4 flex items-start gap-2 rounded-lg bg-success/10 px-3 py-2 text-xs text-success">
            <FileUp className="mt-0.5 h-3.5 w-3.5 shrink-0" />
            {message}
          </div>
        )}
        {error && (
          <p className="mb-4 rounded-lg bg-danger/10 px-3 py-2 text-xs text-danger">{error}</p>
        )}

        {processing ? (
          <div className="flex flex-col items-center py-10">
            <Loader2 className="h-7 w-7 animate-spin text-accent" />
            <p className="mt-4 text-sm font-medium">Processing timetable...</p>
            <p className="mt-1 text-xs text-muted-foreground">
              Extracting courses · building schedule · syncing Study Hub
            </p>
          </div>
        ) : (
          <>
            <input
              ref={inputRef}
              type="file"
              accept=".pdf,.png,.jpg,.jpeg,.webp,application/pdf"
              className="hidden"
              onChange={handleFileChange}
            />
            <button
              type="button"
              onClick={() => inputRef.current?.click()}
              className="flex w-full flex-col items-center rounded-xl border border-dashed border-border bg-background/40 px-4 py-8 transition-colors hover:border-accent/40 hover:bg-accent/5"
            >
              <Upload className="h-6 w-6 text-accent" />
              <span className="mt-3 text-sm font-medium">
                {applied ? "Re-upload to update timetable" : "Upload timetable image or PDF"}
              </span>
              <span className="mt-1 text-xs text-muted-foreground">PNG, JPG, PDF up to 8MB</span>
            </button>

            {/* Quick setup for KNUST */}
            {!applied && (
              <button
                type="button"
                onClick={async () => {
                  setProcessing(true);
                  try {
                    const res = await fetch("/api/setup/courses", {
                      method: "POST",
                      headers: { "Content-Type": "application/json" },
                      body: JSON.stringify({ courses: await fetch("/api/setup/courses").then(r => r.json()).then(d => d.preset.courses), group: 1 }),
                    });
                    const data = await res.json();
                    if (res.ok) {
                      setApplied(true);
                      setMessage(`Quick setup complete: ${data.coursesCreated} KNUST CS3 courses added, ${data.generatedEvents} class events scheduled.`);
                      toast.success("KNUST CS3 timetable applied!");
                      router.refresh();
                    }
                  } catch {
                    toast.error("Quick setup failed");
                  } finally {
                    setProcessing(false);
                  }
                }}
                className="mt-2 flex w-full items-center justify-center gap-2 rounded-xl border border-accent/30 bg-accent/5 px-4 py-3 text-sm font-medium text-accent transition-colors hover:bg-accent/10"
              >
                <Sparkles className="h-4 w-4" />
                KNUST CS3 Quick Setup
              </button>
            )}

            {previewing && blocks.length > 0 && (
              <div className="mt-4 space-y-4 rounded-xl border border-border/70 bg-background/60 p-4">
                <div>
                  <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                    Week preview {group ? `(Group ${group})` : ""}
                  </p>
                  <TimetableWeekPreview
                    blocks={group ? blocks.filter((b) => b.group === group || b.group == null) : blocks}
                  />
                </div>
                <div>
                  <p className="mb-3 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                    Edit blocks
                  </p>
                  <TimetableBlockEditor blocks={blocks} onChange={setBlocks} />
                </div>
                <div className="flex flex-wrap gap-2">
                  <Button size="sm" onClick={applyTimetable}>
                    Apply timetable
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => { setPreviewing(false); setBlocks([]); setApplied(false); }}
                  >
                    Clear
                  </Button>
                </div>
              </div>
            )}

            <Button variant="ghost" size="sm" className="mt-3 w-full" asChild>
              <a href="/calendar">View calendar</a>
            </Button>
          </>
        )}
      </CardContent>
    </Card>
  );
}
