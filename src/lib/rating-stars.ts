/** Clamp to 0–5 and round to one decimal so the number and stars stay in sync. */
export function displayRating(rating: number): number {
  if (!Number.isFinite(rating)) return 0;
  return Math.round(Math.min(5, Math.max(0, rating)) * 10) / 10;
}

/** Per-star fill from 0 to 1, left-to-right in the array (star 1 first). */
export function ratingStarFills(rating: number): number[] {
  const value = displayRating(rating);
  return [0, 1, 2, 3, 4].map((index) => {
    const raw = Math.min(1, Math.max(0, value - index));
    return Math.round(raw * 100) / 100;
  });
}
