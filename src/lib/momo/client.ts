const BASE_URLS = {
  sandbox: "https://sandbox.momoapi.mtn.com",
  production: "https://momoapi.mtn.com",
} as const;

export type MoMoCreds = {
  subscriptionKey: string;
  userId: string;
  apiSecret: string;
  environment: "sandbox" | "production";
};

export type DisbursementStatus = "PENDING" | "SUCCESSFUL" | "FAILED";

async function getToken(creds: MoMoCreds): Promise<string> {
  const basic = Buffer.from(`${creds.userId}:${creds.apiSecret}`).toString("base64");

  const res = await fetch(`${BASE_URLS[creds.environment]}/disbursement/token/`, {
    method: "POST",
    headers: {
      Authorization: `Basic ${basic}`,
      "Ocp-Apim-Subscription-Key": creds.subscriptionKey,
    },
  });

  if (!res.ok) {
    const text = await res.text();
    throw new Error(`MoMo token error (${res.status}): ${text}`);
  }

  const data = (await res.json()) as { access_token: string };
  return data.access_token;
}

// Normalise Ghanaian numbers: 0244... → 233244...
function toMSISDN(phone: string): string {
  const digits = phone.replace(/\D/g, "");
  if (digits.startsWith("233")) return digits;
  if (digits.startsWith("0")) return "233" + digits.slice(1);
  return "233" + digits;
}

export async function initiateDisbursement(
  creds: MoMoCreds,
  opts: {
    referenceId: string;
    recipientPhone: string;
    amount: number;
    currency?: string;
    note?: string;
  }
): Promise<{ accepted: boolean; statusCode: number }> {
  const token = await getToken(creds);

  const res = await fetch(`${BASE_URLS[creds.environment]}/disbursement/v1_0/transfer`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${token}`,
      "X-Reference-Id": opts.referenceId,
      "X-Target-Environment": creds.environment,
      "Ocp-Apim-Subscription-Key": creds.subscriptionKey,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      amount: String(Math.round(opts.amount * 100) / 100),
      currency: opts.currency ?? "GHS",
      externalId: opts.referenceId,
      payee: {
        partyIdType: "MSISDN",
        partyId: toMSISDN(opts.recipientPhone),
      },
      payerMessage: opts.note ?? "Payment via LifeOS",
      payeeNote: "Sent via LifeOS",
    }),
  });

  // MTN returns 202 Accepted when queued successfully
  return { accepted: res.status === 202, statusCode: res.status };
}

export async function getDisbursementStatus(
  creds: MoMoCreds,
  referenceId: string
): Promise<{ status: DisbursementStatus; raw: Record<string, unknown> }> {
  const token = await getToken(creds);

  const res = await fetch(
    `${BASE_URLS[creds.environment]}/disbursement/v1_0/transfer/${referenceId}`,
    {
      headers: {
        Authorization: `Bearer ${token}`,
        "X-Target-Environment": creds.environment,
        "Ocp-Apim-Subscription-Key": creds.subscriptionKey,
      },
    }
  );

  if (!res.ok) throw new Error(`Status check failed (${res.status})`);

  const data = (await res.json()) as Record<string, unknown>;
  const s = String(data.status ?? "").toUpperCase();
  const status: DisbursementStatus =
    s === "SUCCESSFUL" ? "SUCCESSFUL" : s === "FAILED" ? "FAILED" : "PENDING";

  return { status, raw: data };
}
