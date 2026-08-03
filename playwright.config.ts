import { readFileSync, existsSync } from "node:fs";
import path from "node:path";
import { defineConfig, devices } from "@playwright/test";

/** Load `.env` into process.env without overriding existing values. */
function loadDotEnv(file = ".env") {
  const full = path.resolve(process.cwd(), file);
  if (!existsSync(full)) return;
  for (const raw of readFileSync(full, "utf8").split(/\r?\n/)) {
    const line = raw.trim();
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
    if (process.env[key] === undefined) process.env[key] = value;
  }
}

loadDotEnv(".env");
loadDotEnv(".env.local");

// Prefer IPv4; avoid ::1 ECONNREFUSED on Windows.
const baseURL = process.env.PLAYWRIGHT_BASE_URL ?? "http://127.0.0.1:3000";

export default defineConfig({
  testDir: "./e2e",
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  workers: process.env.CI ? 1 : undefined,
  timeout: 120_000,
  reporter: "list",
  use: {
    baseURL,
    trace: "on-first-retry",
  },
  projects: [
    {
      name: "chromium",
      use: { ...devices["Desktop Chrome"] },
    },
  ],
  webServer: process.env.CI
    ? undefined
    : {
        command: "npm run dev",
        url: baseURL,
        reuseExistingServer: !process.env.CI,
        timeout: 120_000,
        env: {
          ...process.env,
          NODE_ENV: "development",
          // Keep auth secrets from .env; disable broken MySQL for local E2E speed/stability.
          MYSQL_HOST: "",
          MYSQL_USER: "",
          MYSQL_DATABASE: "",
          MYSQL_PASSWORD: "",
          // Force test OTP even if .env has NODE_ENV=production or SMS-only config.
          AUTH_ALLOW_TEST_OTP: "true",
          AUTH_TEST_PHONE: process.env.AUTH_TEST_PHONE || "09123456789",
          AUTH_TEST_OTP: process.env.AUTH_TEST_OTP || "1234",
        },
      },
});
