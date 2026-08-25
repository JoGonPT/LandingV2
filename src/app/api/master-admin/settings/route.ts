import { NextResponse } from "next/server";
import { z } from "zod";

import { MasterAdminAuthError, requireMasterAdminSession } from "@/lib/internal-admin/require-master-admin";
import { clientKey, rateLimit } from "@/lib/rate-limit";
import { applySettingChange } from "@/lib/site-settings/audit";
import { hasDatabasePassword } from "@/lib/site-settings/credentials";
import { getSettingsSnapshot } from "@/lib/site-settings/resolve";
import { getConn, readRecentAudit } from "@/lib/site-settings/store";

const Body = z.object({
    key: z.string().min(1).max(120),
    value: z.string().min(1).max(120),
    confirmationTyped: z.string().max(400).default(""),
    actorLabel: z.string().max(80).optional(),
});

function unauthorised(error: unknown) {
    if (error instanceof MasterAdminAuthError) {
        return NextResponse.json({ ok: false, message: "Sessão inválida." }, { status: 401 });
    }
    return null;
}

export async function GET() {
    try {
        await requireMasterAdminSession();
    } catch (error) {
        const res = unauthorised(error);
        if (res) return res;
        throw error;
    }

    const snapshot = await getSettingsSnapshot();

    // A auditoria é acessória: se falhar, o painel continua a mostrar o estado.
    let audit: Awaited<ReturnType<typeof readRecentAudit>> = [];
    const conn = getConn();
    if (conn) {
        try {
            audit = await readRecentAudit(conn, 15);
        } catch {
            audit = [];
        }
    }

    return NextResponse.json({
        ok: true as const,
        degraded: snapshot.degraded,
        degradedReason: snapshot.degradedReason,
        passwordInDatabase: await hasDatabasePassword(),
        settings: snapshot.settings.map((s) => ({
            key: s.definition.key,
            label: s.definition.label,
            description: s.definition.description,
            critical: s.definition.critical,
            envVar: s.definition.envVar,
            value: s.value,
            source: s.source,
            databaseValue: s.databaseValue,
            environmentValue: s.environmentValue,
            options: s.definition.options,
        })),
        audit,
    });
}

export async function POST(request: Request) {
    try {
        await requireMasterAdminSession();
    } catch (error) {
        const res = unauthorised(error);
        if (res) return res;
        throw error;
    }

    const limit = rateLimit(`settings-write:${clientKey(request)}`, 20, 60_000);
    if (!limit.allowed) {
        return NextResponse.json(
            { ok: false, message: "Demasiadas alterações seguidas." },
            { status: 429, headers: { "Retry-After": String(limit.retryAfterSeconds ?? 60) } },
        );
    }

    let body: z.infer<typeof Body>;
    try {
        body = Body.parse(await request.json());
    } catch {
        return NextResponse.json({ ok: false, message: "Pedido inválido." }, { status: 400 });
    }

    // A frase é validada aqui dentro, outra vez. O bloqueio do colar no browser
    // é ergonomia; o controlo é este.
    const result = await applySettingChange({
        key: body.key,
        value: body.value,
        confirmationTyped: body.confirmationTyped,
        actorLabel: body.actorLabel?.trim() || null,
        ip: clientKey(request),
        userAgent: request.headers.get("user-agent"),
    });

    if (!result.ok) {
        const status =
            result.code === "CONFIRMATION_MISMATCH" ? 400 : result.code === "NO_DATABASE" ? 503 : 400;
        return NextResponse.json({ ok: false, code: result.code, message: result.message }, { status });
    }

    return NextResponse.json({ ok: true as const, from: result.from, to: result.to });
}
