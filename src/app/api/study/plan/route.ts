import { headers } from "next/headers";
import { NextResponse } from "next/server";

import { auth } from "@/lib/auth";
import { generateStudyPlan } from "@/lib/study/planner";

export async function POST() {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const result = await generateStudyPlan(session.user.id);
  return NextResponse.json({ ok: true, ...result });
}
