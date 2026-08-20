/**
 * Completa a build standalone do Next.
 *
 * `output: "standalone"` gera `.next/standalone/server.js` com um `node_modules` mínimo,
 * mas **não** copia os assets estáticos — é responsabilidade de quem faz o deploy.
 * Sem este passo o servidor arranca e serve HTML sem CSS, sem JS de cliente e sem imagens.
 *
 * Copia:
 *   public/       → .next/standalone/public/
 *   .next/static/ → .next/standalone/.next/static/
 *
 * Corre automaticamente via `npm run build:standalone`.
 */
import { cp, access, readdir } from "node:fs/promises";
import { join, relative } from "node:path";

const root = process.cwd();
const standalone = join(root, ".next", "standalone");

async function exists(path) {
    try {
        await access(path);
        return true;
    } catch {
        return false;
    }
}

if (!(await exists(standalone))) {
    console.error(
        "[assemble-standalone] .next/standalone não existe.\n" +
            "  Corre `next build` primeiro, e confirma que next.config.ts tem output: \"standalone\".",
    );
    process.exit(1);
}

// Com `outputFileTracingRoot` mal configurado o Next aninha a saída sob o caminho do projeto.
// Detetamos isso em vez de produzir um bundle que não arranca.
if (!(await exists(join(standalone, "server.js")))) {
    const found = await readdir(standalone).catch(() => []);
    console.error(
        `[assemble-standalone] Não encontrei server.js em ${relative(root, standalone)}.\n` +
            `  Conteúdo: ${found.join(", ") || "(vazio)"}\n` +
            "  Verifica `outputFileTracingRoot` em next.config.ts.",
    );
    process.exit(1);
}

const copies = [
    { from: join(root, "public"), to: join(standalone, "public"), label: "public/" },
    {
        from: join(root, ".next", "static"),
        to: join(standalone, ".next", "static"),
        label: ".next/static/",
    },
];

for (const { from, to, label } of copies) {
    if (!(await exists(from))) {
        console.warn(`[assemble-standalone] ${label} não existe — ignorado.`);
        continue;
    }
    await cp(from, to, { recursive: true });
    console.log(`[assemble-standalone] ${label} → ${relative(root, to)}`);
}

console.log("[assemble-standalone] Bundle pronto: .next/standalone");
