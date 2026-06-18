import crypto from "node:crypto";

export function getPaystackSecretKey(): string {
  return process.env.PAYSTACK_SECRET_KEY?.trim() ?? "";
}

type InitializeResult =
  | { ok: true; authorizationUrl: string; reference: string }
  | { ok: false; error: string };

export async function initializeTransaction(params: {
  email: string;
  amountPesewas: number;
  reference: string;
  callbackUrl: string;
  metadata: Record<string, unknown>;
}): Promise<InitializeResult> {
  const secretKey = getPaystackSecretKey();
  if (!secretKey) return { ok: false, error: "Payments are not configured yet." };

  try {
    const res = await fetch("https://api.paystack.co/transaction/initialize", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${secretKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        email: params.email,
        amount: params.amountPesewas,
        currency: "GHS",
        reference: params.reference,
        callback_url: params.callbackUrl,
        metadata: params.metadata,
      }),
    });
    const data = await res.json();
    if (!res.ok || !data.status) {
      return { ok: false, error: data.message ?? "Could not start checkout" };
    }
    return { ok: true, authorizationUrl: data.data.authorization_url, reference: data.data.reference };
  } catch {
    return { ok: false, error: "Network error contacting payment provider" };
  }
}

export async function verifyTransaction(reference: string): Promise<{
  ok: boolean;
  status?: string;
  amount?: number;
  metadata?: Record<string, unknown>;
}> {
  const secretKey = getPaystackSecretKey();
  if (!secretKey) return { ok: false };

  try {
    const res = await fetch(`https://api.paystack.co/transaction/verify/${encodeURIComponent(reference)}`, {
      headers: { Authorization: `Bearer ${secretKey}` },
    });
    const data = await res.json();
    if (!res.ok || !data.status) return { ok: false };
    return { ok: true, status: data.data.status, amount: data.data.amount, metadata: data.data.metadata };
  } catch {
    return { ok: false };
  }
}

export function verifyWebhookSignature(rawBody: string, signature: string | null): boolean {
  const secretKey = getPaystackSecretKey();
  if (!secretKey || !signature) return false;
  const hash = crypto.createHmac("sha512", secretKey).update(rawBody).digest("hex");
  return hash === signature;
}
