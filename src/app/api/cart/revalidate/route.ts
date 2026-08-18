import { NextResponse } from "next/server";
import { z } from "zod";
import { getProductByIdAsync } from "@/lib/server/products-store";
import { getEffectiveWeightPrice } from "@/lib/products";
import { imageFitForSrc } from "@/lib/product-image";
import { isProductPurchasable } from "@/lib/product-availability";
import {
  CART_HOLD_COOKIE,
  getHeldQtyForProduct,
} from "@/lib/server/cart-holds";

const itemSchema = z.object({
  productId: z.string().min(1),
  weightGrams: z.number().int().positive(),
  quantity: z.number().int().min(1).max(100),
  currentPrice: z.number().nonnegative().optional(),
});

const bodySchema = z.object({
  items: z.array(itemSchema).max(50),
});

function readHoldSession(request: Request): string | null {
  const cookie = request.headers.get("cookie") ?? "";
  const match = cookie.match(
    new RegExp(`(?:^|;\\s*)${CART_HOLD_COOKIE}=([a-f0-9]{32})`, "i"),
  );
  return match?.[1] ?? null;
}

export async function POST(request: Request) {
  let json: unknown;
  try {
    json = await request.json();
  } catch {
    return NextResponse.json(
      { success: false, message: "درخواست نامعتبر است" },
      { status: 400 },
    );
  }

  const parsed = bodySchema.safeParse(json);
  if (!parsed.success) {
    return NextResponse.json(
      { success: false, message: "اقلام سبد نامعتبر است" },
      { status: 400 },
    );
  }

  const holdSession = readHoldSession(request);

  const results = await Promise.all(
    parsed.data.items.map(async (item) => {
      const product = await getProductByIdAsync(item.productId);
      if (!product) {
        return {
          productId: item.productId,
          weightGrams: item.weightGrams,
          availability: "out_of_stock" as const,
          inStock: false,
          stockQty: 0,
          livePrice: item.currentPrice ?? 0,
        };
      }

      const weight =
        product.weightOptions.find((w) => w.grams === item.weightGrams) ??
        product.weightOptions[0];
      const livePrice = weight
        ? getEffectiveWeightPrice(product, weight)
        : item.currentPrice ?? 0;
      const purchasable = isProductPurchasable(product);

      const catalogStock =
        typeof product.stockQty === "number" ? product.stockQty : undefined;
      const othersHeld =
        catalogStock == null
          ? 0
          : await getHeldQtyForProduct(product.id, holdSession);
      const stockQty =
        catalogStock == null
          ? catalogStock
          : Math.max(0, catalogStock - othersHeld);

      let availability: "ok" | "price_changed" | "out_of_stock" = "ok";
      if (!purchasable || (stockQty != null && stockQty <= 0)) {
        availability = "out_of_stock";
      } else if (
        typeof item.currentPrice === "number" &&
        item.currentPrice > 0 &&
        livePrice !== item.currentPrice
      ) {
        availability = "price_changed";
      }

      return {
        productId: item.productId,
        weightGrams: item.weightGrams,
        availability,
        inStock: availability !== "out_of_stock",
        stockQty,
        livePrice,
        title: product.title,
        image: product.images[0],
        imageFit: imageFitForSrc(product.imageFits, product.images[0]) ?? null,
        sellerId: product.sellerId,
      };
    }),
  );

  return NextResponse.json({ success: true, items: results });
}
