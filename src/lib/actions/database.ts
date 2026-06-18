"use server";

import { revalidatePath } from "next/cache";
import type { Prisma } from "@prisma/client";

import { requireUserId } from "@/lib/actions/auth";
import { prisma } from "@/lib/prisma";
import {
  DATABASE_TEMPLATES, newId, colorFor,
  type Property, type PropertyOption, type PropertyType, type View, type ViewType, type DatabaseTemplateKey,
} from "@/lib/database-templates";

export type { Property, PropertyOption, PropertyType, View, ViewType, DatabaseTemplateKey };

export async function createDatabase(name: string, templateKey: DatabaseTemplateKey = "tasks") {
  const userId = await requireUserId();
  const trimmed = name.trim();
  if (!trimmed) return { error: "Name required" };

  const template = DATABASE_TEMPLATES.find((t) => t.key === templateKey) ?? DATABASE_TEMPLATES[1];
  const { properties, views } = template.build();

  const db = await prisma.customDatabase.create({
    data: { userId, name: trimmed, properties, views },
  });

  revalidatePath("/databases");
  return { ok: true, id: db.id };
}

export async function deleteDatabase(id: string) {
  const userId = await requireUserId();
  const db = await prisma.customDatabase.findFirst({ where: { id, userId } });
  if (!db) return { error: "Not found" };
  await prisma.customDatabase.delete({ where: { id } });
  revalidatePath("/databases");
  return { ok: true };
}

export async function renameDatabase(id: string, name: string) {
  const userId = await requireUserId();
  const db = await prisma.customDatabase.findFirst({ where: { id, userId } });
  if (!db) return { error: "Not found" };
  await prisma.customDatabase.update({ where: { id }, data: { name: name.trim() || db.name } });
  revalidatePath(`/databases/${id}`);
  return { ok: true };
}

export async function addProperty(databaseId: string, name: string, type: PropertyType) {
  const userId = await requireUserId();
  const db = await prisma.customDatabase.findFirst({ where: { id: databaseId, userId } });
  if (!db) return { error: "Not found" };

  const properties = (db.properties as unknown as Property[]) ?? [];
  const property: Property = {
    id: newId("prop"),
    name: name.trim() || "Property",
    type,
    options: type === "select" ? [] : undefined,
  };
  properties.push(property);

  await prisma.customDatabase.update({ where: { id: databaseId }, data: { properties } });
  revalidatePath(`/databases/${databaseId}`);
  return { ok: true, propertyId: property.id };
}

export async function deleteProperty(databaseId: string, propertyId: string) {
  const userId = await requireUserId();
  const db = await prisma.customDatabase.findFirst({ where: { id: databaseId, userId } });
  if (!db) return { error: "Not found" };

  const properties = ((db.properties as unknown as Property[]) ?? []).filter((p) => p.id !== propertyId);
  const views = ((db.views as unknown as View[]) ?? []).filter((v) => v.groupByPropertyId !== propertyId);

  await prisma.customDatabase.update({ where: { id: databaseId }, data: { properties, views } });
  revalidatePath(`/databases/${databaseId}`);
  return { ok: true };
}

export async function addSelectOption(databaseId: string, propertyId: string, label: string) {
  const userId = await requireUserId();
  const db = await prisma.customDatabase.findFirst({ where: { id: databaseId, userId } });
  if (!db) return { error: "Not found" };

  const properties = (db.properties as unknown as Property[]) ?? [];
  const property = properties.find((p) => p.id === propertyId);
  if (!property || property.type !== "select") return { error: "Not a select property" };

  const option: PropertyOption = { id: newId("opt"), label: label.trim() || "Option", color: colorFor((property.options?.length ?? 0)) };
  property.options = [...(property.options ?? []), option];

  await prisma.customDatabase.update({ where: { id: databaseId }, data: { properties } });
  revalidatePath(`/databases/${databaseId}`);
  return { ok: true, optionId: option.id };
}

export async function addView(databaseId: string, name: string, type: ViewType, groupByPropertyId?: string) {
  const userId = await requireUserId();
  const db = await prisma.customDatabase.findFirst({ where: { id: databaseId, userId } });
  if (!db) return { error: "Not found" };

  const views = (db.views as unknown as View[]) ?? [];
  const view: View = { id: newId("view"), name: name.trim() || "View", type, groupByPropertyId };
  views.push(view);

  await prisma.customDatabase.update({ where: { id: databaseId }, data: { views } });
  revalidatePath(`/databases/${databaseId}`);
  return { ok: true, viewId: view.id };
}

export async function deleteView(databaseId: string, viewId: string) {
  const userId = await requireUserId();
  const db = await prisma.customDatabase.findFirst({ where: { id: databaseId, userId } });
  if (!db) return { error: "Not found" };

  const views = ((db.views as unknown as View[]) ?? []).filter((v) => v.id !== viewId);
  await prisma.customDatabase.update({ where: { id: databaseId }, data: { views } });
  revalidatePath(`/databases/${databaseId}`);
  return { ok: true };
}

async function assertDatabaseOwnership(databaseId: string, userId: string) {
  const db = await prisma.customDatabase.findFirst({ where: { id: databaseId, userId } });
  return !!db;
}

export async function createRow(databaseId: string, values: Record<string, unknown>) {
  const userId = await requireUserId();
  if (!(await assertDatabaseOwnership(databaseId, userId))) return { error: "Not found" };

  const row = await prisma.customDatabaseRow.create({
    data: { databaseId, values: values as Prisma.InputJsonValue },
  });
  revalidatePath(`/databases/${databaseId}`);
  return { ok: true, id: row.id };
}

export async function updateRowValue(rowId: string, propertyId: string, value: unknown) {
  const userId = await requireUserId();
  const row = await prisma.customDatabaseRow.findFirst({
    where: { id: rowId },
    include: { database: { select: { id: true, userId: true } } },
  });
  if (!row || row.database.userId !== userId) return { error: "Not found" };

  const values = { ...(row.values as Record<string, unknown>), [propertyId]: value };
  await prisma.customDatabaseRow.update({
    where: { id: rowId },
    data: { values: values as Prisma.InputJsonValue },
  });
  revalidatePath(`/databases/${row.database.id}`);
  return { ok: true };
}

export async function deleteRow(rowId: string) {
  const userId = await requireUserId();
  const row = await prisma.customDatabaseRow.findFirst({
    where: { id: rowId },
    include: { database: { select: { id: true, userId: true } } },
  });
  if (!row || row.database.userId !== userId) return { error: "Not found" };

  await prisma.customDatabaseRow.delete({ where: { id: rowId } });
  revalidatePath(`/databases/${row.database.id}`);
  return { ok: true };
}

export async function getDatabases(userId: string) {
  return prisma.customDatabase.findMany({
    where: { userId },
    orderBy: { updatedAt: "desc" },
    include: { _count: { select: { rows: true } } },
  });
}

export async function getDatabase(id: string, userId: string) {
  return prisma.customDatabase.findFirst({
    where: { id, userId },
    include: { rows: { orderBy: { createdAt: "asc" } } },
  });
}
