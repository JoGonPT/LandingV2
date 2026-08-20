import { withApiErrors } from "@/lib/api/http-error";
import { createPublicBooking } from "@/lib/booking/public-booking.service";

/**
 * Criação de reserva pública. Era um proxy para a app NestJS; passou a nativo.
 *
 * O `Idempotency-Key` é propagado de propósito: é o que impede que um duplo
 * clique ou um retry do cliente crie duas reservas.
 */
export async function POST(request: Request) {
  const idempotencyKey = request.headers.get("idempotency-key") ?? undefined;
  return withApiErrors(
    async () => createPublicBooking(await request.json(), idempotencyKey),
    { route: "public/book", successStatus: 201 },
  );
}
