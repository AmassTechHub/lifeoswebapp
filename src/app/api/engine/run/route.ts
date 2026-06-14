import { NextResponse } from "next/server";
import { headers } from "next/headers";

import { auth } from "@/lib/auth";
import { runLifeEngine, type LifeEngineMode } from "@/lib/engine/life-engine";

export async function POST(request: Request) {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await request.json().catch(() => ({}));
  const mode = String(body.mode ?? "full") as LifeEngineMode;
  const allowed: LifeEngineMode[] = ["morning", "evening", "weekly", "full"];
  const safeMode = allowed.includes(mode) ? mode : "full";

  const result = await runLifeEngine(session.user.id, safeMode);
  return NextResponse.json(result);
}
