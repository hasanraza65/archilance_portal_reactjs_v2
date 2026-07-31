/**
 * Local dev launcher for the TWO-APP setup.
 *
 *   node dev-both.mjs
 *
 * Starts both Vite dev servers and puts a tiny router in front of them, so the
 * whole thing behaves exactly like production:
 *
 *   http://localhost:4000/          -> classic app  (archilance_portal_reactjs,  :5173)
 *   http://localhost:4000/v2/...    -> new app      (archilance_portal_reactjs_v2, :5180)
 *
 * Why a router at all: the two apps are separate builds sharing one origin.
 * Cookies (and therefore your session) are per-origin, so hitting them on two
 * different ports would mean signing in twice and the version switch wouldn't
 * carry you across. One port in front fixes that.
 *
 * Hot reload keeps working on both sides - WebSocket upgrades are forwarded too.
 * Uses only Node built-ins; nothing to install.
 */

import { spawn } from "node:child_process";
import fs from "node:fs";
import http from "node:http";
import net from "node:net";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

const PORT = Number(process.env.PORT || 4000);

/**
 * Find each app whether this file sits BESIDE the two project folders or INSIDE
 * one of them — the two apps are separate repos, so a teammate may end up with
 * either layout depending on where they cloned things.
 */
function locate(folder) {
  const candidates = [
    path.join(__dirname, folder),        // launcher sits next to both folders
    path.join(__dirname, "..", folder),  // launcher lives inside one of the repos
  ];
  for (const dir of candidates) {
    if (fs.existsSync(path.join(dir, "package.json"))) return dir;
  }
  console.error(
    `
Cannot find "${folder}".
` +
      `Both apps must be cloned side by side, e.g.
` +
      `  <parent>/archilance_portal_reactjs
` +
      `  <parent>/archilance_portal_reactjs_v2
`
  );
  process.exit(1);
}

const CLASSIC = { name: "classic", dir: locate("archilance_portal_reactjs"), port: 5173 };
const NEXT = { name: "v2", dir: locate("archilance_portal_reactjs_v2"), port: 5180 };

const npm = process.platform === "win32" ? "npm.cmd" : "npm";

function start(app) {
  const child = spawn(
    npm,
    ["run", "dev", "--", "--port", String(app.port), "--strictPort", "--host", "127.0.0.1"],
    {
      cwd: app.dir,
      shell: process.platform === "win32",
      stdio: ["ignore", "pipe", "pipe"],
    }
  );
  const tag = `[${app.name}]`;
  child.stdout.on("data", (d) => process.stdout.write(`${tag} ${d}`));
  child.stderr.on("data", (d) => process.stderr.write(`${tag} ${d}`));
  child.on("exit", (code) => console.log(`${tag} exited (${code})`));
  return child;
}

function waitFor(port, tries = 180) {
  return new Promise((resolve, reject) => {
    const attempt = (n) => {
      const req = http.get({ host: "127.0.0.1", port, path: "/", timeout: 2000 }, (res) => {
        res.resume();
        resolve();
      });
      const retry = () => {
        req.destroy();
        if (n <= 0) reject(new Error(`port ${port} never answered on 127.0.0.1`));
        else setTimeout(() => attempt(n - 1), 500);
      };
      req.on("error", retry);
      req.on("timeout", retry);
    };
    attempt(tries);
  });
}

const targetFor = (url) => (url === "/v2" || url.startsWith("/v2/") ? NEXT.port : CLASSIC.port);

const server = http.createServer((req, res) => {
  const proxy = http.request(
    { host: "127.0.0.1", port: targetFor(req.url), path: req.url, method: req.method, headers: req.headers },
    (upstream) => {
      res.writeHead(upstream.statusCode, upstream.headers);
      upstream.pipe(res, { end: true });
    }
  );
  proxy.on("error", (err) => {
    res.writeHead(502, { "Content-Type": "text/plain" });
    res.end(`Upstream not ready: ${err.message}`);
  });
  req.pipe(proxy, { end: true });
});

// Vite's HMR runs over WebSockets - forward the upgrade or you lose hot reload.
server.on("upgrade", (req, socket, head) => {
  const upstream = net.connect(targetFor(req.url), "127.0.0.1", () => {
    upstream.write(
      `GET ${req.url} HTTP/1.1\r\n` +
        Object.entries(req.headers).map(([k, v]) => `${k}: ${v}\r\n`).join("") +
        "\r\n"
    );
    if (head?.length) upstream.write(head);
    upstream.pipe(socket);
    socket.pipe(upstream);
  });
  upstream.on("error", () => socket.destroy());
  socket.on("error", () => upstream.destroy());
});

const children = [start(CLASSIC), start(NEXT)];
const stop = () => { children.forEach((c) => c.kill()); process.exit(0); };
process.on("SIGINT", stop);
process.on("SIGTERM", stop);

console.log("starting both dev servers...");
await Promise.all([waitFor(CLASSIC.port), waitFor(NEXT.port)]);

server.listen(PORT, "0.0.0.0", () => {
  console.log("\n" + "=".repeat(58));
  console.log(`  Classic  ->  http://localhost:${PORT}/`);
  console.log(`  New (v2) ->  http://localhost:${PORT}/v2/`);
  console.log("  Use ONE port for both so the session is shared.");
  console.log("=".repeat(58) + "\n");
});
