import { readFileSync, readdirSync, statSync } from "node:fs";
import { join, relative } from "node:path";
import { fileURLToPath } from "node:url";

const root = join(fileURLToPath(new URL("..", import.meta.url)), "src");
const badPatterns = [
  /href=["']\/shop(?:\/|["'])/g,
  /href=["']\/product\//g,
  /href=["']\/checkout/g,
  /href=["']\/cart(?:\/|["'])/g,
  /href=["']\/about(?:\/|["'])/g,
  /href=["']\/contact(?:\/|["'])/g,
  /href=["']\/faq(?:\/|["'])/g,
  /push\(["']\/shop/g,
  /router\.push\(["']\/checkout/g,
  /\/hajiasal\/hajiasal/g,
];

function walk(dir, files = []) {
  for (const entry of readdirSync(dir)) {
    const full = join(dir, entry);
    if (statSync(full).isDirectory()) {
      if (entry === "node_modules" || entry === ".next") continue;
      walk(full, files);
    } else if (/\.(tsx?|jsx?|mjs)$/.test(entry)) {
      files.push(full);
    }
  }
  return files;
}

const files = walk(root);
const violations = [];

for (const file of files) {
  const rel = relative(join(root, ".."), file);
  if (!rel.includes("hajiasal") && !rel.includes("app")) continue;

  const content = readFileSync(file, "utf8");
  for (const pattern of badPatterns) {
    pattern.lastIndex = 0;
    const match = pattern.exec(content);
    if (match) {
      violations.push({ file: rel, match: match[0] });
    }
  }
}

if (violations.length > 0) {
  console.error("Found hajiasal path violations:\n");
  for (const v of violations) {
    console.error(`  ${v.file}: ${v.match}`);
  }
  process.exit(1);
}

console.log("No hajiasal path violations found.");
