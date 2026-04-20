import { PricingService } from "./pricing.service";
export declare class PublicQuoteController {
    private readonly pricing;
    private readonly log;
    constructor(pricing: PricingService);
    quote(body: {
        payload?: unknown;
        vehicleType?: string;
    }): Promise<{
        success: true;
        data: import("@/lib/transfercrm/openapi.types").QuoteResponse;
    }>;
}
