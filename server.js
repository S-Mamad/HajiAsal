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

/** Load KEY=VALUE from a .env file into process.env (does not override existing). */
function loadEnvFile(filePath) {
  if (!fs.existsSync(filePath)) return;
  const text = fs.readFileSync(filePath, "utf8");
  for (const rawLine of text.split(/\r?\n/)) {
    const line = rawLine.trim();
    if (!line || line.startsWith("#")) continue;
    const eq = line.indexOf("=");
    if (eq <= 0) continue;
    const key = line.slice(0, eq).trim();
    let value = line.slice(eq + 1).trim();
    if (
      (value.startsWith('"') && value.endsWith('"')) ||
      (value.startsWith("'") && value.endsWith("'"))
    ) {
      value = value.slice(1, -1);
    }
    if (process.env[key] === undefined) {
      process.env[key] = value;
    }
  }
}

loadEnvFile(path.join(root, ".env"));
loadEnvFile(path.join(root, ".env.production"));

if (!process.env.NODE_ENV) {
  process.env.NODE_ENV = "production";
}

const standaloneServer = path.join(root, ".next", "standalone", "server.js");

if (fs.existsSync(standaloneServer)) {
  const standaloneDir = path.dirname(standaloneServer);
  // Keep root .env visible after chdir (Next looks in cwd)
  for (const name of [".env", ".env.production", ".env.local"]) {
    const src = path.join(root, name);
    const dest = path.join(standaloneDir, name);
    if (fs.existsSync(src) && !fs.existsSync(dest)) {
      try {
        fs.copyFileSync(src, dest);
      } catch {
        /* ignore — cPanel env vars still apply */
      }
    }
  }
  // Standalone expects public + .next/static as siblings of server.js
  process.chdir(standaloneDir);
  require(standaloneServer);
} else {
  // No standalone: need a completed `npm run build` and next in node_modules
  let next;
  try {
    next = require("next");
  } catch (err) {
    console.error(
      "[hajiasal] Missing next module and no .next/standalone build.",
      "Run NPM Install + npm run build, or upload the ready-to-run zip.",
    );
    throw err;
  }

  const buildId = path.join(root, ".next", "BUILD_ID");
  if (!fs.existsSync(buildId)) {
    console.error(
      "[hajiasal] No production build found (.next/BUILD_ID missing).",
      "On host: source ~/nodevenv/hajiasal/22/bin/activate && cd ~/hajiasal && npm run build && mkdir -p tmp && touch tmp/restart.txt",
    );
  }

  const { createServer } = require("http");
  const { parse } = require("url");

  const app = next({ dev: false, dir: root });
  const handle = app.getRequestHandler();
  const port = Number.parseInt(process.env.PORT || "3000", 10);

  app
    .prepare()
    .then(() => {
      createServer((req, res) => {
        handle(req, res, parse(req.url, true));
      }).listen(port, () => {
        console.log(`[hajiasal] listening on ${port}`);
      });
    })
    .catch((err) => {
      console.error("[hajiasal] failed to start:", err);
      process.exit(1);
    });
}
