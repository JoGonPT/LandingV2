import { withApiErrors } from "@/lib/api/http-error";
import { partnerQuote } from "@/lib/partner/partner-portal.service";

/** Cotação do portal B2B. A sessão do parceiro vem no cookie. */
export async function POST(request: Request) {
  return withApiErrors(
    async () => partnerQuote(await request.json(), request.headers.get("cookie") ?? undefined),
    { route: "partner/quote" },
  );
}
