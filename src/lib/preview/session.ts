/**
 * Sessão de pré-visualização: deixa ver o site enquanto está em "Em breve".
 *
 * **Usa Web Crypto, não `node:crypto`.** O middleware do Next corre em Edge
 * runtime, onde o `createHmac` do Node não existe — e como o portão falha
 * fechado, um erro ali trancava o site a toda a gente, incluindo a quem
 * acabasse de entrar com a password certa. O Web Crypto funciona nos dois
 * runtimes, ao custo de as funções serem assíncronas.
 *
 * O desenho é o mesmo das outras sessões do projeto: token assinado, comparação
 * em tempo constante, expiração no payload. Segredo e cookie próprios — quem
 * tem a pré-visualização não herda acesso ao painel financeiro.
 *
 * A password nunca está no código. Vem de `SITE_PREVIEW_PASSWORD`.
 */
export const PREVIEW_SESSION_COOKIE = "w2g_preview";

const SEP = ".";
const ROLE = "preview";

const encoder = new TextEncoder();

function toBase64Url(bytes: Uint8Array): string {
    let binary = "";
    for (const byte of bytes) binary += String.fromCharCode(byte);
    return btoa(binary).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

function fromBase64Url(value: string): string {
    const padded = value.replace(/-/g, "+").replace(/_/g, "/");
    return atob(padded + "=".repeat((4 - (padded.length % 4)) % 4));
}

async function hmac(secret: string, payload: string): Promise<string> {
    const key = await crypto.subtle.importKey(
        "raw",
        encoder.encode(secret),
        { name: "HMAC", hash: "SHA-256" },
        false,
        ["sign"],
    );
    const signature = await crypto.subtle.sign("HMAC", key, encoder.encode(payload));
    return toBase64Url(new Uint8Array(signature));
}

/** Comparação em tempo constante: um `===` vazaria o segredo pelo tempo de resposta. */
function constantTimeEqual(a: string, b: string): boolean {
    if (a.length !== b.length) return false;
    let diff = 0;
    for (let i = 0; i < a.length; i++) diff |= a.charCodeAt(i) ^ b.charCodeAt(i);
    return diff === 0;
}

export async function signPreviewSession(secret: string, maxAgeSec: number): Promise<string> {
    const exp = Math.floor(Date.now() / 1000) + maxAgeSec;
    const payload = toBase64Url(encoder.encode(JSON.stringify({ role: ROLE, exp, v: 1 })));
    return `${payload}${SEP}${await hmac(secret, payload)}`;
}

export async function verifyPreviewSession(
    secret: string,
    token: string | undefined,
): Promise<boolean> {
    if (!token) return false;

    const i = token.lastIndexOf(SEP);
    if (i <= 0) return false;

    const payload = token.slice(0, i);
    const signature = token.slice(i + 1);

    let expected: string;
    try {
        expected = await hmac(secret, payload);
    } catch {
        return false;
    }
    if (!constantTimeEqual(signature, expected)) return false;

    let json: { role?: string; exp?: number };
    try {
        json = JSON.parse(fromBase64Url(payload)) as { role?: string; exp?: number };
    } catch {
        return false;
    }

    if (json.role !== ROLE) return false;
    if (typeof json.exp !== "number" || json.exp < Math.floor(Date.now() / 1000)) return false;
    return true;
}

/** Segredo de assinatura. Reaproveita os que já existem para não obrigar a mais configuração. */
export function getPreviewSessionSecret(): string {
    const s =
        process.env.SITE_PREVIEW_SESSION_SECRET?.trim() ||
        process.env.W2G_MASTER_ADMIN_SESSION_SECRET?.trim() ||
        process.env.PARTNER_SESSION_SECRET?.trim() ||
        "";
    if (s.length < 16) {
        throw new Error(
            "SITE_PREVIEW_SESSION_SECRET (ou W2G_MASTER_ADMIN_SESSION_SECRET / PARTNER_SESSION_SECRET) tem de ter pelo menos 16 caracteres.",
        );
    }
    return s;
}

export function getPreviewPassword(): string {
    return process.env.SITE_PREVIEW_PASSWORD?.trim() ?? "";
}

/**
 * O portão só está ativo quando `SITE_COMING_SOON=1`.
 *
 * Desligar o "Em breve" é mudar uma variável — não exige deploy nem reverter
 * um commit.
 */
export function isComingSoonEnabled(): boolean {
    return process.env.SITE_COMING_SOON?.trim() === "1";
}

export function getPreviewSessionMaxAgeSec(): number {
    const n = Number(process.env.SITE_PREVIEW_SESSION_MAX_AGE_SEC ?? 60 * 60 * 24 * 7);
    return Number.isFinite(n) && n > 0 ? n : 60 * 60 * 24 * 7;
}
