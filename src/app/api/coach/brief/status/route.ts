import { NextResponse } from "next/server";
import { headers } from "next/headers";

import { auth } from "@/lib/auth";
import { markAutoBriefToday, wasAutoBriefToday } from "@/lib/ai/coach-state";

export async function GET() {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const status = await wasAutoBriefToday(session.user.id);
  return NextResponse.json(status);
}

export async function POST() {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const status = await markAutoBriefToday(session.user.id);
  return NextResponse.json(status);
}
