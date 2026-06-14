import { NextResponse } from "next/server";
import { headers } from "next/headers";

import { auth } from "@/lib/auth";
import { getUserContextSummary } from "@/lib/ai/user-context";
import { buildAutomationPulse } from "@/lib/automation/rules-engine";

export async function GET() {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const context = await getUserContextSummary(session.user.id);
  const pulse = buildAutomationPulse(context);

  return NextResponse.json({
    ...pulse,
    contextMeta: {
      dueToday: context.tasks.dueToday.length,
      scheduleBlocks: context.schedule.blocksToday.length,
      overdue: context.tasks.overdueCount,
    },
  });
}
