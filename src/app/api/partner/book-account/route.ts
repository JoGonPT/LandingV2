import { withApiErrors } from "@/lib/api/http-error";
import { partnerBookAccount } from "@/lib/partner/partner-portal.service";

/** Reserva por conta-corrente do portal B2B. Consome crédito de forma atómica. */
export async function POST(request: Request) {
  return withApiErrors(
    async () => partnerBookAccount(await request.json(), request.headers.get("cookie") ?? undefined),
    { route: "partner/book-account", successStatus: 201 },
  );
}
