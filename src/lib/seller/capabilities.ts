export type SellerCapability =
  | "products.manage"
  | "products.seo"
  | "products.brand_assign"
  | "orders.manage"
  | "inventory.manage"
  | "wallet.view"
  | "wallet.withdraw"
  | "customers.view"
  | "reports.view"
  | "reports.export"
  | "tickets.manage"
  | "reviews.reply"
  | "qa.reply"
  | "discounts.manage"
  | "media.manage"
  | "tools.import_export"
  | "settings.manage"
  | "notifications.view"
  | "print.export"
  | "profile.manage";

export const DEFAULT_SELLER_CAPABILITIES: Record<SellerCapability, boolean> = {
  "products.manage": true,
  "products.seo": false,
  "products.brand_assign": false,
  "orders.manage": true,
  "inventory.manage": true,
  "wallet.view": true,
  "wallet.withdraw": true,
  "customers.view": true,
  "reports.view": true,
  "reports.export": true,
  "tickets.manage": true,
  "reviews.reply": true,
  "qa.reply": true,
  "discounts.manage": false,
  "media.manage": true,
  "tools.import_export": true,
  "settings.manage": true,
  "notifications.view": true,
  "print.export": true,
  "profile.manage": true,
};

export type SellerCapabilitiesMap = Partial<Record<SellerCapability, boolean>>;

export function resolveCapabilities(
  raw: SellerCapabilitiesMap | null | undefined,
): Record<SellerCapability, boolean> {
  return {
    ...DEFAULT_SELLER_CAPABILITIES,
    ...(raw ?? {}),
  };
}

export function canSeller(
  capabilities: SellerCapabilitiesMap | null | undefined,
  key: SellerCapability,
): boolean {
  return resolveCapabilities(capabilities)[key] === true;
}

export function parseCapabilitiesJson(value: unknown): SellerCapabilitiesMap {
  if (value == null) return {};
  if (typeof value === "object" && !Array.isArray(value)) {
    return value as SellerCapabilitiesMap;
  }
  if (typeof value === "string") {
    try {
      const parsed = JSON.parse(value) as unknown;
      if (parsed && typeof parsed === "object" && !Array.isArray(parsed)) {
        return parsed as SellerCapabilitiesMap;
      }
    } catch {
      return {};
    }
  }
  return {};
}
