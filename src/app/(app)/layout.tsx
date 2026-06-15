import { redirect } from "next/navigation";

import { prisma } from "@/lib/prisma";
import { getServerSession } from "@/lib/session";
import { AppLayoutClient } from "@/components/layout/AppLayoutClient";
import { PWARegister } from "@/components/pwa/PWARegister";

export const dynamic = "force-dynamic";

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  let session: Awaited<ReturnType<typeof getServerSession>>;
  try {
    session = await getServerSession();
  } catch {
    redirect("/login");
  }
  if (!session) redirect("/login");

  try {
    const user = await prisma.user.findUnique({
      where: { id: session.user.id },
      select: {
        onboardingCompleted: true,
        _count: { select: { studyCourses: true } },
      },
    });

    if (!user?.onboardingCompleted) {
      if ((user?._count.studyCourses ?? 0) > 0) {
        await prisma.user.update({
          where: { id: session.user.id },
          data: { onboardingCompleted: true },
        });
      } else {
        redirect("/onboarding");
      }
    }
  } catch {
    // DB temporarily unreachable — still render the app shell
  }

  return (
    <>
      <AppLayoutClient>{children}</AppLayoutClient>
      <PWARegister />
    </>
  );
}
