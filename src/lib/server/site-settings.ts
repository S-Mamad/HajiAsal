import type { RowDataPacket } from "mysql2/promise";
import site from "@/data/site.json";
import type { SiteConfig } from "@/types";
import { readJsonFile, writeJsonFile } from "./db";
import {
  memoryGetSiteOverrides,
  memorySetSiteOverrides,
} from "./memory-store";
import { canUseFilesystemPersistence } from "./production";
import {
  asJson,
  isMysqlConfigured,
  mysqlExecute,
  mysqlQueryOne,
  parseJsonField,
} from "./mysql";

const SITE_FILE = "site-overrides.json";
const SITE_SETTINGS_KEY = "hajiasal";

export async function getSiteSettings(): Promise<SiteConfig> {
  if (isMysqlConfigured()) {
    const row = await mysqlQueryOne<RowDataPacket>(
      "SELECT value FROM site_settings WHERE `key` = ? LIMIT 1",
      [SITE_SETTINGS_KEY],
    );
    if (row?.value) {
      return {
        ...(site as SiteConfig),
        ...parseJsonField<Partial<SiteConfig>>(row.value, {}),
      };
    }
  }

  if (canUseFilesystemPersistence()) {
    const overrides = await readJsonFile<Partial<SiteConfig>>(SITE_FILE, {});
    return { ...(site as SiteConfig), ...overrides };
  }

  const mem = memoryGetSiteOverrides();
  if (mem) {
    return { ...(site as SiteConfig), ...(mem as Partial<SiteConfig>) };
  }
  return site as SiteConfig;
}

export async function updateSiteSettings(
  updates: Partial<SiteConfig>,
): Promise<SiteConfig> {
  const current = await getSiteSettings();
  // Allowlist top-level keys only — reject prototype / unexpected mass assignment.
  const allowedKeys = new Set(Object.keys(current) as Array<keyof SiteConfig>);
  const sanitized: Partial<SiteConfig> = {};
  for (const [key, value] of Object.entries(updates)) {
    if (!allowedKeys.has(key as keyof SiteConfig)) continue;
    if (key === "__proto__" || key === "constructor" || key === "prototype") {
      continue;
    }
    (sanitized as Record<string, unknown>)[key] = value;
  }
  const merged = { ...current, ...sanitized };

  if (isMysqlConfigured()) {
    await mysqlExecute(
      "INSERT INTO site_settings (`key`, value, updated_at) VALUES (?, ?, ?) " +
        "ON DUPLICATE KEY UPDATE value = VALUES(value), updated_at = VALUES(updated_at)",
      [SITE_SETTINGS_KEY, asJson(merged), new Date().toISOString()],
    );
    return merged;
  }

  if (canUseFilesystemPersistence()) {
    await writeJsonFile(SITE_FILE, merged);
    return merged;
  }

  memorySetSiteOverrides(merged as unknown as Record<string, unknown>);
  return merged;
}
