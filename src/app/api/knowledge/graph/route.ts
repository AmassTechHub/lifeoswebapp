import { NextResponse } from "next/server";
import { headers } from "next/headers";

import { auth } from "@/lib/auth";
import { getKnowledgeGraph } from "@/lib/knowledge/graph";

export async function GET() {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const graph = await getKnowledgeGraph(session.user.id);
  return NextResponse.json(graph);
}
