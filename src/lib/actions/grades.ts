"use server";

import { revalidatePath } from "next/cache";
import { requireUserId } from "@/lib/actions/auth";
import { prisma } from "@/lib/prisma";
import { KNUST_GRADES, scoreToGrade } from "@/lib/grades-constants";

export async function getGrades(userId: string) {
  return prisma.courseGrade.findMany({
    where: { userId },
    orderBy: [{ year: "desc" }, { semester: "asc" }, { name: "asc" }],
  });
}

export async function getPreviousRecord() {
  const userId = await requireUserId();
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { previousCWA: true, previousCredits: true },
  });
  return { previousCWA: user?.previousCWA ?? null, previousCredits: user?.previousCredits ?? null };
}

export async function savePreviousRecord(formData: FormData) {
  const userId = await requireUserId();
  const previousCWA = parseFloat(String(formData.get("previousCWA") ?? ""));
  const previousCredits = parseInt(String(formData.get("previousCredits") ?? ""), 10);

  if (isNaN(previousCWA) || previousCWA < 0 || previousCWA > 100) return { error: "CWA must be between 0 and 100" };
  if (isNaN(previousCredits) || previousCredits < 0) return { error: "Credits must be 0 or more" };

  await prisma.user.update({ where: { id: userId }, data: { previousCWA, previousCredits } });
  revalidatePath("/grades");
  return { ok: true };
}

export async function createGrade(formData: FormData) {
  const userId = await requireUserId();
  const name = String(formData.get("name") ?? "").trim();
  const code = String(formData.get("code") ?? "").trim() || null;
  const credits = parseInt(String(formData.get("credits") ?? "3"), 10) || 3;
  const semester = String(formData.get("semester") ?? "").trim();
  const year = parseInt(String(formData.get("year") ?? new Date().getFullYear()), 10);

  const scoreStr = String(formData.get("score") ?? "").trim();
  const score = scoreStr ? parseFloat(scoreStr) : null;
  let grade = String(formData.get("grade") ?? "").trim();

  if (score !== null && !isNaN(score)) {
    grade = scoreToGrade(Math.max(0, Math.min(100, score)));
  }

  if (!name || !grade || !semester) return { error: "Name, grade, and semester are required" };
  if (!(grade in KNUST_GRADES)) return { error: "Invalid grade" };

  await prisma.courseGrade.create({ data: { userId, name, code, credits, grade, score: score ?? null, semester, year } });
  revalidatePath("/grades");
  return { ok: true };
}

export async function updateGrade(id: string, formData: FormData) {
  const userId = await requireUserId();
  const existing = await prisma.courseGrade.findFirst({ where: { id, userId } });
  if (!existing) return { error: "Not found" };

  const name = String(formData.get("name") ?? "").trim();
  const code = String(formData.get("code") ?? "").trim() || null;
  const credits = parseInt(String(formData.get("credits") ?? "3"), 10) || 3;
  const semester = String(formData.get("semester") ?? "").trim();
  const year = parseInt(String(formData.get("year") ?? new Date().getFullYear()), 10);

  const scoreStr = String(formData.get("score") ?? "").trim();
  const score = scoreStr ? parseFloat(scoreStr) : null;
  let gradeVal = String(formData.get("grade") ?? "").trim();

  if (score !== null && !isNaN(score)) {
    gradeVal = scoreToGrade(Math.max(0, Math.min(100, score)));
  }

  if (!name || !gradeVal || !semester) return { error: "Name, grade, and semester are required" };

  await prisma.courseGrade.update({
    where: { id },
    data: { name, code, credits, grade: gradeVal, score: score ?? null, semester, year },
  });
  revalidatePath("/grades");
  return { ok: true };
}

export async function deleteGrade(id: string) {
  const userId = await requireUserId();
  const grade = await prisma.courseGrade.findFirst({ where: { id, userId } });
  if (!grade) return { error: "Not found" };
  await prisma.courseGrade.delete({ where: { id } });
  revalidatePath("/grades");
  return { ok: true };
}
