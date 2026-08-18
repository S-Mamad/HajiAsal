/** Zibal (and similar IPGs) reject amounts below 1000 Rials (= 100 Toman). */
export const GATEWAY_MIN_AMOUNT_RIAL = 1000;
export const GATEWAY_MIN_AMOUNT_TOMAN = 100;

/** True when payable total is below gateway minimum (incl. fully free / 0). */
export function isBelowGatewayMinimum(totalToman: number): boolean {
  if (!Number.isFinite(totalToman) || totalToman < 0) return true;
  const toman = Math.round(totalToman);
  return toman < GATEWAY_MIN_AMOUNT_TOMAN || toman * 10 < GATEWAY_MIN_AMOUNT_RIAL;
}
