/**
 * Aplicar uma alteração a um interruptor.
 *
 * Três coisas acontecem, por esta ordem: grava-se o valor, grava-se a linha de
 * auditoria, e avisa-se o Discord. Só a primeira pode falhar a operação — se a
 * auditoria ou o aviso falharem, a alteração já é real e escondê-la seria pior.
 *
 * A auditoria existe porque a administração usa uma password única partilhada e
 * é impossível distinguir pessoas. O `actorLabel` é escrito por quem faz a
 * alteração; não é autenticação, é responsabilidade.
 */
import { postDiscordWebhook } from "@/lib/notify/discord";
import { confirmationMatches, getDefinition, getOption } from "./registry";
import { getSettingsSnapshot, invalidateSettingsCache } from "./resolve";
import { appendAudit, getConn, writeSetting } from "./store";

export interface ApplyChangeInput {
    key: string;
    value: string;
    /** A frase escrita à mão. Validada aqui, no servidor. */
    confirmationTyped: string;
    actorLabel: string | null;
    ip: string | null;
    userAgent: string | null;
}

export type ApplyChangeResult =
    | { ok: true; from: string | null; to: string }
    | { ok: false; code: ApplyChangeErrorCode; message: string };

export type ApplyChangeErrorCode =
    | "UNKNOWN_SETTING"
    | "UNKNOWN_VALUE"
    | "CONFIRMATION_MISMATCH"
    | "NO_DATABASE"
    | "WRITE_FAILED"
    | "NO_CHANGE";

export async function applySettingChange(input: ApplyChangeInput): Promise<ApplyChangeResult> {
    const definition = getDefinition(input.key);
    if (!definition) {
        return { ok: false, code: "UNKNOWN_SETTING", message: "Definição desconhecida." };
    }

    const option = getOption(input.key, input.value);
    if (!option) {
        return { ok: false, code: "UNKNOWN_VALUE", message: "Valor não permitido para esta definição." };
    }

    // A validação repete-se aqui de propósito. O bloqueio do colar no browser é
    // ergonomia; isto é que é o controlo.
    if (option.confirmation !== null && !confirmationMatches(option.confirmation, input.confirmationTyped)) {
        return {
            ok: false,
            code: "CONFIRMATION_MISMATCH",
            message: "A frase de confirmação não coincide.",
        };
    }

    const conn = getConn();
    if (!conn) {
        return {
            ok: false,
            code: "NO_DATABASE",
            message: "Base de dados não configurada. Não é possível alterar interruptores.",
        };
    }

    const snapshot = await getSettingsSnapshot();
    if (snapshot.degraded) {
        return {
            ok: false,
            code: "NO_DATABASE",
            message: "A base de dados não está a responder. Nenhuma alteração é aceite neste estado.",
        };
    }

    const current = snapshot.settings.find((s) => s.definition.key === input.key);
    const from = current?.value ?? null;
    if (from === input.value) {
        return { ok: false, code: "NO_CHANGE", message: "Já está nesse estado." };
    }

    try {
        await writeSetting(conn, input.key, input.value, input.actorLabel);
    } catch (error) {
        console.error("[site-settings] escrita falhou", { key: input.key, error });
        return { ok: false, code: "WRITE_FAILED", message: "Não foi possível gravar a alteração." };
    }

    // Sem isto, quem acabou de mudar veria o valor antigo durante meio minuto.
    invalidateSettingsCache();

    try {
        await appendAudit(conn, {
            key: input.key,
            old_value: from,
            new_value: input.value,
            actor_label: input.actorLabel,
            confirmation_typed: input.confirmationTyped || null,
            ip: input.ip,
            user_agent: input.userAgent?.slice(0, 400) ?? null,
        });
    } catch (error) {
        console.error("[site-settings] auditoria falhou, mas a alteração foi aplicada", {
            key: input.key,
            error,
        });
    }

    void postDiscordWebhook(
        {
            content: [
                `**Interruptor alterado** — ${definition.label}`,
                `\`${from ?? "(sem valor)"}\` → \`${input.value}\``,
                input.actorLabel ? `Por: ${input.actorLabel}` : "Sem identificação",
                option.consequence,
            ].join("\n"),
        },
        "site-settings",
    );

    return { ok: true, from, to: input.value };
}
