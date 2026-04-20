import { NextResponse } from "next/server";
import { getTransferCrmApiClient, getVehicleOptions, postQuoteForBooking, toPublicError } from "@/lib/transfercrm/client";
import { resolveBookingPayloadDistance } from "@/lib/transfercrm/ensure-distance-km";
import { validateBookingPayload } from "@/lib/transfercrm/validation";
import { firstTransferCrmValidationMessage } from "@/lib/transfercrm/validation-errors";

function createRequestId(): string {
  return `${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;
}

export async function POST(request: Request) {
  const requestId = createRequestId();
  try {
    const body = (await request.json()) as { payload?: unknown };
    const validated = validateBookingPayload(body.payload, { requireContact: false, requireGdpr: false });
    if (!validated.ok) {
      return NextResponse.json(
        { success: false as const, code: "VALIDATION_ERROR", message: validated.message, requestId },
        { status: 400 },
      );
    }

    const crm = getTransferCrmApiClient();
    const ready = await resolveBookingPayloadDistance(validated.data, crm);
    const result = await getVehicleOptions(ready);

    // Strict: only keep vehicles successfully quoted by TransferCRM pricing rules.
    const quotedVehiclesRaw = await Promise.all(
      result.vehicleOptions.map(async (v) => {
        try {
          const quote = await postQuoteForBooking(ready, v.vehicleType);
          const quotedPrice = Number(quote.price);
          const quotedCurrency = quote.currency?.trim();
          if (Number.isFinite(quotedPrice) && quotedCurrency) {
            return {
              ...v,
              estimatedPrice: quotedPrice,
              currency: quotedCurrency.toUpperCase(),
            };
          }
          return null;
        } catch {
          return null;
        }
      }),
    );
    const quotedVehicles = quotedVehiclesRaw.filter((v): v is NonNullable<typeof v> => v !== null);
    if (result.vehicleOptions.length > 0 && quotedVehicles.length === 0) {
      return NextResponse.json(
        {
          success: false as const,
          code: "CRM_QUOTE_UNAVAILABLE",
          message:
            "Could not calculate TransferCRM prices for available vehicles. Please verify pricing rules/vehicle setup in TransferCRM.",
          requestId,
        },
        { status: 422 },
      );
    }

    return NextResponse.json(
      {
        success: true as const,
        requestId,
        available: result.available,
        vehicles: quotedVehicles,
        pickupLocation: result.pickupLocation,
        dropoffLocation: result.dropoffLocation,
        pickupDate: result.pickupDate,
      },
      { status: 200 },
    );
  } catch (error) {
    const publicError = toPublicError(error);
    const details = publicError.details as Record<string, string[]> | undefined;
    const friendly =
      publicError.code === "CRM_VALIDATION_ERROR"
        ? firstTransferCrmValidationMessage(details) || publicError.message
        : publicError.message;
    console.error("[booking-vehicles]", { requestId, code: publicError.code, message: publicError.message });
    const status = publicError.code === "CRM_VALIDATION_ERROR" ? 422 : 502;
    return NextResponse.json(
      { success: false as const, code: publicError.code, message: friendly, requestId, details: publicError.details },
      { status },
    );
  }
}
