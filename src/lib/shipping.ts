export type ShippingMethodId = "standard" | "express" | "pickup";

export type ShippingMethodCopy = {
  label: string;
  description: string;
  eta: string;
};

export type ShippingQuoteSettings = {
  shippingCost: number;
  expressShippingCost: number;
  pickupShippingCost: number;
  freeShippingThreshold: number;
  freeShippingIncludesExpress: boolean;
};

export const DEFAULT_EXPRESS_SURCHARGE = 35_000;

export const DEFAULT_SHIPPING_METHODS: Record<
  ShippingMethodId,
  ShippingMethodCopy
> = {
  standard: {
    label: "پست پیشتاز",
    description: "اقتصادی",
    eta: "۷ تا ۱۵ روز کاری",
  },
  express: {
    label: "پست ویژه",
    description: "ارسال سریع",
    eta: "۲ تا ۷ روز کاری",
  },
  pickup: {
    label: "تحویل حضوری",
    description: "",
    eta: "هماهنگی تلفنی",
  },
};

function nonNeg(value: unknown, fallback: number): number {
  const n = Number(value);
  if (!Number.isFinite(n) || n < 0) return fallback;
  return n;
}

export function resolveShippingQuoteSettings(
  settings: Partial<ShippingQuoteSettings> & { shippingCost?: number },
): ShippingQuoteSettings {
  const shippingCost = nonNeg(settings.shippingCost, 0);
  const expressFallback = shippingCost + DEFAULT_EXPRESS_SURCHARGE;
  return {
    shippingCost,
    expressShippingCost:
      settings.expressShippingCost == null
        ? expressFallback
        : nonNeg(settings.expressShippingCost, expressFallback),
    pickupShippingCost: nonNeg(settings.pickupShippingCost, 0),
    freeShippingThreshold: nonNeg(settings.freeShippingThreshold, 0),
    freeShippingIncludesExpress: settings.freeShippingIncludesExpress !== false,
  };
}

export function resolveShippingMethodCopy(
  id: ShippingMethodId,
  methods?: Partial<Record<ShippingMethodId, Partial<ShippingMethodCopy>>>,
): ShippingMethodCopy {
  const defaults = DEFAULT_SHIPPING_METHODS[id];
  const override = methods?.[id];
  return {
    label: override?.label?.trim() || defaults.label,
    description: override?.description ?? defaults.description,
    eta: override?.eta?.trim() || defaults.eta,
  };
}

/** Pure helper — cart UI, checkout, and server must use the same rules. */
export function shippingCostForMethod(
  method: string | undefined,
  subtotal: number,
  settings: Partial<ShippingQuoteSettings> & { shippingCost?: number },
): number {
  const quote = resolveShippingQuoteSettings(settings);
  if (method === "pickup") return quote.pickupShippingCost;

  const overFree =
    quote.freeShippingThreshold > 0 && subtotal >= quote.freeShippingThreshold;
  if (overFree) {
    if (method === "express" && !quote.freeShippingIncludesExpress) {
      return quote.expressShippingCost;
    }
    return 0;
  }

  if (method === "express") return quote.expressShippingCost;
  return quote.shippingCost;
}
