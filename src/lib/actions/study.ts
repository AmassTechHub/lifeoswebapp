"use server";

import { revalidatePath } from "next/cache";

import { requireUserId } from "@/lib/actions/auth";
import { prisma } from "@/lib/prisma";

export async function createStudyCourse(formData: FormData) {
  const userId = await requireUserId();
  const name = String(formData.get("name") ?? "").trim();
  const code = String(formData.get("code") ?? "").trim() || null;
  const color = String(formData.get("color") ?? "#3b82f6").trim() || "#3b82f6";
  if (!name) return { error: "Course name is required" };

  await prisma.studyCourse.create({
    data: { userId, name, code, color },
  });
  revalidatePath("/learning");
  revalidatePath("/dashboard");
  return { ok: true };
}

export async function createStudyNote(formData: FormData) {
  const userId = await requireUserId();
  const courseId = String(formData.get("courseId") ?? "");
  const title = String(formData.get("title") ?? "").trim();
  const content = String(formData.get("content") ?? "");
  const type = String(formData.get("type") ?? "NOTE") as "NOTE" | "SUMMARY" | "LECTURE";

  const course = await prisma.studyCourse.findFirst({
    where: { id: courseId, userId },
  });
  if (!course) return { error: "Course not found" };
  if (!title) return { error: "Title is required" };

  await prisma.studyNote.create({
    data: { courseId, title, content, type },
  });
  revalidatePath("/learning");
  revalidatePath("/dashboard");
  return { ok: true };
}

export async function updateStudyNote(formData: FormData) {
  const userId = await requireUserId();
  const id = String(formData.get("id") ?? "");
  const title = String(formData.get("title") ?? "").trim();
  const content = String(formData.get("content") ?? "");

  const note = await prisma.studyNote.findFirst({
    where: { id, course: { userId } },
  });
  if (!note) return { error: "Note not found" };

  await prisma.studyNote.update({
    where: { id },
    data: { title, content },
  });
  revalidatePath("/learning");
  return { ok: true };
}

export async function deleteStudyNote(id: string) {
  const userId = await requireUserId();
  const note = await prisma.studyNote.findFirst({
    where: { id, course: { userId } },
  });
  if (!note) return { error: "Not found" };
  await prisma.studyNote.delete({ where: { id } });
  revalidatePath("/learning");
  revalidatePath("/dashboard");
  return { ok: true };
}

export async function deleteStudyCourse(id: string) {
  const userId = await requireUserId();
  const course = await prisma.studyCourse.findFirst({ where: { id, userId } });
  if (!course) return { error: "Not found" };
  await prisma.studyCourse.delete({ where: { id } });
  revalidatePath("/learning");
  revalidatePath("/dashboard");
  return { ok: true };
}

export async function getStudyCourses(userId: string) {
  return prisma.studyCourse.findMany({
    where: { userId },
    include: {
      notes: { orderBy: { updatedAt: "desc" } },
      materials: { orderBy: { createdAt: "desc" } },
      scheduleSlots: { orderBy: [{ dayOfWeek: "asc" }, { startTime: "asc" }] },
      _count: { select: { notes: true, materials: true } },
    },
    orderBy: { updatedAt: "desc" },
  });
}

export async function createCourseSchedule(formData: FormData) {
  const userId = await requireUserId();
  const courseId = String(formData.get("courseId") ?? "");
  const dayOfWeek = parseInt(String(formData.get("dayOfWeek") ?? "0"));
  const startTime = String(formData.get("startTime") ?? "09:00");
  const endTime = String(formData.get("endTime") ?? "10:00");
  const venue = String(formData.get("venue") ?? "").trim() || null;

  const course = await prisma.studyCourse.findFirst({ where: { id: courseId, userId } });
  if (!course) return { error: "Course not found" };

  await prisma.courseSchedule.create({
    data: { courseId, dayOfWeek, startTime, endTime, venue },
  });
  revalidatePath("/learning");
  return { ok: true };
}

export async function deleteCourseSchedule(id: string) {
  const userId = await requireUserId();
  const slot = await prisma.courseSchedule.findFirst({
    where: { id, course: { userId } },
  });
  if (!slot) return { error: "Not found" };
  await prisma.courseSchedule.delete({ where: { id } });
  revalidatePath("/learning");
  return { ok: true };
}

export async function getStudyStreak(userId: string): Promise<{ current: number; longest: number; totalSessions: number; totalMinutes: number }> {
  const sessions = await prisma.studySession.findMany({
    where: { userId, durationSecs: { gt: 0 } },
    select: { startedAt: true, durationSecs: true },
    orderBy: { startedAt: "desc" },
  });

  if (sessions.length === 0) return { current: 0, longest: 0, totalSessions: 0, totalMinutes: 0 };

  const totalMinutes = Math.round(sessions.reduce((s, r) => s + r.durationSecs, 0) / 60);

  // Collect unique study dates (in local-ish UTC days)
  const daySet = new Set(sessions.map((s) => s.startedAt.toISOString().slice(0, 10)));
  const days = [...daySet].sort().reverse(); // newest first

  // Count current streak
  let current = 0;
  const today = new Date().toISOString().slice(0, 10);
  const yesterday = new Date(Date.now() - 86_400_000).toISOString().slice(0, 10);
  let expected = days[0] === today || days[0] === yesterday ? days[0] : null;

  for (const day of days) {
    if (day === expected) {
      current++;
      const prev = new Date(new Date(expected).getTime() - 86_400_000);
      expected = prev.toISOString().slice(0, 10);
    } else {
      break;
    }
  }

  // Count longest streak
  const sorted = [...daySet].sort();
  let longest = 0;
  let run = 0;
  let prev: string | null = null;
  for (const day of sorted) {
    if (prev && new Date(day).getTime() - new Date(prev).getTime() === 86_400_000) {
      run++;
    } else {
      run = 1;
    }
    if (run > longest) longest = run;
    prev = day;
  }

  return { current, longest, totalSessions: sessions.length, totalMinutes };
}

export async function getDeadlines(userId: string) {
  const now = new Date();
  const ninetyDaysOut = new Date(now.getTime() + 90 * 24 * 60 * 60 * 1000);
  return prisma.deadline.findMany({
    where: {
      userId,
      completed: false,
      dueDate: { gte: now, lte: ninetyDaysOut },
    },
    include: { course: { select: { name: true, color: true } } },
    orderBy: { dueDate: "asc" },
    take: 20,
  });
}

export async function getCourseTimeSecs(userId: string): Promise<Record<string, number>> {
  const sessions = await prisma.studySession.findMany({
    where: { userId, courseId: { not: null }, durationSecs: { gt: 0 } },
    select: { courseId: true, durationSecs: true },
  });
  const map: Record<string, number> = {};
  for (const s of sessions) {
    if (s.courseId) map[s.courseId] = (map[s.courseId] ?? 0) + s.durationSecs;
  }
  return map;
}
