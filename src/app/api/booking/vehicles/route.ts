import { NextResponse } from "next/server";
import { getVehicleOptions, toPublicError } from "@/lib/transfercrm/client";
import { validateBookingPayload } from "@/lib/transfercrm/validation";
import { firstTransferCrmValidationMessage } from "@/lib/transfercrm/validation-errors";

function createRequestId(): string {
  return `${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;
}

export async function POST(request: Request) {
  const requestId = createRequestId();
  try {
    const body = (await request.json()) as { payload?: unknown };
    const validated = validateBookingPayload(body.payload);
    if (!validated.ok) {
      return NextResponse.json(
        { success: false as const, code: "VALIDATION_ERROR", message: validated.message, requestId },
        { status: 400 },
      );
    }

    const result = await getVehicleOptions(validated.data);
    return NextResponse.json(
      {
        success: true as const,
        requestId,
        available: result.available,
        vehicles: result.vehicleOptions,
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
