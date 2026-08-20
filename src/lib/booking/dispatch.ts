import { createDriverAssignmentUpsertFromEnv } from "@/lib/booking/public-bookings-store";

/**
 * Atribuição de motorista candidato a uma reserva do CRM.
 *
 * Best-effort de propósito: uma falha aqui **não** deve derrubar a reserva, que
 * já está criada e paga. Regista e segue.
 *
 * Do `DispatchService` original só sobreviveu esta função. O
 * `recordCrmDispatchSignal` foi eliminado com o webhook `/api/webhooks/dispatch`
 * que o chamava — esse endpoint só existia na aplicação NestJS, que nunca
 * esteve acessível, pelo que nenhum sistema externo lhe podia chamar.
 */
export async function assignDriverCandidates(crmBookingId: string): Promise<void> {
    if (!crmBookingId.trim()) return;

    const raw = process.env.PUBLIC_BOOK_DISPATCH_DRIVER_KEYS?.trim();
    if (!raw) return;

    const keys = raw
        .split(",")
        .map((s) => s.trim())
        .filter(Boolean);
    if (!keys.length) return;

    const upsert = createDriverAssignmentUpsertFromEnv();
    if (!upsert) {
        console.warn("[dispatch] Supabase não configurado; driver_booking_assignments ignorado.");
        return;
    }

    // A tabela aceita uma linha por reserva do CRM, daí só o primeiro.
    const driverKey = keys[0];
    try {
        await upsert(crmBookingId.trim(), driverKey);
        console.log(`[dispatch] atribuído driver_key=${driverKey} booking=${crmBookingId}`);
    } catch (error) {
        console.warn(
            `[dispatch] falhou booking=${crmBookingId}:`,
            error instanceof Error ? error.message : String(error),
        );
    }
}
