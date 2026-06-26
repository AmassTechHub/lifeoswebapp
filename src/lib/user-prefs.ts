// ── User Preferences ─────────────────────────────────────────────────────────
// Server-side helper — reads currency, gradingSystem, timezone from the DB.
// Used by server components and page.tsx files to pass preferences down to
// client components as props.

import { prisma } from "@/lib/prisma";

export type UserPrefs = {
  currency: string;       // ISO 4217 e.g. "GHS"
  gradingSystem: string;  // key from GRADING_SYSTEMS e.g. "knust"
  timezone: string;       // IANA tz e.g. "Africa/Accra"
  useCases: string[];     // ["student","creator",...]
};

const PREFS_DEFAULTS: UserPrefs = {
  currency: "GHS",
  gradingSystem: "knust",
  timezone: "Africa/Accra",
  useCases: [],
};

export async function getUserPrefs(userId: string): Promise<UserPrefs> {
  try {
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { currency: true, gradingSystem: true, timezone: true, useCase: true },
    });
    if (!user) return PREFS_DEFAULTS;

    let useCases: string[] = [];
    try {
      useCases = user.useCase ? (JSON.parse(user.useCase) as string[]) : [];
    } catch {
      useCases = [];
    }

    return {
      currency: user.currency ?? PREFS_DEFAULTS.currency,
      gradingSystem: user.gradingSystem ?? PREFS_DEFAULTS.gradingSystem,
      timezone: user.timezone ?? PREFS_DEFAULTS.timezone,
      useCases,
    };
  } catch {
    return PREFS_DEFAULTS;
  }
}
