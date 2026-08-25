import { NextResponse } from "next/server";
import { z } from "zod";

import { MasterAdminAuthError, requireMasterAdminSession } from "@/lib/internal-admin/require-master-admin";
import { clientKey, rateLimit } from "@/lib/rate-limit";
import { EMERGENCY_STOP_CONFIRMATION, applyEmergencyStop } from "@/lib/site-settings/audit";

const Body = z.object({
    confirmationTyped: z.string().max(400),
    actorLabel: z.string().max(80).optional(),
});

export async function POST(request: Request) {
    try {
        await requireMasterAdminSession();
    } catch (error) {
        if (error instanceof MasterAdminAuthError) {
            return NextResponse.json({ ok: false, message: "Sessão inválida." }, { status: 401 });
        }
        throw error;
    }

    // Limite mais folgado do que o das alterações normais: numa emergência, a
    // pessoa pode carregar duas vezes por nervosismo e não deve ser travada.
    const limit = rateLimit(`settings-emergency:${clientKey(request)}`, 10, 60_000);
    if (!limit.allowed) {
        return NextResponse.json(
            { ok: false, message: "Demasiadas tentativas seguidas." },
            { status: 429, headers: { "Retry-After": String(limit.retryAfterSeconds ?? 60) } },
        );
    }

    let body: z.infer<typeof Body>;
    try {
        body = Body.parse(await request.json());
    } catch {
        return NextResponse.json({ ok: false, message: "Pedido inválido." }, { status: 400 });
    }

    const result = await applyEmergencyStop({
        confirmationTyped: body.confirmationTyped,
        actorLabel: body.actorLabel?.trim() || null,
        ip: clientKey(request),
        userAgent: request.headers.get("user-agent"),
    });

    if (!result.ok) {
        return NextResponse.json({ ok: false, message: result.message }, { status: 400 });
    }
    return NextResponse.json({ ok: true as const, changed: result.changed, confirmation: EMERGENCY_STOP_CONFIRMATION });
}
