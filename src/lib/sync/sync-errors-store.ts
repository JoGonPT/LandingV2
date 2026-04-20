export type SyncErrorInsert = {
  source: string;
  severity?: "error" | "warning";
  context: Record<string, unknown>;
  error_message: string;
};

function headers(serviceKey: string) {
  return {
    apikey: serviceKey,
    Authorization: `Bearer ${serviceKey}`,
    "Content-Type": "application/json",
    Prefer: "return=minimal",
  };
}

/** Insert a row into `public.sync_errors` (service role). */
export async function insertSyncErrorFromEnv(row: SyncErrorInsert): Promise<void> {
  const baseUrl = process.env.SUPABASE_URL?.trim().replace(/\/+$/, "");
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY?.trim();
  if (!baseUrl || !serviceKey) {
    console.error("[sync_errors] SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY not set; skipping persist.");
    return;
  }

  const res = await fetch(`${baseUrl}/rest/v1/sync_errors`, {
    method: "POST",
    headers: headers(serviceKey),
    body: JSON.stringify([
      {
        source: row.source.slice(0, 200),
        severity: row.severity ?? "error",
        context: row.context,
        error_message: row.error_message.slice(0, 8000),
      },
    ]),
  });
  if (!res.ok) {
    const t = await res.text().catch(() => "");
    console.error(`[sync_errors] insert failed: ${res.status} ${t}`);
  }
}
