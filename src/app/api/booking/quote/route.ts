import { NextResponse } from "next/server";
import { postQuoteForBooking, toPublicError } from "@/lib/transfercrm/client";
import { validateBookingPayload } from "@/lib/transfercrm/validation";
import type { BookingApiError } from "@/lib/transfercrm/types";
import { firstTransferCrmValidationMessage } from "@/lib/transfercrm/validation-errors";

function createRequestId(): string {
  return `${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;
}

function asError(message: string, requestId: string, code = "VALIDATION_ERROR"): BookingApiError {
  return { success: false, code, message, requestId };
}

export async function POST(request: Request) {
  const requestId = createRequestId();

  try {
    const body = (await request.json()) as { payload?: unknown; vehicleType?: string };
    const validated = validateBookingPayload(body.payload);
    if (!validated.ok) {
      return NextResponse.json(asError(validated.message, requestId), { status: 400 });
    }

    const quote = await postQuoteForBooking(validated.data, body.vehicleType);
    return NextResponse.json({ success: true as const, data: quote }, { status: 200 });
  } catch (error) {
    const publicError = toPublicError(error);
    const details = publicError.details as Record<string, string[]> | undefined;
    const friendly =
      publicError.code === "CRM_VALIDATION_ERROR"
        ? firstTransferCrmValidationMessage(details) || publicError.message
        : publicError.message;
    console.error("[booking-quote]", { requestId, code: publicError.code, message: publicError.message });
    const status = publicError.code === "CRM_VALIDATION_ERROR" ? 422 : 502;
    return NextResponse.json(
      { ...asError(friendly, requestId, publicError.code), details: publicError.details },
      { status },
    );
  }
}
