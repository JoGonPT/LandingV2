import { NextResponse } from "next/server";
import { z } from "zod";

import { MasterAdminAuthError, requireMasterAdminSession } from "@/lib/internal-admin/require-master-admin";
import { clientKey, rateLimit } from "@/lib/rate-limit";
import { rotateAdminPassword } from "@/lib/site-settings/credentials";
import { checkPasswordStrength, generateStrongPassword } from "@/lib/site-settings/password";
import { ROTATE_PASSWORD_CONFIRMATION, confirmationMatches } from "@/lib/site-settings/registry";

const Body = z.object({
    password: z.string().min(1).max(200),
    confirmationTyped: z.string().max(400),
    actorLabel: z.string().max(80).optional(),
});

/** Sugere uma password nova. Não a guarda — só a mostra a quem a pediu. */
export async function GET() {
    try {
        await requireMasterAdminSession();
    } catch (error) {
        if (error instanceof MasterAdminAuthError) {
            return NextResponse.json({ ok: false, message: "Sessão inválida." }, { status: 401 });
        }
        throw error;
    }

    return NextResponse.json({
        ok: true as const,
        password: generateStrongPassword(),
        confirmation: ROTATE_PASSWORD_CONFIRMATION,
    });
}

export async function POST(request: Request) {
    try {
        await requireMasterAdminSession();
    } catch (error) {
        if (error instanceof MasterAdminAuthError) {
            return NextResponse.json({ ok: false, message: "Sessão inválida." }, { status: 401 });
        }
        throw error;
    }

    const limit = rateLimit(`settings-password:${clientKey(request)}`, 5, 60_000);
    if (!limit.allowed) {
        return NextResponse.json(
            { ok: false, message: "Demasiadas tentativas." },
            { status: 429, headers: { "Retry-After": String(limit.retryAfterSeconds ?? 60) } },
        );
    }

    let body: z.infer<typeof Body>;
    try {
        body = Body.parse(await request.json());
    } catch {
        return NextResponse.json({ ok: false, message: "Pedido inválido." }, { status: 400 });
    }

    if (!confirmationMatches(ROTATE_PASSWORD_CONFIRMATION, body.confirmationTyped)) {
        return NextResponse.json(
            { ok: false, code: "CONFIRMATION_MISMATCH", message: "A frase de confirmação não coincide." },
            { status: 400 },
        );
    }

    const strength = checkPasswordStrength(body.password);
    if (!strength.ok) {
        return NextResponse.json(
            { ok: false, code: "WEAK_PASSWORD", message: strength.problems.join(" ") },
            { status: 400 },
        );
    }

    const result = await rotateAdminPassword(body.password, body.actorLabel?.trim() || null);
    if (!result.ok) {
        return NextResponse.json({ ok: false, message: result.message }, { status: 503 });
    }

    // Nunca devolver a password, nem em confirmação. A partir daqui só existe
    // no ecrã de quem a acabou de definir.
    return NextResponse.json({ ok: true as const });
}
