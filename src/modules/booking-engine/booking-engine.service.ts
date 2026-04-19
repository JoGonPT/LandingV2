import type {
  BookingCreateResult,
  BookingQuoteResult,
  BookingVehiclesResult,
  IBookingProvider,
} from "@/modules/booking-engine/ports/booking-provider.port";
import { TransferCrmProvider } from "@/modules/booking-engine/providers/transfer-crm.provider";
import type { BookingPayload } from "@/lib/transfercrm/types";

export class BookingEngineService {
  constructor(private readonly provider: IBookingProvider) {}

  quote(payload: BookingPayload, vehicleType?: string): Promise<BookingQuoteResult> {
    return this.provider.quote({ payload, vehicleType });
  }

  getVehicleOptions(payload: BookingPayload): Promise<BookingVehiclesResult> {
    return this.provider.getVehicleOptions({ payload });
  }

  create(payload: BookingPayload): Promise<BookingCreateResult> {
    return this.provider.create({ payload });
  }

  getById(bookingId: string): Promise<unknown> {
    return this.provider.getById({ bookingId });
  }
}

let defaultService: BookingEngineService | null = null;

export function getBookingEngineService(provider?: IBookingProvider): BookingEngineService {
  if (provider) {
    return new BookingEngineService(provider);
  }
  if (!defaultService) {
    defaultService = new BookingEngineService(new TransferCrmProvider());
  }
  return defaultService;
}

