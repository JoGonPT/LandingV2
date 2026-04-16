import { createHmac, timingSafeEqual } from "crypto";

export const DRIVER_SESSION_COOKIE = "w2g_driver_sess";

const SEP = ".";

export function signDriverSession(secret: string, maxAgeSec: number): string {
  const exp = Math.floor(Date.now() / 1000) + maxAgeSec;
  const payload = Buffer.from(JSON.stringify({ exp, v: 1 }), "utf8").toString("base64url");
  const sig = createHmac("sha256", secret).update(payload).digest("base64url");
  return `${payload}${SEP}${sig}`;
}

export function verifyDriverSession(secret: string, token: string): boolean {
  const i = token.lastIndexOf(SEP);
  if (i <= 0) return false;
  const payload = token.slice(0, i);
  const sig = token.slice(i + 1);
  const expected = createHmac("sha256", secret).update(payload).digest("base64url");
  try {
    const sigBuf = Buffer.from(sig, "utf8");
    const expBuf = Buffer.from(expected, "utf8");
    if (sigBuf.length !== expBuf.length || !timingSafeEqual(sigBuf, expBuf)) return false;
  } catch {
    return false;
  }
  let json: { exp?: number };
  try {
    json = JSON.parse(Buffer.from(payload, "base64url").toString("utf8")) as { exp?: number };
  } catch {
    return false;
  }
  if (typeof json.exp !== "number") return false;
  return json.exp >= Math.floor(Date.now() / 1000);
}
