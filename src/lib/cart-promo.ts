import type { Product, SiteConfig } from "@/types";

export type ImpulseMode = "popular" | "manual";

export type CartPromoSettings = {
  freeShippingBarEnabled: boolean;
  freeShippingRemainingText: string;
  freeShippingUnlockedText: string;
  impulseEnabled: boolean;
  impulseTitle: string;
  impulseMode: ImpulseMode;
  impulseProductIds: string[];
  impulseLimit: number;
};

export const DEFAULT_CART_PROMO: CartPromoSettings = {
  freeShippingBarEnabled: true,
  freeShippingRemainingText: "فقط {amount} تا ارسال رایگان",
  freeShippingUnlockedText: "ارسال رایگان فعال شد",
  impulseEnabled: true,
  impulseTitle: "پیشنهادهای لحظه آخری",
  impulseMode: "popular",
  impulseProductIds: [],
  impulseLimit: 8,
};

function asText(value: unknown, fallback: string, max: number): string {
  if (typeof value !== "string") return fallback;
  const trimmed = value.trim();
  if (!trimmed) return fallback;
  return trimmed.slice(0, max);
}

function asIds(value: unknown, max = 24): string[] {
  if (!Array.isArray(value)) return [];
  const seen = new Set<string>();
  const out: string[] = [];
  for (const raw of value) {
    if (typeof raw !== "string") continue;
    const id = raw.trim();
    if (!id || seen.has(id)) continue;
    seen.add(id);
    out.push(id);
    if (out.length >= max) break;
  }
  return out;
}

export function resolveCartPromo(
  settings: Partial<SiteConfig> | null | undefined,
): CartPromoSettings {
  const raw = settings?.cartPromo;
  const limitRaw = raw?.impulseLimit;
  const limit =
    typeof limitRaw === "number" && Number.isFinite(limitRaw)
      ? Math.min(16, Math.max(1, Math.round(limitRaw)))
      : DEFAULT_CART_PROMO.impulseLimit;

  return {
    freeShippingBarEnabled: raw?.freeShippingBarEnabled !== false,
    freeShippingRemainingText: asText(
      raw?.freeShippingRemainingText,
      DEFAULT_CART_PROMO.freeShippingRemainingText,
      120,
    ),
    freeShippingUnlockedText: asText(
      raw?.freeShippingUnlockedText,
      DEFAULT_CART_PROMO.freeShippingUnlockedText,
      120,
    ),
    impulseEnabled: raw?.impulseEnabled !== false,
    impulseTitle: asText(
      raw?.impulseTitle,
      DEFAULT_CART_PROMO.impulseTitle,
      80,
    ),
    impulseMode: raw?.impulseMode === "manual" ? "manual" : "popular",
    impulseProductIds: asIds(raw?.impulseProductIds),
    impulseLimit: limit,
  };
}

/** Replace `{amount}` in admin copy. If the token is missing, the template is used as-is. */
export function interpolateAmountText(template: string, amountLabel: string): string {
  return template.split("{amount}").join(amountLabel);
}

export function pickImpulseProducts(
  catalog: Product[],
  options: {
    mode: ImpulseMode;
    ids: string[];
    inCartIds: ReadonlySet<string>;
    limit: number;
  },
): Product[] {
  const limit = Math.min(16, Math.max(1, options.limit));
  const available = catalog.filter(
    (p) =>
      !options.inCartIds.has(p.id) &&
      p.inStock !== false &&
      (p.weightOptions?.length ?? 0) > 0,
  );

  if (options.mode === "manual") {
    const byId = new Map(available.map((p) => [p.id, p]));
    const picked: Product[] = [];
    for (const id of options.ids) {
      const product = byId.get(id);
      if (product) picked.push(product);
      if (picked.length >= limit) break;
    }
    return picked;
  }

  return available.slice(0, limit);
}
