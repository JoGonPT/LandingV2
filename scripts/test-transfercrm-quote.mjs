/**
 * Smoke test: GET /v2/availability + POST /v2/quote (mirrors booking/vehicles flow).
 * Run: node --env-file=.env scripts/test-transfercrm-quote.mjs
 *
 * Optional env: TCRM_TEST_PICKUP, TCRM_TEST_DROPOFF (default Lisbon Airport → Cascais)
 */
function apiV2Root(baseUrl) {
  const b = baseUrl.replace(/\/+$/, "");
  if (b.endsWith("/api/v2")) return b;
  if (b.endsWith("/api")) return `${b}/v2`;
  return `${b}/api/v2`;
}

function authHeaders() {
  const mode = (process.env.TRANSFERCRM_AUTH_MODE || "bearer").toLowerCase().replace(/-/g, "_");
  const headers = { Accept: "application/json", "Content-Type": "application/json" };
  if (mode === "x_api_key" || mode === "api_key" || mode === "apikey") {
    headers["X-API-Key"] = process.env.TRANSFERCRM_API_KEY ?? "";
  } else if (process.env.TRANSFERCRM_BEARER_TOKEN?.trim()) {
    headers.Authorization = `Bearer ${process.env.TRANSFERCRM_BEARER_TOKEN.trim()}`;
  } else {
    headers["X-API-Key"] = process.env.TRANSFERCRM_API_KEY ?? "";
  }
  return headers;
}

async function main() {
  const base = process.env.TRANSFERCRM_BASE_URL?.trim();
  if (!base) {
    console.error("Missing TRANSFERCRM_BASE_URL");
    process.exit(1);
  }
  const root = apiV2Root(base);
  const headers = authHeaders();

  const pickupDt = new Date();
  pickupDt.setDate(pickupDt.getDate() + 1);
  pickupDt.setHours(14, 0, 0, 0);
  const iso = pickupDt.toISOString();
  const pickup = process.env.TCRM_TEST_PICKUP?.trim() || "Lisbon Airport";
  const dropoff = process.env.TCRM_TEST_DROPOFF?.trim() || "Cascais";

  console.log("API root:", root);
  console.log("Route:", pickup, "→", dropoff, "@", iso);

  const avParams = new URLSearchParams({
    pickup_location: pickup,
    dropoff_location: dropoff,
    pickup_date: iso,
    passengers: "2",
  });
  const avRes = await fetch(`${root}/availability?${avParams}`, { headers });
  const avText = await avRes.text();
  console.log("\n--- GET /availability ---\nstatus:", avRes.status);
  let vehicleTypes = [];
  try {
    const j = JSON.parse(avText);
    const data = j.data ?? j;
    vehicleTypes = (data.vehicle_types ?? []).map((v) => v.vehicle_type).filter(Boolean);
    console.log(JSON.stringify({ available: data.available, vehicle_types: vehicleTypes }, null, 2));
  } catch {
    console.log(avText.slice(0, 2000));
  }

  async function quote(label, body) {
    const r = await fetch(`${root}/quote`, { method: "POST", headers, body: JSON.stringify(body) });
    const t = await r.text();
    console.log(`\n--- POST /quote ${label} ---\nstatus:`, r.status);
    console.log(t.length > 2000 ? `${t.slice(0, 2000)}…` : t);
    return r.status;
  }

  const baseQuote = {
    pickup_location: pickup,
    dropoff_location: dropoff,
    pickup_date: iso,
    passengers: 2,
  };

  await quote("(no distance_km, no vehicle_type)", { ...baseQuote });
  await quote("(distance_km: 30, no vehicle_type)", { ...baseQuote, distance_km: 30 });

  for (const vt of vehicleTypes.slice(0, 3)) {
    await quote(`(distance_km: 30, vehicle_type: ${JSON.stringify(vt)})`, {
      ...baseQuote,
      distance_km: 30,
      vehicle_type: vt,
    });
  }
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
