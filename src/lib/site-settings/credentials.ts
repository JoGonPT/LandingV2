import { getMasterAdminPassword } from "@/lib/internal-admin/session";
import { constantTimeEqualUtf8 } from "@/lib/partner/credentials";
import { hashPassword, verifyPassword } from "./password";
import { getConn, readCurrentCredential, rotateCredential } from "./store";

/**
 * Verificação da password de administração.
 *
 * Existindo uma password rodada pelo painel, é essa que manda. Enquanto não
 * existir, vale a `W2G_MASTER_ADMIN_PASSWORD` do ambiente — de outra forma
 * ninguém entraria para definir a primeira, e o painel ficaria trancado por
 * dentro.
 *
 * Depois da primeira rotação, a variável de ambiente **deixa de servir para
 * entrar**. É de propósito: uma password guardada em claro na configuração de
 * infraestrutura não pode continuar a ser uma porta.
 */
export type PasswordSource = "database" | "environment" | "unconfigured";

export interface PasswordCheck {
    ok: boolean;
    source: PasswordSource;
}

export async function verifyAdminPassword(password: string): Promise<PasswordCheck> {
    const conn = getConn();

    if (conn) {
        try {
            const row = await readCurrentCredential(conn);
            if (row) {
                return {
                    ok: await verifyPassword(password, { hash: row.password_hash, salt: row.salt }),
                    source: "database",
                };
            }
        } catch (error) {
            // Base de dados em baixo não pode trancar a administração fora do
            // sistema — é justamente quando ela é mais precisa. Recorre-se ao
            // ambiente, e o painel avisa que está degradado.
            console.error("[admin-credentials] leitura falhou; a recorrer ao ambiente", { error });
        }
    }

    const fromEnv = getMasterAdminPassword();
    if (!fromEnv) return { ok: false, source: "unconfigured" };

    return { ok: constantTimeEqualUtf8(password, fromEnv), source: "environment" };
}

/** Se a password já vive na base de dados. O painel usa isto para o dizer. */
export async function hasDatabasePassword(): Promise<boolean> {
    const conn = getConn();
    if (!conn) return false;
    try {
        return (await readCurrentCredential(conn)) !== null;
    } catch {
        return false;
    }
}

export async function rotateAdminPassword(
    newPassword: string,
    actorLabel: string | null,
): Promise<{ ok: true } | { ok: false; message: string }> {
    const conn = getConn();
    if (!conn) {
        return { ok: false, message: "Base de dados não configurada; não é possível guardar a password." };
    }
    const { hash, salt } = await hashPassword(newPassword);
    try {
        await rotateCredential(conn, hash, salt, actorLabel);
        return { ok: true };
    } catch (error) {
        console.error("[admin-credentials] rotação falhou", { error });
        return { ok: false, message: "Não foi possível guardar a nova password." };
    }
}
