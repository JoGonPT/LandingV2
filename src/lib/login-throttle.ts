/**
 * Bloqueio temporário após tentativas de login falhadas.
 *
 * Distinto do `rate-limit.ts`, e de propósito: aqui contam-se **falhas**, não
 * pedidos. Um utilizador que acerta à primeira nunca é travado, por muitas
 * vezes que entre e saia — só a insistência a errar é penalizada.
 *
 * **Chave por IP, não por identificador.** Contar por conta (slug, email)
 * permitiria a um atacante bloquear a conta de outra pessoa de propósito, o
 * que troca um problema por outro pior. Por IP, o custo recai sobre quem
 * tenta.
 *
 * **Limitação assumida**, a mesma do `rate-limit.ts`: o estado vive no
 * processo. Num servidor Node único (Cloudways/PM2 fork) cobre tudo; em
 * serverless com N instâncias, o limite efetivo é `N ×` o configurado. Trava a
 * força bruta de origem única, que é a ameaça real contra
 * `W2G_MASTER_ADMIN_PASSWORD` — uma password única e partilhada.
 */

type Attempts = { failures: number; blockedUntil: number; windowEndsAt: number };

const attempts = new Map<string, Attempts>();

/** 5 falhas abrem 15 minutos de bloqueio; a contagem reinicia ao fim de 15 min sem falhar. */
const MAX_FAILURES = 5;
const WINDOW_MS = 15 * 60 * 1000;
const BLOCK_MS = 15 * 60 * 1000;

function evictExpired(now: number): void {
    for (const [key, entry] of attempts) {
        if (entry.blockedUntil <= now && entry.windowEndsAt <= now) attempts.delete(key);
    }
}

export interface LoginThrottleResult {
    allowed: boolean;
    /** Segundos até poder tentar de novo — serve o cabeçalho `Retry-After`. */
    retryAfterSeconds: number;
}

/** Chamar **antes** de verificar credenciais. */
export function checkLoginAllowed(key: string): LoginThrottleResult {
    const now = Date.now();
    if (attempts.size > 500) evictExpired(now);

    const entry = attempts.get(key);
    if (!entry || entry.blockedUntil <= now) return { allowed: true, retryAfterSeconds: 0 };

    return {
        allowed: false,
        retryAfterSeconds: Math.max(1, Math.ceil((entry.blockedUntil - now) / 1000)),
    };
}

/** Chamar quando as credenciais estiverem erradas. */
export function registerLoginFailure(key: string): void {
    const now = Date.now();
    const entry = attempts.get(key);

    if (!entry || entry.windowEndsAt <= now) {
        attempts.set(key, { failures: 1, blockedUntil: 0, windowEndsAt: now + WINDOW_MS });
        return;
    }

    entry.failures += 1;
    entry.windowEndsAt = now + WINDOW_MS;
    if (entry.failures >= MAX_FAILURES) entry.blockedUntil = now + BLOCK_MS;
}

/** Chamar quando o login é bem-sucedido — limpa o histórico daquele IP. */
export function clearLoginFailures(key: string): void {
    attempts.delete(key);
}

/** Só para testes — o estado é global ao módulo. */
export function __resetLoginThrottleState(): void {
    attempts.clear();
}
