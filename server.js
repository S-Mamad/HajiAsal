/**
 * cPanel / Passenger entrypoint for Haji Asal.
 *
 * Setup Node.js App → Application Startup File: server.js
 *
 * Prefers Next.js standalone build when present; otherwise falls back to next().
 */
const fs = require("fs");
const path = require("path");

const root = __dirname;
const standaloneServer = path.join(root, ".next", "standalone", "server.js");

if (fs.existsSync(standaloneServer)) {
  const standaloneDir = path.dirname(standaloneServer);
  // Standalone expects public + .next/static as siblings of server.js
  process.chdir(standaloneDir);
  require(standaloneServer);
} else {
  const { createServer } = require("http");
  const { parse } = require("url");
  const next = require("next");

  const app = next({ dev: false, dir: root });
  const handle = app.getRequestHandler();
  const port = Number.parseInt(process.env.PORT || "3000", 10);

  app.prepare().then(() => {
    createServer((req, res) => {
      handle(req, res, parse(req.url, true));
    }).listen(port, () => {
      console.log(`[hajiasal] listening on ${port}`);
    });
  });
}
