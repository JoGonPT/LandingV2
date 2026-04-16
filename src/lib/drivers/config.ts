export interface DriverPortalConfig {
  loginEmail: string;
  loginPassword: string;
  sessionSecret: string;
  sessionMaxAgeSec: number;
}

export function getDriverPortalConfig(): DriverPortalConfig {
  const loginEmail = process.env.DRIVER_LOGIN_EMAIL?.trim().toLowerCase();
  const loginPassword = process.env.DRIVER_LOGIN_PASSWORD ?? "";
  const sessionSecret = process.env.DRIVER_SESSION_SECRET?.trim() ?? "";
  const sessionMaxAgeSec = Number(process.env.DRIVER_SESSION_MAX_AGE_SEC ?? 60 * 60 * 24 * 7);

  if (!loginEmail) {
    throw new Error("DRIVER_LOGIN_EMAIL is not set.");
  }
  if (!loginPassword) {
    throw new Error("DRIVER_LOGIN_PASSWORD is not set.");
  }
  if (sessionSecret.length < 16) {
    throw new Error("DRIVER_SESSION_SECRET must be at least 16 characters.");
  }

  return {
    loginEmail,
    loginPassword,
    sessionSecret,
    sessionMaxAgeSec: Number.isFinite(sessionMaxAgeSec) && sessionMaxAgeSec > 0 ? sessionMaxAgeSec : 60 * 60 * 24 * 7,
  };
}
