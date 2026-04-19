import { describe, expect, it, vi } from "vitest";

import type { BookingOrderRow } from "@/modules/booking-engine/repositories/bookings.repo";
import { FiscalService, type IFiscalProvider } from "@/modules/booking-engine/services/fiscal.service";

function buildCompletedRow(): BookingOrderRow {
  return {
    id: "bo_completed_1",
    public_reference: "PUB-1",
    provider: "WAY2GO_NATIVE",
    provider_booking_id: "native_1",
    status: "COMPLETED",
    idempotency_key: "idem_1",
    failover_reason: null,
    request_payload: {
      route: {
        pickup: "Lisboa Oriente",
        dropoff: "Sintra",
      },
      contact: {
        fullName: "Cliente Fiscal",
        email: "cliente@fiscal.pt",
      },
    },
    provider_response: {
      price: "75.5",
      currency: "eur",
    },
    last_error_code: null,
    last_error_message: null,
    created_at: "2026-04-19T10:00:00.000Z",
    updated_at: "2026-04-19T10:30:00.000Z",
  };
}

describe("FiscalService", () => {
  it("maps completed booking into fiscal provider payload", async () => {
    const issueInvoice = vi.fn(async () => ({
      provider: "TEST_PROVIDER",
      invoiceNumber: "FT-1",
      issuedAtIso: "2026-04-19T10:40:00.000Z",
    }));
    const provider: IFiscalProvider = {
      name: "TEST_PROVIDER",
      issueInvoice,
    };
    const service = new FiscalService(provider);

    await service.issueInvoiceForCompletedBooking(buildCompletedRow());

    expect(issueInvoice).toHaveBeenCalledTimes(1);
    expect(issueInvoice).toHaveBeenCalledWith(
      expect.objectContaining({
        bookingId: "bo_completed_1",
        externalReference: "PUB-1",
        customerName: "Cliente Fiscal",
        customerEmail: "cliente@fiscal.pt",
        amount: 75.5,
        currency: "EUR",
        pickup: "Lisboa Oriente",
        dropoff: "Sintra",
      }),
    );
  });

  it("does not issue invoice when booking is not completed", async () => {
    const issueInvoice = vi.fn();
    const provider: IFiscalProvider = {
      name: "TEST_PROVIDER",
      issueInvoice,
    };
    const service = new FiscalService(provider);
    const row = buildCompletedRow();
    row.status = "CONFIRMED";

    const result = await service.issueInvoiceForCompletedBooking(row);

    expect(result).toBeNull();
    expect(issueInvoice).not.toHaveBeenCalled();
  });
});
