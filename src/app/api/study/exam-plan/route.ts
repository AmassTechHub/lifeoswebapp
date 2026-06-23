import { headers } from "next/headers";
import { NextResponse } from "next/server";

import { auth } from "@/lib/auth";
import { generateExamPlan } from "@/lib/study/exam-plan";

export async function POST() {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const result = await generateExamPlan(session.user.id);
  return NextResponse.json({ ok: true, ...result });
}
