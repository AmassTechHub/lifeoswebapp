const FREE_MODEL = "claude-3-5-haiku-20241022";
const PRO_MODEL = "claude-sonnet-4-5";
const FREE_DAILY_LIMIT = 60;

export { FREE_DAILY_LIMIT };

export function getModel(isPro: boolean): string {
  return isPro
    ? (process.env.ANTHROPIC_PRO_MODEL ?? PRO_MODEL)
    : (process.env.ANTHROPIC_MODEL ?? FREE_MODEL);
}

export async function callClaude({
  apiKey,
  system,
  messages,
  maxTokens = 1024,
  isPro = false,
}: {
  apiKey: string;
  system: string;
  messages: { role: "user" | "assistant"; content: string }[];
  maxTokens?: number;
  isPro?: boolean;
}): Promise<string> {
  const res = await fetch("https://api.anthropic.com/v1/messages", {
    method: "POST",
    headers: {
      "x-api-key": apiKey,
      "anthropic-version": "2023-06-01",
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model: getModel(isPro),
      max_tokens: maxTokens,
      system,
      messages,
    }),
  });

  if (!res.ok) {
    const err = await res.text();
    throw new Error(`Anthropic API error ${res.status}: ${err}`);
  }

  const data = await res.json() as { content: { type: string; text: string }[] };
  return data.content?.[0]?.text?.trim() ?? "";
}

export function getServerApiKey(): string {
  return process.env.ANTHROPIC_API_KEY?.trim() ?? "";
}

/**
 * Call Claude with a base64-encoded image (for vision tasks like
 * handwriting transcription, slide reading, diagram explanation).
 */
export async function callClaudeWithImage({
  apiKey,
  system,
  base64Image,
  mediaType = "image/png",
  prompt = "Transcribe or describe this image.",
  maxTokens = 1500,
  isPro = false,
}: {
  apiKey: string;
  system: string;
  base64Image: string;
  mediaType?: "image/png" | "image/jpeg" | "image/webp" | "image/gif";
  prompt?: string;
  maxTokens?: number;
  isPro?: boolean;
}): Promise<string> {
  const res = await fetch("https://api.anthropic.com/v1/messages", {
    method: "POST",
    headers: {
      "x-api-key": apiKey,
      "anthropic-version": "2023-06-01",
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model: getModel(isPro),
      max_tokens: maxTokens,
      system,
      messages: [
        {
          role: "user",
          content: [
            {
              type: "image",
              source: { type: "base64", media_type: mediaType, data: base64Image },
            },
            { type: "text", text: prompt },
          ],
        },
      ],
    }),
  });

  if (!res.ok) {
    const err = await res.text();
    throw new Error(`Anthropic API error ${res.status}: ${err}`);
  }

  const data = await res.json() as { content: { type: string; text: string }[] };
  return data.content?.[0]?.text?.trim() ?? "";
}
