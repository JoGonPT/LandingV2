import { BookingPayload } from "@/lib/transfercrm/types";
export declare function validateBookingPayload(payload: unknown, options?: {
    requireContact?: boolean;
    requireGdpr?: boolean;
}): {
    ok: true;
    data: BookingPayload;
} | {
    ok: false;
    message: string;
};
