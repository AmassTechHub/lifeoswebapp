import { prisma } from "@/lib/prisma";
import { isUserPro } from "@/lib/billing/plans";
import { FREE_DAILY_LIMIT } from "./claude";

function isToday(date: Date): boolean {
  const now = new Date();
  return (
    date.getFullYear() === now.getFullYear() &&
    date.getMonth() === now.getMonth() &&
    date.getDate() === now.getDate()
  );
}

export async function checkAndIncrementUsage(userId: string): Promise<{
  allowed: boolean;
  usedToday: number;
  remaining: number;
  limit: number;
  isPro: boolean;
}> {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { isPro: true, proExpiresAt: true, aiMessagesUsedToday: true, aiResetDate: true },
  });

  if (!user) return { allowed: false, usedToday: 0, remaining: 0, limit: FREE_DAILY_LIMIT, isPro: false };

  const isPro = isUserPro(user);
  if (isPro) {
    await prisma.user.update({
      where: { id: userId },
      data: { aiMessagesUsedToday: { increment: 1 } },
    });
    return { allowed: true, usedToday: user.aiMessagesUsedToday + 1, remaining: 9999, limit: 9999, isPro: true };
  }

  // Reset counter if last reset was not today
  const needsReset = !user.aiResetDate || !isToday(new Date(user.aiResetDate));
  const currentCount = needsReset ? 0 : (user.aiMessagesUsedToday ?? 0);

  if (currentCount >= FREE_DAILY_LIMIT) {
    return { allowed: false, usedToday: currentCount, remaining: 0, limit: FREE_DAILY_LIMIT, isPro: false };
  }

  await prisma.user.update({
    where: { id: userId },
    data: {
      aiMessagesUsedToday: currentCount + 1,
      aiResetDate: needsReset ? new Date() : undefined,
    },
  });

  // Log daily usage for the activity chart
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  await prisma.aIUsageLog.upsert({
    where: { userId_date: { userId, date: today } },
    create: { userId, date: today, count: 1 },
    update: { count: { increment: 1 } },
  }).catch(() => null); // non-fatal

  return {
    allowed: true,
    usedToday: currentCount + 1,
    remaining: FREE_DAILY_LIMIT - currentCount - 1,
    limit: FREE_DAILY_LIMIT,
    isPro: false,
  };
}

export async function getUsageStats(userId: string) {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { isPro: true, proExpiresAt: true, aiMessagesUsedToday: true, aiResetDate: true },
  });

  const sevenDaysAgo = new Date();
  sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 6);
  sevenDaysAgo.setHours(0, 0, 0, 0);

  const logs = await prisma.aIUsageLog.findMany({
    where: { userId, date: { gte: sevenDaysAgo } },
    orderBy: { date: "asc" },
  });

  // Build 7-day array with 0s for missing days
  const days: { date: string; count: number }[] = [];
  for (let i = 6; i >= 0; i--) {
    const d = new Date();
    d.setDate(d.getDate() - i);
    d.setHours(0, 0, 0, 0);
    const key = d.toISOString().split("T")[0];
    const log = logs.find((l) => new Date(l.date).toISOString().split("T")[0] === key);
    days.push({ date: key, count: log?.count ?? 0 });
  }

  const needsReset = !user?.aiResetDate || !isToday(new Date(user.aiResetDate ?? 0));
  const usedToday = needsReset ? 0 : (user?.aiMessagesUsedToday ?? 0);
  const isPro = user ? isUserPro(user) : false;

  return {
    isPro,
    usedToday,
    limit: isPro ? null : FREE_DAILY_LIMIT,
    remaining: isPro ? null : Math.max(0, FREE_DAILY_LIMIT - usedToday),
    days,
  };
}
