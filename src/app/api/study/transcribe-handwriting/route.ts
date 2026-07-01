import { NextResponse } from "next/server";
import { headers } from "next/headers";
import { auth } from "@/lib/auth";
import { callClaudeWithImage, getServerApiKey } from "@/lib/ai/claude";
import { checkAndIncrementUsage } from "@/lib/ai/usage";
import { prisma } from "@/lib/prisma";

export async function POST(request: Request) {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await request.json().catch(() => ({}));
  const imageDataUrl = String(body.image ?? "");
  const courseId = String(body.courseId ?? "").trim() || null;

  if (!imageDataUrl.startsWith("data:image/")) {
    return NextResponse.json({ error: "Invalid image data" }, { status: 400 });
  }

  const apiKey = getServerApiKey();
  if (!apiKey) {
    return NextResponse.json({ error: "AI not configured" }, { status: 503 });
  }

  const usage = await checkAndIncrementUsage(session.user.id);
  if (!usage.allowed) {
    return NextResponse.json({ error: "Daily AI limit reached. Upgrade to Pro." }, { status: 429 });
  }

  const userRecord = await prisma.user.findUnique({
    where: { id: session.user.id },
    select: { isPro: true },
  });

  const base64 = imageDataUrl.split(",")[1];
  const mediaType = imageDataUrl.split(";")[0].replace("data:", "") as "image/png" | "image/jpeg" | "image/webp";

  let text: string;
  try {
    text = await callClaudeWithImage({
      apiKey,
      system: `You are a handwriting transcription assistant.
Transcribe the handwritten text in the image EXACTLY as written.
Preserve line breaks, bullet points, and structure.
If the image is blank or has no text, respond with an empty string.
Do not add commentary — only the transcribed text.`,
      base64Image: base64,
      mediaType,
      maxTokens: 1500,
      isPro: userRecord?.isPro ?? false,
    });
  } catch (err) {
    const msg = err instanceof Error ? err.message : "Unknown";
    console.error("[transcribe-handwriting] Claude error:", msg);
    const userMsg = msg.includes("401") ? "Invalid API key. Check ANTHROPIC_API_KEY."
      : msg.includes("529") || msg.includes("overloaded") ? "Claude is overloaded. Try again in a moment."
      : "Transcription failed. Try again.";
    return NextResponse.json({ error: userMsg }, { status: 500 });
  }

  // Optionally auto-save as a study note
  if (courseId && text.trim()) {
    try {
      await prisma.studyNote.create({
        data: {
          courseId,
          title: `Handwritten note — ${new Date().toLocaleDateString("en-US", { month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" })}`,
          content: text.trim(),
          type: "NOTE",
        },
      });
    } catch {
      // Non-fatal — still return the transcription
    }
  }

  return NextResponse.json({ text, saved: !!courseId });
}
