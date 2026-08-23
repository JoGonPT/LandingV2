/**
 * O valor efetivo de cada interruptor, em tempo de execução.
 *
 * Ordem de resolução, sempre a mesma: **base de dados → variável de ambiente →
 * omissão segura**. As variáveis continuam a existir para que o site arranque
 * sem base de dados e para que nada mude no dia em que esta tabela for criada.
 *
 * ## A regra que não pode ser quebrada
 *
 * **Nada aqui lança, e uma falha nunca inverte um estado.** Na semana de 21 de
 * agosto de 2026 o projeto Supabase esteve pausado e tudo o que dependia dele
 * falhou em silêncio. Se o comportamento do site passa a depender de uma
 * leitura remota, essa leitura tem de degradar para o último valor conhecido —
 * nunca para o contrário do que estava.
 *
 * ## Porquê cache
 *
 * `site.coming_soon` é lido no middleware, a cada pedido, em Edge. Uma ida à
 * base de dados por pedido seria inaceitável. A cache de 30 s limita isso a, no
 * pior caso, dois pedidos por minuto e por isolate, e 30 s é o tempo que se
 * aceita esperar por um interruptor.
 *
 * Este módulo corre em Edge e em Node: só usa `fetch` e `process.env`.
 */
import { SETTINGS, type SettingDefinition, type SettingValue } from "./registry";
import { getConn, readAllSettings } from "./store";

const TTL_MS = 30_000;

/** Traduz a variável de ambiente para o valor do painel. `null` = não definida. */
type EnvParser = () => SettingValue | null;

function firstDefined(...raw: (string | undefined)[]): string | undefined {
    for (const r of raw) {
        const t = r?.trim();
        if (t) return t;
    }
    return undefined;
}

/**
 * As variáveis não falam a mesma língua que o painel, e uma delas está
 * invertida: `MANUAL_PAYMENT_MODE=1` significa Stripe automático **desligado**.
 * A tradução vive toda aqui para que o resto do sistema fale sempre em positivo.
 */
const ENV_PARSERS: Record<string, EnvParser> = {
    "payments.stripe_automatic": () => {
        const raw = firstDefined(process.env.MANUAL_PAYMENT_MODE, process.env.NEXT_PUBLIC_MANUAL_PAYMENT_MODE);
        if (raw === undefined) return null;
        return raw === "1" ? "off" : "on";
    },
    "site.coming_soon": () => {
        const raw = firstDefined(process.env.SITE_COMING_SOON);
        if (raw === undefined) return null;
        return raw === "1" ? "on" : "off";
    },
    "invoicing.vendus_live": () => {
        const raw = firstDefined(process.env.VENDUS_MODE);
        if (raw === undefined) return null;
        return raw.toUpperCase() === "PRODUCTION" ? "live" : "mock";
    },
    "booking.ui_mode": () => {
        const raw = firstDefined(process.env.BOOKING_UI_MODE, process.env.NEXT_PUBLIC_BOOKING_UI_MODE);
        if (raw === undefined) return null;
        return raw.toLowerCase() === "funnel" ? "funnel" : "quote";
    },
};

export function readEnvValue(key: string): SettingValue | null {
    return ENV_PARSERS[key]?.() ?? null;
}

export type SettingSource = "database" | "environment" | "default";

export interface ResolvedSetting {
    readonly definition: SettingDefinition;
    readonly value: SettingValue;
    readonly source: SettingSource;
    readonly databaseValue: SettingValue | null;
    readonly environmentValue: SettingValue | null;
}

export interface SettingsSnapshot {
    readonly settings: readonly ResolvedSetting[];
    /**
     * A base de dados não respondeu na última tentativa. O painel tem de o dizer
     * em voz alta e recusar escritas — mostrar omissões em silêncio seria pior
     * do que não mostrar nada.
     */
    readonly degraded: boolean;
    readonly degradedReason: string | null;
}

