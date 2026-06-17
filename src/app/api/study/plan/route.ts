import { headers } from "next/headers";
import { NextResponse } from "next/server";

import { auth } from "@/lib/auth";
import { generateStudyPlan, scheduleTasksInFreeTime } from "@/lib/study/planner";

export async function POST() {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const studyResult = await generateStudyPlan(session.user.id);
  const taskResult = await scheduleTasksInFreeTime(session.user.id);
  return NextResponse.json({ ok: true, ...studyResult, ...taskResult });
}
