import { NextResponse } from "next/server";
import { z } from "zod";

import { MasterAdminAuthError, requireMasterAdminSession } from "@/lib/internal-admin/require-master-admin";
import { VendusFiscalProvider } from "@/modules/booking-engine/providers/fiscal/vendus.provider";
import type { FiscalIssueInvoiceInput } from "@/modules/booking-engine/services/fiscal.service";

/** Mirrors {@link FiscalIssueInvoiceInput} for request validation. */
const BodySchema = z.object({
  bookingId: z.string().min(1),
  provider: z.enum(["TRANSFER_CRM", "WAY2GO_NATIVE"]),
  externalReference: z.string().min(1),
  customerName: z.string().min(1),
  customerEmail: z.string().min(1),
  amount: z.number().finite().nonnegative(),
  currency: z.string().min(1),
  pickup: z.string().min(1),
  dropoff: z.string().min(1),
  issuedAtIso: z.string().min(1),
});

/**
 * Emits a fiscal document via Vendus (`VENDUS_MODE`, `VENDUS_API_KEY`, `VENDUS_BASE_URL`).
 * Requires master-admin session (same as `/api/master-admin/*`).
 */
export async function POST(req: Request) {
  try {
    await requireMasterAdminSession();
  } catch (e) {
    if (e instanceof MasterAdminAuthError) {
      return NextResponse.json({ ok: false, message: "Unauthorized." }, { status: 401 });
    }
    throw e;
  }

  let parsed: FiscalIssueInvoiceInput;
  try {
    parsed = BodySchema.parse(await req.json());
  } catch {
    return NextResponse.json({ ok: false, message: "Invalid body." }, { status: 400 });
  }

  try {
    const provider = new VendusFiscalProvider();
    const result = await provider.issueInvoice(parsed);
    return NextResponse.json({ ok: true, result });
  } catch (e) {
    const message = e instanceof Error ? e.message : String(e);
    console.error("[api/faturamento/issue]", message);
    return NextResponse.json({ ok: false, message }, { status: 502 });
  }
}
