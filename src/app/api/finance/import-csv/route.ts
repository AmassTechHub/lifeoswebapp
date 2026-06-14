import { NextResponse } from "next/server";
import { headers } from "next/headers";

import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { revalidatePath } from "next/cache";

type ImportRow = {
  date: string;
  description: string;
  amount: number;
  category: string;
  paymentMethod?: string;
};

export async function POST(request: Request) {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await request.json().catch(() => ({}));
  const rows: ImportRow[] = Array.isArray(body.rows) ? body.rows : [];

  if (rows.length === 0) {
    return NextResponse.json({ error: "No rows provided" }, { status: 400 });
  }

  const valid = rows.filter(
    (r) =>
      typeof r.amount === "number" &&
      r.amount > 0 &&
      typeof r.date === "string" &&
      r.date.length > 0
  );

  if (valid.length === 0) {
    return NextResponse.json({ error: "No valid rows to import" }, { status: 400 });
  }

  await prisma.expense.createMany({
    data: valid.map((r) => ({
      userId: session.user.id,
      amount: r.amount,
      category: r.category || "Other",
      description: r.description || null,
      paymentMethod: r.paymentMethod || "OTHER",
      date: new Date(r.date),
    })),
  });

  revalidatePath("/finance");
  revalidatePath("/dashboard");

  return NextResponse.json({ ok: true, imported: valid.length });
}
