import { NextResponse } from "next/server";
import { headers } from "next/headers";

import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { callClaude, getServerApiKey } from "@/lib/ai/claude";
import { checkAndIncrementUsage } from "@/lib/ai/usage";

type GradeInput = {
  name: string;
  code?: string | null;
  score?: number | null;
  grade: string;
  credits: number;
};

export type ImprovementRow = {
  name: string;
  code: string | null;
  credits: number;
  currentScore: number;
  target65: number;
  target70: number;
};

const MIDPOINTS: Record<string, number> = {
  A: 75, "B+": 67, B: 62, "C+": 57, C: 52, "D+": 47, D: 42, F: 20,
};

function cwaClass(cwa: number): string {
  if (cwa >= 70) return "First Class";
  if (cwa >= 60) return "Second Class Upper";
  if (cwa >= 50) return "Second Class Lower";
  if (cwa >= 45) return "Third Class";
  if (cwa >= 40) return "Pass";
  return "Fail";
}

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
  const { currentCWA, creditsCompleted, grades, targetCWA } = body as {
    currentCWA: number;
    creditsCompleted: number;
    grades: GradeInput[];
    targetCWA?: number | null;
  };

  const user = await prisma.user.findUnique({
    where: { id: session.user.id },
    select: { name: true, isPro: true },
  });

  // Pre-compute per-course CWA improvement scenarios server-side
  const improvements: ImprovementRow[] = grades
    .filter((g) => (g.score ?? MIDPOINTS[g.grade] ?? 50) < 70)
    .map((g) => {
      const cs = g.score ?? MIDPOINTS[g.grade] ?? 50;
      const cwaDelta = (toScore: number) =>
        creditsCompleted > 0
          ? +((toScore - cs) * g.credits / creditsCompleted).toFixed(2)
          : 0;
      return {
        name: g.name,
        code: g.code ?? null,
        credits: g.credits,
        currentScore: Math.round(cs * 10) / 10,
        target65: cs < 65 ? cwaDelta(65) : 0,
        target70: cs < 70 ? cwaDelta(70) : 0,
      };
    })
    .filter((r) => r.target70 > 0 || r.target65 > 0)
    .sort((a, b) => b.target70 - a.target70);

  const gradeLines = grades
    .map((g) =>
      `${g.code ? `${g.code} – ` : ""}${g.name}: ${g.score != null ? `${g.score}%` : g.grade} (${g.credits} credits)`,
    )
    .join("\n");

  const topImprovements = improvements
    .slice(0, 6)
    .map((r) => {
      const parts: string[] = [];
      if (r.target65 > 0) parts.push(`to 65% → +${r.target65} CWA pts`);
      if (r.target70 > 0) parts.push(`to 70% → +${r.target70} CWA pts`);
      return `• ${r.name} (now ${r.currentScore}%, ${r.credits}cr): ${parts.join(" | ")}`;
    })
    .join("\n");

  const targetLine = targetCWA
    ? `\nStudent's goal: reach ${targetCWA.toFixed(1)}% (${cwaClass(targetCWA)})`
    : "";

  const system = `You are a KNUST academic advisor. CWA thresholds: First Class ≥70%, Second Class Upper ≥60%, Second Class Lower ≥50%, Third Class ≥45%, Pass ≥40%.

Use the EXACT pre-calculated improvement numbers provided. Do NOT recalculate — they are server-computed and correct.

Structure your response in exactly 4 short sections with **bold** headers:

**Standing**
One sentence: current classification and how many CWA points away from the next tier.

**Priority Courses**
Name the top 2–3 courses to focus on. For each: state current score, target score (65% or 70%), and exactly how many CWA points they gain (use the pre-calculated data). Higher-credit courses first.

**How to Improve**
2–3 concrete, actionable tactics for the specific weak courses above. Not generic advice — course-specific strategies.

**Reality Check**
One honest, motivating sentence about whether the goal is achievable and what it takes.

Max 240 words. Use the student's name. Write like a direct, caring advisor.`;

  try {
    const advice = await callClaude({
      apiKey,
      system,
      messages: [
        {
          role: "user",
          content: `Student: ${user?.name ?? "Student"}
Current CWA: ${currentCWA.toFixed(1)}% (${cwaClass(currentCWA)})
Credits completed: ${creditsCompleted}${targetLine}

Course grades:
${gradeLines || "No courses added yet."}

CWA impact per course (server-pre-calculated — use these exact numbers):
${topImprovements || "All courses already at 70%+ — excellent!"}`,
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
