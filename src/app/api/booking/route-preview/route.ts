import { NextResponse } from "next/server";
import { z } from "zod";

import { toIsoDateTimeUtc } from "@/lib/transfercrm/booking-mappers";
import { getTransferCrmApiClient, toPublicError } from "@/lib/transfercrm/client";
import { firstTransferCrmValidationMessage } from "@/lib/transfercrm/validation-errors";

const BodySchema = z.object({
  pickup: z.string().min(1).max(500),
  dropoff: z.string().min(1).max(500),
  date: z.string().min(1),
  time: z.string().min(1),
  passengers: z.coerce.number().int().min(1).max(50),
});

function createRequestId(): string {
  return `${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;
}

export async function POST(request: Request) {
  const requestId = createRequestId();
  try {
    const parsed = BodySchema.safeParse(await request.json());
    if (!parsed.success) {
      return NextResponse.json(
        { success: false as const, code: "VALIDATION_ERROR", message: "Invalid preview request.", requestId },
        { status: 400 },
      );
    }

    const { pickup, dropoff, date, time, passengers } = parsed.data;
    const pickup_date = toIsoDateTimeUtc(date, time);
    const crm = getTransferCrmApiClient();

    try {
      const quote = await crm.postQuote({
        pickup_location: pickup.trim(),
        dropoff_location: dropoff.trim(),
        pickup_date,
        passengers,
      });
      return NextResponse.json({
        success: true as const,
        requestId,
        source: "quote" as const,
        distanceKm: quote.distance_km ?? null,
        price: quote.price ?? null,
        currency: quote.currency?.trim() ?? null,
        vehicleType: quote.vehicle_type ?? null,
      });
    } catch (quoteErr) {
      try {
        const avail = await crm.getAvailability({
          pickup_location: pickup.trim(),
          dropoff_location: dropoff.trim(),
          pickup_date,
          passengers,
        });
        const types = avail.vehicle_types ?? [];
        let minPrice: number | null = null;
        let currency: string | null = types[0]?.currency ?? null;
        for (const v of types) {
          if (v.estimated_price != null && typeof v.estimated_price === "number" && v.estimated_price > 0) {
            if (minPrice === null || v.estimated_price < minPrice) {
              minPrice = v.estimated_price;
              currency = v.currency ?? currency;
            }
          }
        }
        return NextResponse.json({
          success: true as const,
          requestId,
          source: "availability" as const,
          distanceKm: null,
          price: minPrice,
          currency: currency?.trim() ?? null,
          vehicleType: null,
        });
      } catch {
        const pub = toPublicError(quoteErr);
        const details = pub.details as Record<string, string[]> | undefined;
        const friendly =
          pub.code === "CRM_VALIDATION_ERROR"
            ? firstTransferCrmValidationMessage(details) || pub.message
            : pub.message;
        const status = pub.code === "CRM_VALIDATION_ERROR" ? 422 : 502;
        return NextResponse.json(
          { success: false as const, code: pub.code, message: friendly, requestId, details: pub.details },
          { status },
        );
      }
    }
  } catch (e) {
    console.error("[booking-route-preview]", requestId, e);
    return NextResponse.json(
      { success: false as const, code: "UNKNOWN_ERROR", message: "Preview failed.", requestId },
      { status: 500 },
    );
  }
}
