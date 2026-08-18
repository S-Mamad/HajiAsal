export type TileCoords = { z: number; x: number; y: number };

const MAX_ZOOM = 19;

export function parseTileCoords(
  zRaw: string,
  xRaw: string,
  yRaw: string,
): TileCoords | null {
  if (!/^\d+$/.test(zRaw) || !/^\d+$/.test(xRaw) || !/^\d+$/.test(yRaw)) {
    return null;
  }
  const z = Number(zRaw);
  const x = Number(xRaw);
  const y = Number(yRaw);
  if (!Number.isInteger(z) || !Number.isInteger(x) || !Number.isInteger(y)) {
    return null;
  }
  if (z < 0 || z > MAX_ZOOM) return null;
  const max = 2 ** z;
  if (x < 0 || y < 0 || x >= max || y >= max) return null;
  return { z, x, y };
}

/**
 * Upstream slippy-map URLs. OSM.org is last because it is often blocked for
 * Iranian browsers; the checkout map proxies these from our origin instead.
 */
export function tileUpstreamUrls({ z, x, y }: TileCoords): string[] {
  return [
    `https://basemaps.cartocdn.com/rastertiles/voyager/${z}/${x}/${y}.png`,
    `https://server.arcgisonline.com/ArcGIS/rest/services/World_Street_Map/MapServer/tile/${z}/${y}/${x}`,
    `https://tile.openstreetmap.org/${z}/${x}/${y}.png`,
  ];
}

export function isGeoServiceUnavailable(status: number, message: string): boolean {
  return (
    status === 503 ||
    status === 401 ||
    message.includes("پیکربندی")
  );
}
