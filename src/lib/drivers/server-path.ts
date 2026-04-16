import { headers } from "next/headers";

function isDriversHost(host: string): boolean {
  return host.split(":")[0]?.toLowerCase().startsWith("drivers.") ?? false;
}

export async function driverPublicHomePath(): Promise<string> {
  const h = await headers();
  return isDriversHost(h.get("host") ?? "") ? "/" : "/drivers-pwa/";
}

export async function driverPublicLoginPath(): Promise<string> {
  const h = await headers();
  return isDriversHost(h.get("host") ?? "") ? "/login/" : "/drivers-pwa/login/";
}
