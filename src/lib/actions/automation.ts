"use server";

import { revalidatePath } from "next/cache";

import { requireUserId } from "@/lib/actions/auth";
import { generateDayPlan } from "@/lib/automation/generate-day";

export async function runDailySetup() {
  const userId = await requireUserId();
  const result = await generateDayPlan(userId);

  revalidatePath("/dashboard");
  revalidatePath("/planner");
  revalidatePath("/calendar");

  return { ok: true, ...result };
}
