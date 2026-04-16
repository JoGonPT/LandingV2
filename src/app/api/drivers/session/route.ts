import { NextResponse } from "next/server";

import { isDriverAuthenticated } from "@/lib/drivers/require-session";

export async function GET() {
  const authenticated = await isDriverAuthenticated();
  return NextResponse.json({ authenticated });
}
