import { createHmac } from "crypto";

export interface DriverStatusWebhookPayload {
  booking_id: string;
  travel_status: string;
  source: "driver_app";
}

export async function postDriverStatusWebhook(payload: DriverStatusWebhookPayload): Promise<void> {
  const url = process.env.DRIVER_STATUS_WEBHOOK_URL?.trim();
  if (!url) return;

  const secret = process.env.DRIVER_STATUS_WEBHOOK_SECRET?.trim();
  const body = JSON.stringify({
    ...payload,
    occurred_at: new Date().toISOString(),
  });

  const headers: Record<string, string> = {
    "Content-Type": "application/json",
    "User-Agent": "Way2Go-DriverApp/1.0",
  };

  if (secret) {
    const sig = createHmac("sha256", secret).update(body).digest("hex");
    headers["X-Way2Go-Signature"] = `sha256=${sig}`;
  }

  const res = await fetch(url, { method: "POST", headers, body });
  if (!res.ok) {
    throw new Error(`Driver status webhook failed with HTTP ${res.status}.`);
  }
}
