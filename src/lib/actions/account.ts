"use server";

import { revalidatePath } from "next/cache";

import { requireUserId } from "@/lib/actions/auth";
import { prisma } from "@/lib/prisma";

export type LifePreferencesInput = {
  useCases?: string[];
  primaryGoal?: string | null;
  workSchedule?: { days: string[]; startTime: string; endTime: string } | null;
};

/**
 * Updates the life-planning preferences a user first set during onboarding
 * (what they use Life OS for, their primary goal, and their work schedule) so
 * they can change them later from Settings.
 */
export async function updateLifePreferences(input: LifePreferencesInput) {
  const userId = await requireUserId();

  const useCase = Array.isArray(input.useCases)
    ? JSON.stringify(input.useCases.filter((u) => typeof u === "string"))
    : undefined;

  const primaryGoal =
    input.primaryGoal === undefined
      ? undefined
      : input.primaryGoal?.trim()
        ? input.primaryGoal.trim().slice(0, 120)
        : null;

  const workSchedule =
    input.workSchedule === undefined
      ? undefined
      : input.workSchedule
        ? JSON.stringify(input.workSchedule)
        : null;

  await prisma.user.update({
    where: { id: userId },
    data: {
      ...(useCase !== undefined ? { useCase } : {}),
      ...(primaryGoal !== undefined ? { primaryGoal } : {}),
      ...(workSchedule !== undefined ? { workSchedule } : {}),
    },
  });

  revalidatePath("/settings");
  revalidatePath("/dashboard");
  return { ok: true };
}

/**
 * Wipes all of the signed-in user's productivity, study, and life data and
 * resets their onboarding so they go through setup again — a clean "start over"
 * without deleting the account itself.
 *
 * Intentionally KEEPS: the account, sign-in credentials, saved API key, MoMo
 * credentials, push subscriptions, and financial transaction records (MoMo /
 * Paystack) since those are billing/audit records tied to real money.
 *
 * All child rows (habit logs, client deliverables, study notes/materials/
 * schedules, custom-database rows) are removed automatically via the
 * `onDelete: Cascade` relations in schema.prisma.
 */
export async function clearMyData() {
  const userId = await requireUserId();
  const where = { userId };

  await prisma.$transaction([
    prisma.task.deleteMany({ where }),
    prisma.goal.deleteMany({ where }),
    prisma.habit.deleteMany({ where }),
    prisma.learningTopic.deleteMany({ where }),
    prisma.contentItem.deleteMany({ where }),
    prisma.client.deleteMany({ where }),
    prisma.calendarEvent.deleteMany({ where }),
    prisma.timetableFile.deleteMany({ where }),
    prisma.daySnapshot.deleteMany({ where }),
    prisma.workspaceDoc.deleteMany({ where }),
    prisma.lifeCycleLog.deleteMany({ where }),
    prisma.expense.deleteMany({ where }),
    prisma.income.deleteMany({ where }),
    prisma.budgetCategory.deleteMany({ where }),
    prisma.savingsGoal.deleteMany({ where }),
    prisma.courseGrade.deleteMany({ where }),
    prisma.journalEntry.deleteMany({ where }),
    prisma.deadline.deleteMany({ where }),
    prisma.flashcard.deleteMany({ where }),
    prisma.studySession.deleteMany({ where }),
    prisma.studyCourse.deleteMany({ where }),
    prisma.customDatabase.deleteMany({ where }),
    prisma.user.update({
      where: { id: userId },
      data: {
        onboardingCompleted: false,
        useCase: null,
        primaryGoal: null,
        workSchedule: null,
        previousCWA: null,
        previousCredits: null,
        xp: 0,
        level: 1,
      },
    }),
  ]);

  // Refresh every surface that reads this data.
  for (const path of [
    "/dashboard",
    "/goals",
    "/tasks",
    "/habits",
    "/learning",
    "/content",
    "/clients",
    "/finance",
    "/calendar",
    "/planner",
    "/settings",
  ]) {
    revalidatePath(path);
  }

  return { ok: true };
}
