import { NextResponse } from "next/server";
import { headers } from "next/headers";

import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { callClaude, getServerApiKey } from "@/lib/ai/claude";
import { checkAndIncrementUsage } from "@/lib/ai/usage";
import { GRADING_SYSTEMS, DEFAULT_SYSTEM, getAcademicClass, type GradingSystemKey } from "@/lib/grades-constants";

type GradeInput = {
  name: string;
  code?: string | null;
  score?: number | null;
  grade: string;
  credits: number;
};

export type ImprovementTarget = { score: number; grade: string; gain: number };

export type ImprovementRow = {
  name: string;
  code: string | null;
  credits: number;
  currentScore: number;
  targets: ImprovementTarget[];
};

export async function POST(req: Request) {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const apiKey = getServerApiKey();
  if (!apiKey) {
    return NextResponse.json({ advice: "Add your ANTHROPIC_API_KEY to enable AI advice.", improvements: [] });
  }

  const usage = await checkAndIncrementUsage(session.user.id);
  if (!usage.allowed) {
    return NextResponse.json({ advice: "Daily AI limit reached. Come back tomorrow or upgrade to Pro.", improvements: [] });
  }

  const body = await req.json();
  const { systemKey, currentCWA, creditsCompleted, grades, targetCWA } = body as {
    systemKey?: GradingSystemKey;
    currentCWA: number;
    creditsCompleted: number;
    grades: GradeInput[];
    targetCWA?: number | null;
  };

  const system = (systemKey && GRADING_SYSTEMS[systemKey]) || DEFAULT_SYSTEM;
  const midpoints = system.midpoints;

  // Grade boundaries above a score, nearest-first — naturally adapts to however
  // many bands a grading system has (KNUST's 8 vs UK's 5 vs US's 10).
  function targetsAbove(score: number, credits: number): ImprovementTarget[] {
    const boundaries = system.scoreRanges
      .map((r) => r.min)
      .filter((min) => min > score)
      .sort((a, b) => a - b)
      .slice(0, 2);
    return boundaries.map((min) => ({
      score: min,
      grade: system.scoreRanges.find((r) => r.min === min)?.grade ?? "",
      gain: creditsCompleted > 0 ? +((min - score) * credits / creditsCompleted).toFixed(2) : 0,
    }));
  }

  const user = await prisma.user.findUnique({
    where: { id: session.user.id },
    select: { name: true, isPro: true },
  });

  // Pre-compute per-course CWA improvement scenarios server-side
  const improvements: ImprovementRow[] = grades
    .map((g) => {
      const cs = g.score ?? midpoints[g.grade] ?? 50;
      return {
        name: g.name,
        code: g.code ?? null,
        credits: g.credits,
        currentScore: Math.round(cs * 10) / 10,
        targets: targetsAbove(cs, g.credits),
      };
    })
    .filter((r) => r.targets.length > 0)
    .sort((a, b) => (b.targets.at(-1)?.gain ?? 0) - (a.targets.at(-1)?.gain ?? 0));

  const gradeLines = grades
    .map((g) =>
      `${g.code ? `${g.code} – ` : ""}${g.name}: ${g.score != null ? `${g.score}%` : g.grade} (${g.credits} credits)`,
    )
    .join("\n");

  const topImprovements = improvements
    .slice(0, 6)
    .map((r) => {
      const parts = r.targets.map((t) => `to ${t.score}% → +${t.gain} CWA pts`);
      return `• ${r.name} (now ${r.currentScore}%, ${r.credits}cr): ${parts.join(" | ")}`;
    })
    .join("\n");

  const topGradeMin = system.scoreRanges[0]?.min ?? 0;
  const targetLine = targetCWA
    ? `\nStudent's goal: reach ${targetCWA.toFixed(1)}% (${getAcademicClass(targetCWA, system).label})`
    : "";

  const classificationLines = system.classifications
    .map((c) => `${c.label} ≥${c.cwaMin}%`)
    .join(", ");

  const system_prompt = `You are an academic advisor for a student using the ${system.label} grading system. Classification thresholds: ${classificationLines}.

Use the EXACT pre-calculated improvement numbers provided. Do NOT recalculate — they are server-computed and correct.

Structure your response in exactly 4 short sections with **bold** headers:

**Standing**
One sentence: current classification and how many CWA points away from the next tier.

**Priority Courses**
Name the top 2–3 courses to focus on. For each: state current score, the target score(s) from the pre-calculated data, and exactly how many CWA points they gain. Higher-credit courses first.

**How to Improve**
2–3 concrete, actionable tactics for the specific weak courses above. Not generic advice — course-specific strategies.

**Reality Check**
One honest, motivating sentence about whether the goal is achievable and what it takes.

Max 240 words. Use the student's name. Write like a direct, caring advisor.`;

  try {
    const advice = await callClaude({
      apiKey,
      system: system_prompt,
      messages: [
        {
          role: "user",
          content: `Student: ${user?.name ?? "Student"}
Current CWA: ${currentCWA.toFixed(1)}% (${getAcademicClass(currentCWA, system).label})
Credits completed: ${creditsCompleted}${targetLine}

Course grades:
${gradeLines || "No courses added yet."}

CWA impact per course (server-pre-calculated — use these exact numbers):
${topImprovements || `All courses already at ${topGradeMin}%+ — excellent!`}`,
        },
      ],
      maxTokens: 650,
      isPro: user?.isPro ?? false,
    });

    return NextResponse.json({ advice, improvements });
  } catch {
    return NextResponse.json({
      advice: "Could not generate advice right now. Try again.",
      improvements: [],
    });
  }
}
