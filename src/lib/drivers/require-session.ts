import { cookies } from "next/headers";

import { getDriverPortalConfig } from "@/lib/drivers/config";
import { DRIVER_SESSION_COOKIE, verifyDriverSession } from "@/lib/drivers/session";

export async function isDriverAuthenticated(): Promise<boolean> {
  try {
    const cfg = getDriverPortalConfig();
    const jar = await cookies();
    const token = jar.get(DRIVER_SESSION_COOKIE)?.value;
    return Boolean(token && verifyDriverSession(cfg.sessionSecret, token));
  } catch {
    return false;
  }
}

export async function requireDriverSessionCookie(): Promise<void> {
  let cfg;
  try {
    cfg = getDriverPortalConfig();
  } catch {
    throw new Error("unauthorized");
  }
  const jar = await cookies();
  const token = jar.get(DRIVER_SESSION_COOKIE)?.value;
  if (!token || !verifyDriverSession(cfg.sessionSecret, token)) {
    throw new Error("unauthorized");
  }
}
