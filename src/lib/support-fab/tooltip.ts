import type { SupportPageKind } from "./context";
import { contextualTooltip } from "./context";

export type SupportTooltipKind = "welcome" | "context";

export function resolveTooltip(input: {
  pageKind: SupportPageKind;
  productOutOfStock: boolean;
  rageAssist: boolean;
  cartDwellElapsed: boolean;
}): { copy: string; kind: SupportTooltipKind } {
  const copy = contextualTooltip(input);
  const kind: SupportTooltipKind =
    input.rageAssist ||
    (input.pageKind === "product" && input.productOutOfStock) ||
    (input.pageKind === "cart" && input.cartDwellElapsed) ||
    input.pageKind === "checkout"
      ? "context"
      : "welcome";
  return { copy, kind };
}

export function shouldShowTooltip(
  kind: SupportTooltipKind,
  welcomeSeen: boolean,
): boolean {
  if (kind === "welcome") return !welcomeSeen;
  return true;
}

export function readFlag(storage: Pick<Storage, "getItem">, key: string): boolean {
  try {
    return storage.getItem(key) === "1";
  } catch {
    return false;
  }
}

export function writeFlag(storage: Pick<Storage, "setItem">, key: string): void {
  try {
    storage.setItem(key, "1");
  } catch {
    /* private mode */
  }
}
