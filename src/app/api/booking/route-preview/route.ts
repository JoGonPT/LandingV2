import { NextResponse } from "next/server";
import { z } from "zod";

import { estimateRouteDistanceKm } from "@/lib/routing/estimate-route-distance-km";
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

async function quoteMinAvailableVehiclePrice(args: {
  crm: ReturnType<typeof getTransferCrmApiClient>;
  pickup: string;
  dropoff: string;
  pickupDate: string;
  passengers: number;
  distanceKm?: number;
}): Promise<{ price: number; currency: string; vehicleType: string } | null> {
  const avail = await args.crm.getAvailability({
    pickup_location: args.pickup,
    dropoff_location: args.dropoff,
    pickup_date: args.pickupDate,
    passengers: args.passengers,
    ...(typeof args.distanceKm === "number" && Number.isFinite(args.distanceKm) && args.distanceKm > 0
      ? { distance_km: args.distanceKm }
      : {}),
  });
  const vehicleTypes = (avail.vehicle_types ?? [])
    .map((v) => v.vehicle_type?.trim() ?? "")
    .filter((v): v is string => Boolean(v));
  if (!vehicleTypes.length) return null;

  const quoted = await Promise.all(
    vehicleTypes.map(async (vehicleType) => {
      try {
        const q = await args.crm.postQuote({
          pickup_location: args.pickup,
          dropoff_location: args.dropoff,
          pickup_date: args.pickupDate,
          passengers: args.passengers,
          vehicle_type: vehicleType,
          ...(typeof args.distanceKm === "number" && Number.isFinite(args.distanceKm) && args.distanceKm > 0
            ? { distance_km: args.distanceKm }
            : {}),
        });
        const price = Number(q.price);
        const currency = q.currency?.trim() ?? "";
        if (!Number.isFinite(price) || !currency) return null;
        return { price, currency, vehicleType };
      } catch {
        return null;
      }
    }),
  );
  const valid = quoted.filter((q): q is NonNullable<typeof q> => q !== null);
  if (!valid.length) return null;
  valid.sort((a, b) => a.price - b.price);
  return valid[0];
}

function isDistanceRequiredError(error: unknown): boolean {
  const pub = toPublicError(error);
  if (pub.code !== "CRM_VALIDATION_ERROR") return false;
  const message = `${pub.message ?? ""}`.toLowerCase();
  const detailsText = JSON.stringify(pub.details ?? {}).toLowerCase();
  return (
    message.includes("distance") ||
    message.includes("distance_km") ||
    detailsText.includes("distance") ||
    detailsText.includes("distance_km")
  );
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

    let quoteErr: unknown;
    try {
      const quote = await crm.postQuote({
        pickup_location: pickup.trim(),
        dropoff_location: dropoff.trim(),
        pickup_date,
        passengers,
      });
      if (quote.vehicle_type == null) {
        const minQuoted = await quoteMinAvailableVehiclePrice({
          crm,
          pickup: pickup.trim(),
          dropoff: dropoff.trim(),
          pickupDate: pickup_date,
          passengers,
          distanceKm: quote.distance_km != null && Number.isFinite(Number(quote.distance_km)) ? Number(quote.distance_km) : undefined,
        });
        if (minQuoted) {
          return NextResponse.json({
            success: true as const,
            requestId,
            source: "availability" as const,
            distanceKm: quote.distance_km ?? null,
            price: minQuoted.price,
            currency: minQuoted.currency.toUpperCase(),
            vehicleType: minQuoted.vehicleType,
          });
        }
      }
      return NextResponse.json({
        success: true as const,
        requestId,
        source: "quote" as const,
        distanceKm: quote.distance_km ?? null,
        price: quote.price ?? null,
        currency: quote.currency?.trim() ?? null,
        vehicleType: quote.vehicle_type ?? null,
      });
    } catch (e) {
      quoteErr = e;
    }

    const estKm = await estimateRouteDistanceKm(pickup.trim(), dropoff.trim());
    if ((estKm == null || estKm <= 0) && isDistanceRequiredError(quoteErr)) {
      console.warn("[booking-route-preview][distance-required]", {
        requestId,
        pickup: pickup.trim(),
        dropoff: dropoff.trim(),
        quoteError: quoteErr instanceof Error ? quoteErr.message : String(quoteErr),
      });
      return NextResponse.json(
        {
          success: false as const,
          code: "DISTANCE_REQUIRED",
          message: "Could not resolve trip distance (distance_km). Please refine pickup/dropoff and try again.",
          requestId,
        },
        { status: 422 },
      );
    }
    if (estKm != null && estKm > 0) {
      try {
        const minQuoted = await quoteMinAvailableVehiclePrice({
          crm,
          pickup: pickup.trim(),
          dropoff: dropoff.trim(),
          pickupDate: pickup_date,
          passengers,
          distanceKm: estKm,
        });
        if (minQuoted) {
          return NextResponse.json({
            success: true as const,
            requestId,
            source: "availability" as const,
            distanceKm: estKm,
            price: minQuoted.price,
            currency: minQuoted.currency.toUpperCase(),
            vehicleType: minQuoted.vehicleType,
          });
        }
        const quote = await crm.postQuote({
          pickup_location: pickup.trim(),
          dropoff_location: dropoff.trim(),
          pickup_date,
          passengers,
          distance_km: estKm,
        });
        return NextResponse.json({
          success: true as const,
          requestId,
          source: "quote" as const,
          distanceKm: quote.distance_km ?? estKm,
          price: quote.price ?? null,
          currency: quote.currency?.trim() ?? null,
          vehicleType: quote.vehicle_type ?? null,
        });
      } catch {
        // fall through to availability
      }
    }

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
        distanceKm: estKm,
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
  } catch (e) {
    console.error("[booking-route-preview]", requestId, e);
    return NextResponse.json(
      { success: false as const, code: "UNKNOWN_ERROR", message: "Preview failed.", requestId },
      { status: 500 },
    );
  }
}
