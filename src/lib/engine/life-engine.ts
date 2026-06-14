import { getUserContextSummary } from "@/lib/ai/user-context";
import { buildActionQueue } from "@/lib/ai/action-queue";
import { buildAutomationPulse } from "@/lib/automation/rules-engine";
import { startOfDay } from "@/lib/date-utils";
import {
  getLatestCycles,
  runEveningCycle,
  runMorningCycle,
  runWeeklyCycle,
} from "@/lib/engine/life-cycles";
import { prisma } from "@/lib/prisma";

export type LifeEngineMode = "morning" | "evening" | "weekly" | "full";

export type LifeEngineResult = {
  ranAt: string;
  mode: LifeEngineMode;
  dailyScore: number;
  focusCount: number;
  scheduleBlocks: number;
  nextAction: string | null;
  pulseStatus: "ok" | "warning" | "critical";
  message: string;
  cycles: string[];
};

async function snapshotScore(userId: string) {
  const today = startOfDay(new Date());
  const snap = await prisma.daySnapshot.findUnique({
    where: { userId_date: { userId, date: today } },
  });
  return snap?.score ?? 0;
}

export async function runLifeEngine(userId: string, mode: LifeEngineMode = "full"): Promise<LifeEngineResult> {
  const cycles: string[] = [];
  let morningSummary = "";

  if (mode === "morning" || mode === "full") {
    const m = await runMorningCycle(userId);
    cycles.push(m.summary);
    morningSummary = m.summary;
  }

  if (mode === "evening" || mode === "full") {
    const e = await runEveningCycle(userId);
    cycles.push(e.summary);
  }

  if (mode === "weekly" || mode === "full") {
    const w = await runWeeklyCycle(userId);
    cycles.push(w.summary);
  }

  const context = await getUserContextSummary(userId);
  const pulse = buildAutomationPulse(context);
  const queue = buildActionQueue(context);
  const top = queue[0];
  const score = await snapshotScore(userId);

  const snap = await prisma.daySnapshot.findUnique({
    where: { userId_date: { userId, date: startOfDay(new Date()) } },
  });
  let focusCount = 0;
  if (snap?.focusJson) {
    try {
      focusCount = (JSON.parse(snap.focusJson) as unknown[]).length;
    } catch {
      focusCount = 0;
    }
  }

  const message =
    cycles[0] ??
    `Life OS ${mode} cycle complete. ${focusCount} focus items, score ${score}.`;

  return {
    ranAt: new Date().toISOString(),
    mode,
    dailyScore: score,
    focusCount,
    scheduleBlocks: context.schedule.blocksToday.length,
    nextAction: top?.title ?? null,
    pulseStatus: pulse.status,
    message: morningSummary || message,
    cycles,
  };
}

export async function runLifeEngineIfNeeded(userId: string): Promise<LifeEngineResult | null> {
  const today = startOfDay(new Date());
  const [morningLog, dayPlan] = await Promise.all([
    prisma.lifeCycleLog.findUnique({
      where: { userId_type_date: { userId, type: "MORNING", date: today } },
    }),
    prisma.daySnapshot.findUnique({
      where: { userId_date: { userId, date: today } },
    }),
  ]);

  if (morningLog && dayPlan) return null;

  return runLifeEngine(userId, "morning");
}

export { getLatestCycles };
