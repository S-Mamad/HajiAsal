#!/usr/bin/env node
/**
 * Seed site settings from site.json into MySQL site_settings.
 */
import mysql from "mysql2/promise";
import { readFileSync } from "fs";
import { dirname, join } from "path";
import { fileURLToPath } from "url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const root = join(__dirname, "..");

const host = process.env.MYSQL_HOST;
const user = process.env.MYSQL_USER;
const database = process.env.MYSQL_DATABASE;
const password = process.env.MYSQL_PASSWORD ?? "";
const port = Number(process.env.MYSQL_PORT || 3306);

if (!host || !user || !database) {
  console.error("MYSQL_HOST, MYSQL_USER, MYSQL_DATABASE are required");
  process.exit(1);
}

const site = JSON.parse(
  readFileSync(join(root, "src/hajiasal/data/site.json"), "utf8"),
);

const conn = await mysql.createConnection({
  host,
  port,
  user,
  password,
  database,
  charset: "utf8mb4",
});

try {
  console.log("Seeding site_settings (hajiasal)...");
  await conn.execute(
    `INSERT INTO site_settings (\`key\`, value)
     VALUES ('hajiasal', CAST(? AS JSON))
     ON DUPLICATE KEY UPDATE value = VALUES(value), updated_at = CURRENT_TIMESTAMP(3)`,
    [JSON.stringify(site)],
  );
  console.log("Done.");
} finally {
  await conn.end();
}
