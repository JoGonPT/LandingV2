import { NextResponse } from "next/server";
import { submitBooking, toPublicError } from "@/lib/transfercrm/client";
import { firstTransferCrmValidationMessage } from "@/lib/transfercrm/validation-errors";
import { validateBookingPayload } from "@/lib/transfercrm/validation";
import { BookingApiError, BookingApiSuccess } from "@/lib/transfercrm/types";

function createRequestId(): string {
  return `${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;
}

function asError(message: string, requestId: string, code = "VALIDATION_ERROR"): BookingApiError {
  return { success: false, code, message, requestId };
}

export async function POST(request: Request) {
  const requestId = createRequestId();

  try {
    const payload = await request.json();
    const validated = validateBookingPayload(payload);
    if (!validated.ok) {
      return NextResponse.json(asError(validated.message, requestId), { status: 400 });
    }

    const booking = validated.data;
    const data = await submitBooking(booking);

    const response: BookingApiSuccess = {
      success: true,
      orderId: data.bookingId,
      orderReference: data.orderNumber,
      trackingUrl: data.trackingUrl,
      status: data.status,
    };

    return NextResponse.json(response, { status: 201 });
  } catch (error) {
    const publicError = toPublicError(error);
    const details = publicError.details as Record<string, string[]> | undefined;
    const friendly =
      publicError.code === "CRM_VALIDATION_ERROR"
        ? firstTransferCrmValidationMessage(details) || publicError.message
        : publicError.message;
    console.error("[booking-api]", { requestId, code: publicError.code, message: publicError.message, details: publicError.details });
    const status = publicError.code === "CRM_VALIDATION_ERROR" ? 422 : 502;
    return NextResponse.json(
      { ...asError(friendly, requestId, publicError.code), details: publicError.details },
      { status },
    );
  }
}
