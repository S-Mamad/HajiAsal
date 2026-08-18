import type { RowDataPacket } from "mysql2/promise";
import site from "@/data/site.json";
import faqSeed from "@/data/faq.json";
import type { SiteConfig, SocialLinks } from "@/types";
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

const seed = site as SiteConfig;

/** Default public Instagram when admin leaves the field empty. */
const CANONICAL_INSTAGRAM = "https://instagram.com/hajiasal_ir";

const DEFAULT_SOCIAL: SocialLinks = {
  instagram: CANONICAL_INSTAGRAM,
  eitaa: "https://eitaa.com/hajiasal_ir",
  telegram: "https://t.me/hajiasal_ir",
  rubika: "https://rubika.ir/hajiasal_ir",
  bale: "https://ble.ir/hajiasal_ir",
  soroush: "https://splus.ir/hajiasal_ir",
  supportEitaa: "https://eitaa.com/hajiasal_admin",
  supportTelegram: "https://t.me/hajiasal_admin",
};

function isPlainObject(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === "object" && !Array.isArray(value);
}

function deepMerge<T extends Record<string, unknown>>(
  base: T,
  patch: Partial<T> | Record<string, unknown> | undefined,
): T {
  if (!patch || !isPlainObject(patch)) return { ...base };
  const out: Record<string, unknown> = { ...base };
  for (const [key, value] of Object.entries(patch)) {
    if (key === "__proto__" || key === "constructor" || key === "prototype") {
      continue;
    }
    const current = out[key];
    if (isPlainObject(current) && isPlainObject(value)) {
      out[key] = deepMerge(current, value);
    } else if (value !== undefined) {
      out[key] = value;
    }
  }
  return out as T;
}

function normalizeInstagramUrl(url: string | undefined): string {
  const raw = (url ?? "").trim();
  if (!raw) return CANONICAL_INSTAGRAM;
  return raw;
}

function normalizeSocial(social: SocialLinks | undefined): SocialLinks {
  const merged: SocialLinks = { ...DEFAULT_SOCIAL, ...(social ?? {}) };
  merged.instagram = normalizeInstagramUrl(merged.instagram);
  // Fill any blank messenger URLs from defaults
  for (const key of Object.keys(DEFAULT_SOCIAL) as Array<keyof SocialLinks>) {
    const value = merged[key];
    if (!value || !String(value).trim()) {
      merged[key] = DEFAULT_SOCIAL[key];
    }
  }
  return merged;
}

export function mergeSiteConfig(
  base: SiteConfig,
  overrides: Partial<SiteConfig> | Record<string, unknown> = {},
): SiteConfig {
  const merged = deepMerge(
    base as unknown as Record<string, unknown>,
    overrides as Record<string, unknown>,
  ) as unknown as SiteConfig;

  merged.footer = {
    ...base.footer,
    ...merged.footer,
    phone: merged.footer.phone?.trim() || base.footer.phone,
    email: merged.footer.email?.trim() || base.footer.email,
    address: merged.footer.address?.trim() || base.footer.address,
  };
  merged.social = normalizeSocial(merged.social ?? base.social);
  if (!Array.isArray(merged.faq)) {
    merged.faq = faqSeed as SiteConfig["faq"];
  }

  return merged;
}

export function resolveFaq(settings: SiteConfig): NonNullable<SiteConfig["faq"]> {
  if (Array.isArray(settings.faq)) return settings.faq;
  return faqSeed as NonNullable<SiteConfig["faq"]>;
}

export async function getFaqItems(): Promise<NonNullable<SiteConfig["faq"]>> {
  return resolveFaq(await getSiteSettings());
}

export async function getSiteSettings(): Promise<SiteConfig> {
  if (isMysqlConfigured()) {
    try {
      const row = await mysqlQueryOne<RowDataPacket>(
        "SELECT value FROM site_settings WHERE `key` = ? LIMIT 1",
        [SITE_SETTINGS_KEY],
      );
      if (row?.value) {
        return mergeSiteConfig(
          seed,
          parseJsonField<Partial<SiteConfig>>(row.value, {}),
        );
      }
    } catch (error) {
      console.warn(
        "[site-settings] mysql unavailable, falling back:",
        error instanceof Error ? error.message : error,
      );
    }
  }

  if (canUseFilesystemPersistence()) {
    const overrides = await readJsonFile<Partial<SiteConfig>>(SITE_FILE, {});
    return mergeSiteConfig(seed, overrides);
  }

  const mem = memoryGetSiteOverrides();
  if (mem) {
    return mergeSiteConfig(seed, mem as Partial<SiteConfig>);
  }
  return mergeSiteConfig(seed, {});
}

export async function updateSiteSettings(
  updates: Partial<SiteConfig>,
): Promise<SiteConfig> {
  const current = await getSiteSettings();
  // Allowlist top-level keys only — reject prototype / unexpected mass assignment.
  const allowedKeys = new Set<string>([
    ...(Object.keys(current) as string[]),
    "faq",
  ]);
  const sanitized: Partial<SiteConfig> = {};
  for (const [key, value] of Object.entries(updates)) {
    if (!allowedKeys.has(key)) continue;
    if (key === "__proto__" || key === "constructor" || key === "prototype") {
      continue;
    }
    (sanitized as Record<string, unknown>)[key] = value;
  }
  const merged = mergeSiteConfig(current, sanitized);

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
