/**
 * PM2 — Way2Go (Cloudways / Node.js self-hosted)
 *
 * Arranca a build standalone do Next (`output: "standalone"` em next.config.ts).
 *
 * Deploy:
 *   npm ci
 *   npm run build:standalone      # next build + copia public/ e .next/static/
 *   pm2 start ecosystem.config.js --env production
 *
 * O `server.js` referido aqui é o **gerado pelo Next** em `.next/standalone/`.
 * O antigo `server.js` da raiz (entrypoint cPanel) foi removido — havia dois
 * modelos de arranque incompatíveis com o mesmo nome.
 *
 * As variáveis sensíveis (Stripe, Supabase, TransferCRM, SMTP…) vêm do ambiente
 * do servidor, não deste ficheiro, que é versionado.
 *
 * Nota: as `NEXT_PUBLIC_*` são incorporadas em tempo de build, não aqui. Têm de
 * estar definidas quando `npm run build:standalone` corre, ou saem `undefined`.
 */
module.exports = {
    apps: [
        {
            name: "way2go-web",

            // cwd relativo a este ficheiro; script relativo ao cwd.
            // O server.js do standalone resolve `public/` e `.next/static/`
            // a partir da sua própria pasta, por isso tem de correr lá dentro.
            cwd: "./.next/standalone",
            script: "server.js",

            // Sem ISR nem cache partilhada no projeto (verificado), pelo que o modo
            // cluster seria seguro. Fica em fork/1 instância por defeito porque os
            // planos Cloudways têm RAM fixa — subir `instances` só depois de medir.
            exec_mode: "fork",
            instances: 1,

            autorestart: true,
            max_memory_restart: "512M",
            kill_timeout: 5000,
            wait_ready: false,

            env: {
                NODE_ENV: "production",
                PORT: 3000,
                HOSTNAME: "0.0.0.0",
            },

            // PM2 não rotaciona logs sozinho: instalar pm2-logrotate no servidor.
            //   pm2 install pm2-logrotate
            error_file: "../../logs/way2go-web.error.log",
            out_file: "../../logs/way2go-web.out.log",
            merge_logs: true,
            time: true,
        },
    ],
};
