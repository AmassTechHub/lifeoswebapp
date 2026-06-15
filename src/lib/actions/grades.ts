"use server";

import { revalidatePath } from "next/cache";
import { requireUserId } from "@/lib/actions/auth";
import { prisma } from "@/lib/prisma";
import { KNUST_GRADES } from "@/lib/grades-constants";

export async function getGrades(userId: string) {
  return prisma.courseGrade.findMany({
    where: { userId },
    orderBy: [{ year: "desc" }, { semester: "asc" }, { name: "asc" }],
  });
}

export async function createGrade(formData: FormData) {
  const userId = await requireUserId();
  const name = String(formData.get("name") ?? "").trim();
  const code = String(formData.get("code") ?? "").trim() || null;
  const credits = parseInt(String(formData.get("credits") ?? "3"), 10) || 3;
  const grade = String(formData.get("grade") ?? "").trim();
  const semester = String(formData.get("semester") ?? "").trim();
  const year = parseInt(String(formData.get("year") ?? new Date().getFullYear()), 10);

  if (!name || !grade || !semester) return { error: "Name, grade, and semester are required" };
  if (!(grade in KNUST_GRADES)) return { error: "Invalid grade" };

  await prisma.courseGrade.create({ data: { userId, name, code, credits, grade, semester, year } });
  revalidatePath("/grades");
  return { ok: true };
}

export async function updateGrade(id: string, formData: FormData) {
  const userId = await requireUserId();
  const grade = await prisma.courseGrade.findFirst({ where: { id, userId } });
  if (!grade) return { error: "Not found" };

  const name = String(formData.get("name") ?? "").trim();
  const code = String(formData.get("code") ?? "").trim() || null;
  const credits = parseInt(String(formData.get("credits") ?? "3"), 10) || 3;
  const gradeVal = String(formData.get("grade") ?? "").trim();
  const semester = String(formData.get("semester") ?? "").trim();
  const year = parseInt(String(formData.get("year") ?? new Date().getFullYear()), 10);

  if (!name || !gradeVal || !semester) return { error: "Name, grade, and semester are required" };

  await prisma.courseGrade.update({ where: { id }, data: { name, code, credits, grade: gradeVal, semester, year } });
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
