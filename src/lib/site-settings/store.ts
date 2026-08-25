/**
 * Acesso às tabelas dos interruptores.
 *
 * Segue a forma das outras stores de `src/lib` — `sync/sync-errors-store.ts`,
 * `partner/partner.service.ts` — que falam REST diretamente com a chave de
 * serviço. Não usa o `SupabaseService` do motor de reservas de propósito:
 * nenhum ficheiro de `src/lib` depende de `src/modules`, e essa classe traz
 * métodos de reservas atrás dela.
 *
 * Estas funções **lançam** quando a base de dados não responde. Quem decide o
 * que fazer com isso é o resolvedor, que nunca deixa uma falha alterar o
 * comportamento do site.
 */

export interface SettingRow {
    key: string;
    value: string;
    updated_at: string;
    updated_by_label: string | null;
}

export interface AuditRow {
    key: string;
    old_value: string | null;
    new_value: string;
    actor_label: string | null;
    confirmation_typed: string | null;
    ip: string | null;
    user_agent: string | null;
    created_at: string;
}

export interface CredentialRow {
    id: string;
    password_hash: string;
    salt: string;
    algo: string;
    rotated_at: string;
    rotated_by_label: string | null;
}

interface Conn {
    baseUrl: string;
    serviceKey: string;
}

export function getConn(): Conn | null {
    const baseUrl = process.env.SUPABASE_URL?.trim().replace(/\/+$/, "");
    const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY?.trim();
    if (!baseUrl || !serviceKey) return null;
    return { baseUrl, serviceKey };
}

function headers(serviceKey: string, extra?: Record<string, string>) {
    return {
        apikey: serviceKey,
        Authorization: `Bearer ${serviceKey}`,
        "Content-Type": "application/json",
        ...extra,
    };
}

/**
 * `cache: "no-store"` é obrigatório.
 *
 * O Next guarda respostas de `fetch` por omissão. Sem isto, um interruptor
 * mudado no painel podia continuar a ler o valor antigo muito para lá da
 * validade da nossa própria cache — e ninguém perceberia porquê.
 */
async function request(conn: Conn, path: string, init?: RequestInit): Promise<Response> {
    return fetch(`${conn.baseUrl}/rest/v1/${path}`, {
        ...init,
        cache: "no-store",
        headers: headers(conn.serviceKey, init?.headers as Record<string, string> | undefined),
    });
}

export class SettingsStoreError extends Error {
    constructor(
        message: string,
        readonly status?: number,
    ) {
        super(message);
        this.name = "SettingsStoreError";
    }
}

export async function readAllSettings(conn: Conn): Promise<SettingRow[]> {
    const res = await request(conn, "site_settings?select=*");
    if (!res.ok) {
        throw new SettingsStoreError(`Leitura de site_settings falhou (${res.status}).`, res.status);
    }
    return (await res.json()) as SettingRow[];
}

export async function writeSetting(
    conn: Conn,
    key: string,
    value: string,
    actorLabel: string | null,
): Promise<void> {
    const res = await request(conn, "site_settings?on_conflict=key", {
        method: "POST",
        headers: { Prefer: "return=minimal,resolution=merge-duplicates" },
        body: JSON.stringify([
            { key, value, updated_at: new Date().toISOString(), updated_by_label: actorLabel },
        ]),
    });
    if (!res.ok) {
        throw new SettingsStoreError(`Escrita de site_settings falhou (${res.status}).`, res.status);
    }
}

export async function appendAudit(conn: Conn, row: Omit<AuditRow, "created_at">): Promise<void> {
    const res = await request(conn, "site_settings_audit", {
        method: "POST",
        headers: { Prefer: "return=minimal" },
        body: JSON.stringify([row]),
    });
    if (!res.ok) {
        throw new SettingsStoreError(`Escrita da auditoria falhou (${res.status}).`, res.status);
    }
}

export async function readRecentAudit(conn: Conn, limit = 20): Promise<AuditRow[]> {
    const res = await request(
        conn,
        `site_settings_audit?select=*&order=created_at.desc&limit=${limit}`,
    );
    if (!res.ok) {
        throw new SettingsStoreError(`Leitura da auditoria falhou (${res.status}).`, res.status);
    }
    return (await res.json()) as AuditRow[];
}

export async function readCurrentCredential(conn: Conn): Promise<CredentialRow | null> {
    const res = await request(conn, "admin_credentials?select=*&is_current=is.true&limit=1");
    if (!res.ok) {
        throw new SettingsStoreError(`Leitura de admin_credentials falhou (${res.status}).`, res.status);
    }
    const rows = (await res.json()) as CredentialRow[];
    return rows[0] ?? null;
}

/**
 * Roda a password.
 *
 * A linha anterior deixa de ser corrente antes de a nova entrar, porque o
 * índice único só permite uma corrente de cada vez. As antigas ficam como
 * histórico — nunca são apagadas, e o hash antigo não serve para entrar.
 */
export async function rotateCredential(
    conn: Conn,
    passwordHash: string,
    salt: string,
    actorLabel: string | null,
): Promise<void> {
    const demote = await request(conn, "admin_credentials?is_current=is.true", {
        method: "PATCH",
        headers: { Prefer: "return=minimal" },
        body: JSON.stringify({ is_current: false }),
    });
    if (!demote.ok) {
        throw new SettingsStoreError(`Não foi possível arquivar a password anterior (${demote.status}).`, demote.status);
    }

    const res = await request(conn, "admin_credentials", {
        method: "POST",
        headers: { Prefer: "return=minimal" },
        body: JSON.stringify([
            {
                is_current: true,
                password_hash: passwordHash,
                salt,
                algo: "scrypt",
                rotated_at: new Date().toISOString(),
                rotated_by_label: actorLabel,
            },
        ]),
    });
    if (!res.ok) {
        throw new SettingsStoreError(`Gravação da nova password falhou (${res.status}).`, res.status);
    }
}
