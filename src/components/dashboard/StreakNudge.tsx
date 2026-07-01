"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Flame, X, Zap } from "lucide-react";
import Link from "next/link";
import { cn } from "@/lib/utils";

type StreakData = {
  current: number;
  studiedToday: boolean;
  dueCards: number;
  nearestExamDays: number | null;
  nearestExamTitle: string | null;
};

export function StreakNudge() {
  const router = useRouter();
  const [data, setData] = useState<StreakData | null>(null);
  const [dismissed, setDismissed] = useState(false);

  useEffect(() => {
    const key = `streak-nudge-dismissed-${new Date().toISOString().slice(0, 10)}`;
    if (localStorage.getItem(key)) { setDismissed(true); return; }

    fetch("/api/study/streak-status")
      .then(r => r.json())
      .then(d => setData(d))
      .catch(() => null);
  }, []);

  function dismiss() {
    const key = `streak-nudge-dismissed-${new Date().toISOString().slice(0, 10)}`;
    localStorage.setItem(key, "1");
    setDismissed(true);
  }

  if (dismissed || !data) return null;
  if (data.studiedToday && data.dueCards === 0 && data.nearestExamDays === null) return null;
  if (data.current === 0 && data.dueCards === 0 && !data.nearestExamDays) return null;

  const isUrgent = data.nearestExamDays !== null && data.nearestExamDays <= 2;
  const isExam = data.nearestExamDays !== null && data.nearestExamDays <= 7;

  let message = "";
  let sub = "";

  if (isUrgent) {
    message = `⚡ ${data.nearestExamTitle} in ${data.nearestExamDays === 0 ? "TODAY" : `${data.nearestExamDays} day${data.nearestExamDays === 1 ? "" : "s"}`}`;
    sub = "Use Exam Prep Quiz and review your flashcards now.";
  } else if (!data.studiedToday && data.current > 0) {
    message = `${data.current} day streak — don't break it`;
    sub = data.dueCards > 0
      ? `${data.dueCards} flashcard${data.dueCards !== 1 ? "s" : ""} due. Quick 5-minute review keeps the streak alive.`
      : "Even a 5-minute session counts. Open Learning to keep going.";
  } else if (data.dueCards > 0) {
    message = `${data.dueCards} flashcard${data.dueCards !== 1 ? "s" : ""} due for review`;
    sub = isExam
      ? `${data.nearestExamTitle} in ${data.nearestExamDays} days. Keep reviewing.`
      : "Spaced repetition works best when you review on schedule.";
  } else {
    return null;
  }

  return (
    <div className={cn(
      "flex items-start justify-between gap-3 rounded-xl border px-4 py-3",
      isUrgent ? "border-rose-500/30 bg-rose-500/5" :
      isExam ? "border-amber-500/30 bg-amber-500/5" :
      "border-orange-500/20 bg-orange-500/5"
    )}>
      <div className="flex items-start gap-3">
        {isUrgent
          ? <Zap className="mt-0.5 h-4 w-4 shrink-0 text-rose-400" />
          : <Flame className="mt-0.5 h-4 w-4 shrink-0 text-orange-400" />
        }
        <div>
          <p className={cn("text-sm font-semibold",
            isUrgent ? "text-rose-400" : isExam ? "text-amber-400" : "text-orange-400"
          )}>
            {message}
          </p>
          <p className="mt-0.5 text-xs text-muted-foreground">{sub}</p>
        </div>
      </div>
      <div className="flex shrink-0 items-center gap-2">
        <Link
          href="/learning"
          className={cn(
            "rounded-lg px-2.5 py-1.5 text-xs font-semibold text-white transition-opacity hover:opacity-90",
            isUrgent ? "bg-rose-500" : isExam ? "bg-amber-500" : "bg-orange-500"
          )}
        >
          Study now
        </Link>
        <button
          type="button"
          onClick={dismiss}
          className="rounded-lg p-1 text-muted-foreground/40 hover:text-muted-foreground"
        >
          <X className="h-3.5 w-3.5" />
        </button>
      </div>
    </div>
  );
}
