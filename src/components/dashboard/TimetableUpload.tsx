"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { Calendar, FileUp, Loader2, Upload } from "lucide-react";

import { dashboardCardClass } from "@/components/dashboard/dashboard-styles";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

const STORAGE_KEY = "life-os-timetable-schedule";

type ScheduleBlock = {
  time: string;
  label: string;
  source: "Timetable" | "AI";
};

export function TimetableUpload() {
  const inputRef = useRef<HTMLInputElement>(null);
  const [processing, setProcessing] = useState(false);
  const [fileName, setFileName] = useState<string | null>(null);
  const [schedule, setSchedule] = useState<ScheduleBlock[] | null>(null);

  const generateSchedule = useCallback((name: string) => {
    setProcessing(true);
    setFileName(name);
    setTimeout(() => {
      const generated: ScheduleBlock[] = [
        { time: "07:00", label: "Devotion and AI daily planning", source: "AI" },
        { time: "08:00", label: "Software Engineering lecture", source: "Timetable" },
        { time: "10:00", label: "Data Structures lab", source: "Timetable" },
        { time: "12:00", label: "Lunch and review today's focus", source: "AI" },
        { time: "14:00", label: "Client deliverables for LPG Travels", source: "AI" },
        { time: "16:00", label: "System Design study", source: "AI" },
        { time: "18:00", label: "Content recording block", source: "AI" },
      ];
      setSchedule(generated);
      setProcessing(false);
      localStorage.setItem(
        STORAGE_KEY,
        JSON.stringify({ fileName: name, schedule: generated })
      );
    }, 2500);
  }, []);

  useEffect(() => {
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      if (stored) {
        const parsed = JSON.parse(stored) as {
          fileName: string;
          schedule: ScheduleBlock[];
        };
        setFileName(parsed.fileName);
        setSchedule(parsed.schedule);
      }
    } catch {
      localStorage.removeItem(STORAGE_KEY);
    }
  }, []);

  function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (file) generateSchedule(file.name);
  }

  function handleReset() {
    setSchedule(null);
    setFileName(null);
    localStorage.removeItem(STORAGE_KEY);
    if (inputRef.current) inputRef.current.value = "";
  }

  return (
    <Card id="timetable" className={dashboardCardClass(true)}>
      <CardHeader>
        <div className="flex items-center justify-between gap-3">
          <CardTitle className="flex items-center gap-2 text-base">
            <Calendar className="h-4 w-4 text-accent" />
            Timetable Intelligence
          </CardTitle>
          <span className="rounded-md bg-accent/15 px-2 py-0.5 text-[10px] font-semibold text-accent">
            AI
          </span>
        </div>
      </CardHeader>
      <CardContent>
        {!schedule && !processing && (
          <>
            <p className="mb-4 text-sm leading-relaxed text-muted-foreground">
              Upload your school or work timetable. AI builds your personal
              schedule and fills gaps with goals and client work.
            </p>
            <input
              ref={inputRef}
              type="file"
              accept=".pdf,.png,.jpg,.jpeg,.webp"
              className="hidden"
              onChange={handleFileChange}
            />
            <button
              type="button"
              onClick={() => inputRef.current?.click()}
              className="flex w-full flex-col items-center rounded-xl border border-dashed border-border bg-background/40 px-4 py-8 transition-colors hover:border-accent/40 hover:bg-accent/5"
            >
              <Upload className="h-6 w-6 text-accent" />
              <span className="mt-3 text-sm font-medium">Upload timetable</span>
              <span className="mt-1 text-xs text-muted-foreground">
                PDF or image
              </span>
            </button>
          </>
        )}

        {processing && (
          <div className="flex flex-col items-center py-10">
            <Loader2 className="h-7 w-7 animate-spin text-accent" />
            <p className="mt-4 text-sm font-medium">Reading {fileName}...</p>
            <p className="mt-1 text-xs text-muted-foreground">
              Generating your personal timetable
            </p>
          </div>
        )}

        {schedule && !processing && (
          <div>
            <div className="mb-4 flex items-center gap-2 rounded-lg bg-success/10 px-3 py-2 text-xs text-success">
              <FileUp className="h-3.5 w-3.5" />
              Generated from {fileName}
            </div>
            <div className="max-h-52 space-y-2 overflow-y-auto">
              {schedule.map((block) => (
                <div
                  key={`${block.time}-${block.label}`}
                  className="flex items-center gap-3 rounded-lg border border-border/60 px-3 py-2.5 text-sm"
                >
                  <span className="w-12 shrink-0 text-xs text-muted-foreground">
                    {block.time}
                  </span>
                  <span className="min-w-0 flex-1 truncate">{block.label}</span>
                  <span
                    className={`shrink-0 rounded px-1.5 py-0.5 text-[10px] font-medium ${
                      block.source === "Timetable"
                        ? "bg-white/10 text-slate-300"
                        : "bg-accent/15 text-accent"
                    }`}
                  >
                    {block.source}
                  </span>
                </div>
              ))}
            </div>
            <Button
              variant="ghost"
              size="sm"
              className="mt-4 text-muted-foreground"
              onClick={handleReset}
            >
              Upload new timetable
            </Button>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
