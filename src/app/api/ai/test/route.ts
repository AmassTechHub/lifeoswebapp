import { NextResponse } from "next/server";
import { headers } from "next/headers";
import { auth } from "@/lib/auth";
import { getServerApiKey } from "@/lib/ai/claude";

/**
 * GET /api/ai/test
 * Returns whether the Anthropic API key is configured and valid.
 * Useful for debugging "AI temporarily unavailable" errors.
 */
export async function GET() {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const apiKey = getServerApiKey();

  if (!apiKey) {
    return NextResponse.json({
      ok: false,
      configured: false,
      message: "ANTHROPIC_API_KEY is not set. Add it in Vercel → Settings → Environment Variables.",
    });
  }

  // Make a minimal test call
  try {
    const res = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "x-api-key": apiKey,
        "anthropic-version": "2023-06-01",
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "claude-3-5-haiku-20241022",
        max_tokens: 10,
        messages: [{ role: "user", content: "Say: ok" }],
      }),
    });

    if (res.ok) {
      return NextResponse.json({ ok: true, configured: true, message: "API key valid. Claude is responding." });
    }

    const err = await res.text();
    return NextResponse.json({
      ok: false,
      configured: true,
      status: res.status,
      message: res.status === 401
        ? "API key is set but invalid (401). Regenerate it at console.anthropic.com."
        : res.status === 529
        ? "Claude API is overloaded right now. Wait a few minutes."
        : `Claude returned ${res.status}: ${err.slice(0, 200)}`,
    });
  } catch (err) {
    return NextResponse.json({
      ok: false,
      configured: true,
      message: `Network error: ${err instanceof Error ? err.message : "unknown"}`,
    });
  }
}
