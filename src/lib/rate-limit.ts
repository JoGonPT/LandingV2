/**
 * Limitador de taxa por chave, em memória e por janela fixa.
 *
 * **Limitação assumida:** o estado vive no processo. Num servidor Node único
 * (Cloudways/PM2 em modo fork) cobre o caso todo; em serverless com várias
 * instâncias, cada uma tem o seu contador, pelo que o limite efetivo é
 * `limite × instâncias`. Continua a travar o abuso trivial de um só cliente,
 * que é a ameaça real aqui — um formulário público sem qualquer barreira.
 *
 * Para um limite rigoroso e partilhado seria preciso Redis/Upstash. Não se
 * introduziu essa dependência por agora: o objetivo é fechar a porta aberta,
 * não construir infraestrutura.
 */

type Bucket = { count: number; resetAt: number };

const buckets = new Map<string, Bucket>();

/** Impede o Map de crescer sem limite com chaves já expiradas. */
function evictExpired(now: number): void {
    for (const [key, bucket] of buckets) {
        if (bucket.resetAt <= now) buckets.delete(key);
    }
}

export interface RateLimitResult {
    allowed: boolean;
    /** Pedidos ainda disponíveis na janela atual. */
    remaining: number;
    /** Segundos até a janela reabrir — serve o cabeçalho `Retry-After`. */
    retryAfterSeconds: number;
}

export function rateLimit(key: string, limit: number, windowMs: number): RateLimitResult {
    const now = Date.now();

    // Limpeza amortizada: barata, e só quando o Map já tem dimensão que a justifique.
    if (buckets.size > 500) evictExpired(now);

    const existing = buckets.get(key);

    if (!existing || existing.resetAt <= now) {
        buckets.set(key, { count: 1, resetAt: now + windowMs });
        return { allowed: true, remaining: limit - 1, retryAfterSeconds: 0 };
    }

    existing.count += 1;

    if (existing.count > limit) {
        return {
            allowed: false,
            remaining: 0,
            retryAfterSeconds: Math.max(1, Math.ceil((existing.resetAt - now) / 1000)),
        };
    }

    return { allowed: true, remaining: limit - existing.count, retryAfterSeconds: 0 };
}

/**
 * IP do cliente a partir dos cabeçalhos do proxy.
 *
 * Atrás de um proxy de confiança (Vercel, Cloudflare, o nginx do Cloudways) o
 * primeiro elemento de `x-forwarded-for` é o cliente. Sem proxy, estes
 * cabeçalhos são forjáveis — daí o fallback partilhado, que degrada para um
 * limite global em vez de deixar passar tudo.
 */
export function clientKey(request: Request): string {
    const forwarded = request.headers.get("x-forwarded-for");
    if (forwarded) {
        const first = forwarded.split(",")[0]?.trim();
        if (first) return first;
    }
    return request.headers.get("x-real-ip")?.trim() || "desconhecido";
}

/** Só para testes — o estado é global ao módulo. */
export function __resetRateLimitState(): void {
    buckets.clear();
}
