"use server";

import { headers } from "next/headers";

import { auth } from "@/lib/auth";

export async function requireUserId() {
  const session = await auth.api.getSession({
    headers: await headers(),
  });
  if (!session?.user?.id) {
    throw new Error("Unauthorized");
  }
  return session.user.id;
}
