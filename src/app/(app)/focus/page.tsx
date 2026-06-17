import { FocusMode } from "@/components/focus/FocusMode";
import { prisma } from "@/lib/prisma";
import { requireSession } from "@/lib/session";

export default async function FocusPage() {
  const session = await requireSession();
  const courses = await prisma.studyCourse.findMany({
    where: { userId: session.user.id },
    select: { id: true, name: true, code: true },
    orderBy: { name: "asc" },
  });
  return <FocusMode courses={courses} />;
}
