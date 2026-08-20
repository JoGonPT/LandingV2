import { NextResponse } from "next/server";

import { driverOwnsBookingRecord } from "@/lib/drivers/authorize-booking";
import { unwrapRecord } from "@/lib/drivers/booking-json";
import { getDriverTransferCrmIdForRequest } from "@/lib/drivers/config";
import { requireDriverSessionCookie } from "@/lib/drivers/require-session";
import { createTransferCrmClientFromEnv } from "@/lib/transfercrm/TransferCrmApiClient";
import { TransferCrmHttpError } from "@/lib/transfercrm/http-core";

/**
 * Detalhe de uma reserva, para a PWA de motoristas.
 *
 * Era a única rota de motoristas que ainda passava pelo proxy para a aplicação
 * NestJS — que nunca esteve acessível, pelo que o ecrã de detalhe estava
 * partido. Passa a nativa, seguindo o mesmo padrão de `driver/my-jobs`.
 */
export async function GET(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    await requireDriverSessionCookie();
  } catch {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const driverId = await getDriverTransferCrmIdForRequest();
  if (!driverId) {
    return NextResponse.json(
      {
        error:
          "Driver portal is not configured (set profiles.transfercrm_driver_id for this user or DRIVER_TRANSFERCRM_ID).",
        code: "DRIVER_NOT_CONFIGURED",
      },
      { status: 503 },
    );
  }

  const { id } = await params;
  if (!id || !/^\d+$/.test(id)) {
    return NextResponse.json({ error: "Invalid booking id." }, { status: 400 });
  }

  try {
    const client = createTransferCrmClientFromEnv();
    const data = unwrapRecord(await client.getBooking(id));

    // Existir e pertencer a outro motorista devolvem a mesma resposta de
    // propósito: um 403 distinto revelaria que a reserva existe.
    if (!data || !(await driverOwnsBookingRecord(data, driverId))) {
      return NextResponse.json({ error: "Not found." }, { status: 404 });
    }

    return NextResponse.json({ data });
  } catch (error) {
    if (error instanceof TransferCrmHttpError) {
      return NextResponse.json(
        { error: error.message, details: error.body },
        { status: error.status },
      );
    }
    console.error(
      "[drivers/bookings/id] Erro ao obter a reserva:",
      error instanceof Error ? error.message : String(error),
    );
    return NextResponse.json({ error: "Erro interno." }, { status: 500 });
  }
}
