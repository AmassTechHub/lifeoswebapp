import { NextResponse } from "next/server";
import { headers } from "next/headers";

import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { callClaude, getServerApiKey } from "@/lib/ai/claude";
import { checkAndIncrementUsage } from "@/lib/ai/usage";

export async function POST(req: Request) {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const apiKey = getServerApiKey();
  if (!apiKey) {
    return NextResponse.json({ advice: "Add your ANTHROPIC_API_KEY to enable AI advice." });
  }

  const usage = await checkAndIncrementUsage(session.user.id);
  if (!usage.allowed) {
    return NextResponse.json({ advice: "Daily AI limit reached. Come back tomorrow or upgrade to Pro." });
  }

  const body = await req.json();
  const { currentCWA, creditsCompleted, grades } = body as {
    currentCWA: number;
    creditsCompleted: number;
    grades: { name: string; code?: string; score?: number | null; grade: string; credits: number }[];
  };

  const user = await prisma.user.findUnique({
    where: { id: session.user.id },
    select: { name: true, isPro: true },
  });

  const gradeLines = grades
    .map((g) => `${g.code ? `${g.code} – ` : ""}${g.name}: ${g.score != null ? `${g.score}%` : g.grade} (${g.credits} credits)`)
    .join("\n");

  const system = `You are an academic advisor for KNUST (Kwame Nkrumah University of Science and Technology) students.
KNUST classification thresholds (CWA):
- First Class: 70 and above
- Second Class Upper: 60–69
- Second Class Lower: 50–59
- Third Class: 45–49
- Pass: 40–44

Analyze the student's academic performance and give:
1. Current standing assessment (1 sentence)
2. What they need to reach the NEXT class up (calculate required average for remaining courses if below a threshold)
3. 3–4 specific, actionable study strategies tailored to their weak courses
4. One motivational, honest closing statement

Keep it under 250 words. Use their name. Be direct, warm, and realistic.`;

  try {
    const advice = await callClaude({
      apiKey,
      system,
      messages: [{
        role: "user",
        content: `Student: ${user?.name ?? "Student"}
Current CWA: ${currentCWA.toFixed(1)}%
Total credits completed: ${creditsCompleted}

Course grades:
${gradeLines || "No courses added yet."}`,
      }],
      maxTokens: 500,
      isPro: user?.isPro ?? false,
    });
    return NextResponse.json({ advice });
  } catch {
    return NextResponse.json({ advice: "Could not generate advice right now. Try again." });
  }
}
