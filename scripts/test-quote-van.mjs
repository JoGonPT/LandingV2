import { readFileSync } from "node:fs";
import { resolve } from "node:path";

function loadDotEnv(pathname = ".env") {
  const abs = resolve(process.cwd(), pathname);
  const raw = readFileSync(abs, "utf8");
  for (const line of raw.split(/\r?\n/)) {
    const t = line.trim();
    if (!t || t.startsWith("#")) continue;
    const i = t.indexOf("=");
    if (i <= 0) continue;
    const key = t.slice(0, i).trim();
    let val = t.slice(i + 1).trim();
    if ((val.startsWith('"') && val.endsWith('"')) || (val.startsWith("'") && val.endsWith("'"))) {
      val = val.slice(1, -1);
    }
    if (!process.env[key]) process.env[key] = val;
  }
}

loadDotEnv(".env");

const base = process.env.TRANSFERCRM_BASE_URL?.replace(/\/+$/, "");
const mode = (process.env.TRANSFERCRM_AUTH_MODE || "bearer").toLowerCase();
const bearerToken = process.env.TRANSFERCRM_BEARER_TOKEN?.trim();
const apiKey = process.env.TRANSFERCRM_API_KEY?.trim();
const token = mode === "x_api_key" ? apiKey : bearerToken;

if (!base) {
  console.error("Missing TRANSFERCRM_BASE_URL in .env");
  process.exit(1);
}
if (!token) {
  console.error(`Missing token for mode=${mode}. Check TRANSFERCRM_BEARER_TOKEN / TRANSFERCRM_API_KEY in .env`);
  process.exit(1);
}

const headers = {
  "Content-Type": "application/json",
  ...(mode === "x_api_key" ? { "X-API-Key": token } : { Authorization: `Bearer ${token}` }),
};

const body = {
  pickup_location: "Avenida da Liberdade, Lisboa",
  dropoff_location: "Aeroporto Humberto Delgado, Lisboa",
  pickup_date: "2026-04-23T14:30:00.000Z",
  passengers: 4,
  distance_km: 8.5,
  vehicle_type: "van",
};

const res = await fetch(`${base}/v2/quote`, {
  method: "POST",
  headers,
  body: JSON.stringify(body),
});

const text = await res.text();
console.log("status:", res.status);
try {
  console.log(JSON.stringify(JSON.parse(text), null, 2));
} catch {
  console.log(text);
}