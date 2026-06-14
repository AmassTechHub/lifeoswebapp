import { redirect } from "next/navigation";

import { prisma } from "@/lib/prisma";
import { getServerSession } from "@/lib/session";
import { AppLayoutClient } from "@/components/layout/AppLayoutClient";

export const dynamic = "force-dynamic";

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const session = await getServerSession();
  if (!session) redirect("/login");

  const user = await prisma.user.findUnique({
    where: { id: session.user.id },
    select: {
      onboardingCompleted: true,
      _count: { select: { studyCourses: true } },
    },
  });

  if (!user?.onboardingCompleted) {
    if ((user?._count.studyCourses ?? 0) > 0) {
      // Silently graduate users who already set up courses before onboarding existed
      await prisma.user.update({
        where: { id: session.user.id },
        data: { onboardingCompleted: true },
      });
    } else {
      redirect("/onboarding");
    }
  }

  return <AppLayoutClient>{children}</AppLayoutClient>;
}
