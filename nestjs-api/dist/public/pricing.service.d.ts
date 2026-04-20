import type { BookingPayload } from "@/lib/transfercrm/types";
import type { QuoteResponse } from "@/lib/transfercrm/openapi.types";
import { MapService } from "./map.service";
export declare class PricingService {
    private readonly _mapService;
    constructor(_mapService: MapService);
    quoteForBooking(payload: BookingPayload, vehicleType?: string): Promise<QuoteResponse>;
}