interface CacheState {
    rows: Map<string, string>;
    /** `null` enquanto nunca se conseguiu ler. Distingue "vazio" de "nunca lido". */
    loadedAt: number | null;
    expiresAt: number;
    degraded: boolean;
    degradedReason: string | null;
}

const cache: CacheState = {
    rows: new Map(),
    loadedAt: null,
    expiresAt: 0,
    degraded: false,
    degradedReason: null,
};

let inFlight: Promise<void> | null = null;

async function refresh(): Promise<void> {
    const conn = getConn();
    if (!conn) {
        // Sem Supabase configurado não há nada degradado: é a configuração
        // esperada de um ambiente que corre só com variáveis.
        cache.rows = new Map();
        cache.loadedAt = Date.now();
        cache.expiresAt = Date.now() + TTL_MS;
        cache.degraded = false;
        cache.degradedReason = null;
        return;
    }

    try {
        const rows = await readAllSettings(conn);
        cache.rows = new Map(rows.map((r) => [r.key, r.value]));
        cache.loadedAt = Date.now();
        cache.expiresAt = Date.now() + TTL_MS;
        cache.degraded = false;
        cache.degradedReason = null;
    } catch (error) {
        // Mantém `cache.rows` como está — o último valor conhecido. Só adia a
        // próxima tentativa, para não martelar uma base de dados em baixo.
        cache.expiresAt = Date.now() + TTL_MS;
        cache.degraded = true;
        cache.degradedReason = error instanceof Error ? error.message : String(error);
        console.error("[site-settings] leitura falhou; a manter o último valor conhecido", {
            error: cache.degradedReason,
            temValoresEmCache: cache.loadedAt !== null,
        });
    }
}

async function ensureFresh(): Promise<void> {
    if (Date.now() < cache.expiresAt) return;
    if (!inFlight) {
        inFlight = refresh().finally(() => {
            inFlight = null;
        });
    }
    await inFlight;
}

function resolveFrom(definition: SettingDefinition): ResolvedSetting {
    const raw = cache.rows.get(definition.key);
    const databaseValue =
        raw !== undefined && definition.options.some((o) => o.value === raw) ? raw : null;
    const environmentValue = readEnvValue(definition.key);

    if (databaseValue !== null) {
        return { definition, value: databaseValue, source: "database", databaseValue, environmentValue };
    }
    if (environmentValue !== null) {
        return { definition, value: environmentValue, source: "environment", databaseValue, environmentValue };
    }
    return { definition, value: definition.fallback, source: "default", databaseValue, environmentValue };
}

/** O valor efetivo de uma chave. Nunca lança. */
export async function getSetting(key: string): Promise<SettingValue> {
    const definition = SETTINGS.find((s) => s.key === key);
    if (!definition) {
        throw new Error(`Definição desconhecida: ${key}`);
    }
    await ensureFresh();
    return resolveFrom(definition).value;
}

/** Conveniência para os interruptores de dois estados. */
export async function isSettingOn(key: string, onValue: string): Promise<boolean> {
    return (await getSetting(key)) === onValue;
}

/** Tudo o que o painel precisa de mostrar, incluindo de onde vem cada valor. */
export async function getSettingsSnapshot(): Promise<SettingsSnapshot> {
    await ensureFresh();
    return {
        settings: SETTINGS.map(resolveFrom),
        degraded: cache.degraded,
        degradedReason: cache.degradedReason,
    };
}

/**
 * Força a próxima leitura a ir à base de dados.
 *
 * Chamado logo a seguir a uma escrita: sem isto, quem acabou de mudar um
 * interruptor veria o valor antigo durante meio minuto e mudaria outra vez.
 */
export function invalidateSettingsCache(): void {
    cache.expiresAt = 0;
}

/** Só para testes. */
export function __resetSettingsCache(): void {
    cache.rows = new Map();
    cache.loadedAt = null;
    cache.expiresAt = 0;
    cache.degraded = false;
    cache.degradedReason = null;
    inFlight = null;
}
