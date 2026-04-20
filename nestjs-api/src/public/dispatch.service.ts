import { Injectable, Logger } from "@nestjs/common";

import { createDriverAssignmentUpsertFromEnv } from "@/lib/booking/public-bookings-store";

@Injectable()
export class DispatchService {
  private readonly log = new Logger(DispatchService.name);
  private readonly upsert = createDriverAssignmentUpsertFromEnv();

  /** Best-effort: assign first configured driver_key as candidate (table allows one row per CRM booking). */
  async assignCandidates(crmBookingId: string): Promise<void> {
    if (!crmBookingId.trim()) return;
    const raw = process.env.PUBLIC_BOOK_DISPATCH_DRIVER_KEYS?.trim();
    if (!raw) return;
    const keys = raw
      .split(",")
      .map((s) => s.trim())
      .filter(Boolean);
    if (!keys.length) return;

    if (!this.upsert) {
      this.log.warn("Supabase not configured; skip driver_booking_assignments");
      return;
    }

    const driverKey = keys[0];
    try {
      await this.upsert(crmBookingId.trim(), driverKey);
      this.log.log(`dispatch assigned driver_key=${driverKey} booking=${crmBookingId}`);
    } catch (e) {
      this.log.warn(`dispatch failed booking=${crmBookingId} err=${e instanceof Error ? e.message : String(e)}`);
    }
  }

  /**
   * Optional inbound hook when TransferCRM signals a dispatch event (new assignment, reassign, etc.).
   * Extend with push/SMS; for now logs a safe summary. If `TRANSFERCRM_DISPATCH_WEBHOOK_SECRET` is set,
   * require `X-TransferCRM-Signature` to be present (verification can be tightened later).
   */
  recordCrmDispatchSignal(body: unknown, signatureHeader?: string): { ok: boolean; message?: string } {
    const secret = process.env.TRANSFERCRM_DISPATCH_WEBHOOK_SECRET?.trim();
    if (secret && secret.length >= 8 && !signatureHeader?.trim()) {
      return { ok: false, message: "Missing X-TransferCRM-Signature." };
    }
    const o = body && typeof body === "object" && body !== null ? (body as Record<string, unknown>) : {};
    const bid = o.booking_id ?? o.bookingId ?? o.transfercrm_booking_id;
    this.log.log(`CRM dispatch signal booking=${bid != null ? String(bid) : "unknown"}`);
    return { ok: true };
  }
}
