import { withApiErrors } from "@/lib/api/http-error";
import { createPublicQuote } from "@/lib/booking/public-booking.service";

/** Cotação pública. Era um proxy para a app NestJS; passou a nativo. */
export async function POST(request: Request) {
  return withApiErrors(async () => createPublicQuote(await request.json()), {
    route: "public/quote",
  });
}
