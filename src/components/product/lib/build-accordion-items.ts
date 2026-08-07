import type { Product } from "@/types";
import type { AccordionItem } from "../types";

/** Build PDP accordion sections from product content fields. */
export function buildProductAccordionItems(product: Product): AccordionItem[] {
  return [
    { title: "توضیحات", content: product.longDescription },
    ...(product.ingredients
      ? [{ title: "ترکیبات", content: product.ingredients }]
      : []),
    ...(product.shippingInfo
      ? [{ title: "ارسال", content: product.shippingInfo }]
      : []),
  ];
}

export const DEFAULT_SHIPPING_LABEL = "ارسال سراسری با بسته‌بندی ایمن";
export const DEFAULT_TRUST_TITLE = "ضمانت کیفیت";
