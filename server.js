/**
 * Entry point for hosts (e.g. cPanel “Node.js Web Application”) that run `node <startup-file>`.
 * Binds to 0.0.0.0 and PORT so the reverse proxy can reach the app.
 * For Vercel etc., keep using `npm run start` (next start).
 */
const { createServer } = require("http");
const next = require("next");

const dir = __dirname;
const hostname = "0.0.0.0";
const port = parseInt(process.env.PORT || process.env.CPANEL_NODEJS_PORT || "3000", 10);

const app = next({ dev: false, dir });
const handle = app.getRequestHandler();

app.prepare().then(() => {
  createServer((req, res) => handle(req, res)).listen(port, hostname, (err) => {
    if (err) throw err;
    console.log(`Next.js ready on http://${hostname}:${port}`);
  });
});
