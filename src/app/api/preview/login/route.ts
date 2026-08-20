import { NextResponse } from "next/server";
import { z } from "zod";

import {
    checkLoginAllowed,
    clearLoginFailures,
    registerLoginFailure,
} from "@/lib/login-throttle";
import { constantTimeEqualUtf8 } from "@/lib/partner/credentials";
import {
    getPreviewPassword,
    getPreviewSessionMaxAgeSec,
    getPreviewSessionSecret,
    PREVIEW_SESSION_COOKIE,
    signPreviewSession,
} from "@/lib/preview/session";
import { clientKey } from "@/lib/rate-limit";

const Body = z.object({ password: z.string().min(1).max(200) });

/**
 * Entrada na pré-visualização enquanto o site está em "Em breve".
 *
 * Leva a mesma trava de força bruta dos restantes logins: esta password fica
 * num ecrã público, e sem limite seria adivinhável à vontade.
 */
export async function POST(req: Request) {
    const throttleKey = `preview-login:${clientKey(req)}`;
    const throttle = checkLoginAllowed(throttleKey);
    if (!throttle.allowed) {
        return NextResponse.json(
            { ok: false, message: "Demasiadas tentativas. Tente daqui a alguns minutos." },
            { status: 429, headers: { "Retry-After": String(throttle.retryAfterSeconds) } },
        );
    }

    let secret: string;
    try {
        secret = getPreviewSessionSecret();
    } catch {
        return NextResponse.json(
            { ok: false, message: "Pré-visualização não configurada no servidor." },
            { status: 503 },
        );
    }

    const configured = getPreviewPassword();
    if (!configured) {
        return NextResponse.json(
            { ok: false, message: "SITE_PREVIEW_PASSWORD não está definida." },
            { status: 503 },
        );
    }

    let body: z.infer<typeof Body>;
    try {
        body = Body.parse(await req.json());
    } catch {
        return NextResponse.json({ ok: false, message: "Pedido inválido." }, { status: 400 });
    }

    if (!constantTimeEqualUtf8(body.password, configured)) {
        registerLoginFailure(throttleKey);
        return NextResponse.json({ ok: false, message: "Password incorreta." }, { status: 401 });
    }

    clearLoginFailures(throttleKey);

    const maxAge = getPreviewSessionMaxAgeSec();
    const res = NextResponse.json({ ok: true as const });
    res.cookies.set(PREVIEW_SESSION_COOKIE, await signPreviewSession(secret, maxAge), {
        httpOnly: true,
        sameSite: "lax",
        secure: process.env.NODE_ENV === "production",
        path: "/",
        maxAge,
    });
    return res;
}
