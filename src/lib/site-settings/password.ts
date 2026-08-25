import { randomBytes, scrypt as scryptCallback, timingSafeEqual } from "node:crypto";
import { promisify } from "node:util";

/**
 * Geração e verificação da password de administração.
 *
 * Hoje a password vive em claro em `W2G_MASTER_ADMIN_PASSWORD` e é comparada tal
 * e qual. Aqui guarda-se apenas o resultado de `scrypt` com sal aleatório: a
 * password em claro é mostrada uma vez a quem a gerou e nunca mais existe em
 * lado nenhum — nem em log, nem na base de dados, nem neste processo.
 *
 * `scrypt` vem do `node:crypto` e não acrescenta dependências. É deliberadamente
 * lento e exigente em memória, que é o que torna a força bruta cara.
 *
 * **Só corre em Node.** O middleware, que é Edge, não toca nisto.
 */
const scrypt = promisify(scryptCallback) as (
    password: string,
    salt: string,
    keylen: number,
) => Promise<Buffer>;

const KEY_LENGTH = 64;
const SALT_BYTES = 16;

/**
 * Alfabeto sem caracteres que se confundem à leitura — `O`/`0`, `l`/`1`/`I`.
 *
 * A password vai ser lida de um ecrã e escrita à mão pelo menos uma vez. Um
 * carácter ambíguo transforma-se em três tentativas falhadas e na suspeita de
 * que o sistema está avariado.
 */
const UPPER = "ABCDEFGHJKLMNPQRSTUVWXYZ";
const LOWER = "abcdefghijkmnopqrstuvwxyz";
const DIGITS = "23456789";
const SYMBOLS = "!@#$%&*?";
const ALPHABET = UPPER + LOWER + DIGITS + SYMBOLS;

export const GENERATED_PASSWORD_LENGTH = 24;

/**
 * Inteiro uniforme em `[0, max)`.
 *
 * Rejeita as amostras da cauda em vez de fazer `% max` diretamente: 256 não é
 * múltiplo do tamanho do alfabeto, e o resto daria mais probabilidade aos
 * primeiros caracteres.
 */
function randomInt(max: number): number {
    const limit = 256 - (256 % max);
    for (;;) {
        for (const byte of randomBytes(64)) {
            if (byte < limit) return byte % max;
        }
    }
}

function pick(from: string): string {
    return from[randomInt(from.length)]!;
}

/**
 * Password aleatória forte.
 *
 * **Garante pelo menos um carácter de cada classe por construção**, em vez de
 * confiar na sorte. Com 24 caracteres de um alfabeto de 64, a probabilidade de
 * sair sem qualquer símbolo é de cerca de 4% — o suficiente para, mais dia menos
 * dia, gerar uma password que o próprio sistema recusaria.
 *
 * Depois de garantidas as quatro classes, o resto é preenchido ao acaso e tudo
 * é baralhado, para que as posições iniciais não sejam previsíveis.
 */
export function generateStrongPassword(length = GENERATED_PASSWORD_LENGTH): string {
    const required = [pick(UPPER), pick(LOWER), pick(DIGITS), pick(SYMBOLS)];
    const chars = [...required];
    while (chars.length < length) {
        chars.push(pick(ALPHABET));
    }

    // Fisher-Yates com aleatoriedade criptográfica: sem isto, os quatro
    // primeiros caracteres teriam sempre a mesma ordem de classes.
    for (let i = chars.length - 1; i > 0; i--) {
        const j = randomInt(i + 1);
        [chars[i], chars[j]] = [chars[j]!, chars[i]!];
    }
    return chars.join("");
}

export interface HashedPassword {
    hash: string;
    salt: string;
}

export async function hashPassword(password: string): Promise<HashedPassword> {
    const salt = randomBytes(SALT_BYTES).toString("hex");
    const derived = await scrypt(password, salt, KEY_LENGTH);
    return { hash: derived.toString("hex"), salt };
}

/** Comparação em tempo constante — um `===` vazaria o hash pelo tempo de resposta. */
export async function verifyPassword(
    password: string,
    stored: { hash: string; salt: string },
): Promise<boolean> {
    if (!password || !stored.hash || !stored.salt) return false;
    let derived: Buffer;
    try {
        derived = await scrypt(password, stored.salt, KEY_LENGTH);
    } catch {
        return false;
    }
    let expected: Buffer;
    try {
        expected = Buffer.from(stored.hash, "hex");
    } catch {
        return false;
    }
    if (expected.length !== derived.length) return false;
    return timingSafeEqual(derived, expected);
}

export interface PasswordStrength {
    ok: boolean;
    problems: string[];
}

/**
 * Exigências mínimas para uma password escrita à mão.
 *
 * O gerador produz sempre algo que passa isto com folga. A validação existe
 * para o caso de alguém preferir escolher a sua — e nesse caso convém que não
 * seja "way2go2026".
 */
export function checkPasswordStrength(password: string): PasswordStrength {
    const problems: string[] = [];
    if (password.length < 16) problems.push("Tem de ter pelo menos 16 caracteres.");
    if (!/[a-z]/.test(password)) problems.push("Falta pelo menos uma minúscula.");
    if (!/[A-Z]/.test(password)) problems.push("Falta pelo menos uma maiúscula.");
    if (!/[0-9]/.test(password)) problems.push("Falta pelo menos um algarismo.");
    if (!/[^A-Za-z0-9]/.test(password)) problems.push("Falta pelo menos um símbolo.");
    if (/(.)\1{2,}/.test(password)) problems.push("Tem três ou mais caracteres iguais seguidos.");
    if (/way2go|vruum|admin|password|123456/i.test(password)) {
        problems.push("Contém uma palavra previsível.");
    }
    return { ok: problems.length === 0, problems };
}
