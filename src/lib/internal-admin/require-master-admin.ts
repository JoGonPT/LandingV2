import { cookies } from "next/headers";

import {
  getMasterAdminSessionSecret,
  MASTER_ADMIN_SESSION_COOKIE,
  verifyMasterAdminSession,
} from "@/lib/internal-admin/session";

export class MasterAdminAuthError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "MasterAdminAuthError";
  }
}

export async function requireMasterAdminSession(): Promise<void> {
  const secret = getMasterAdminSessionSecret();
  const jar = await cookies();
  const token = jar.get(MASTER_ADMIN_SESSION_COOKIE)?.value;
  if (!verifyMasterAdminSession(secret, token)) {
    throw new MasterAdminAuthError("unauthorized");
  }
}
