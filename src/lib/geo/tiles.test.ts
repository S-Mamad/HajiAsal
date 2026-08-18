import { describe, expect, it } from "vitest";
import {
  isGeoServiceUnavailable,
  parseTileCoords,
  tileUpstreamUrls,
} from "./tiles";

describe("parseTileCoords", () => {
  it("accepts a valid zoom-16 tile", () => {
    expect(parseTileCoords("16", "42186", "25821")).toEqual({
      z: 16,
      x: 42186,
      y: 25821,
    });
  });

  it("rejects out-of-range indices and junk", () => {
    expect(parseTileCoords("16", "999999", "1")).toBeNull();
    expect(parseTileCoords("-1", "0", "0")).toBeNull();
    expect(parseTileCoords("20", "0", "0")).toBeNull();
    expect(parseTileCoords("3", "1.5", "1")).toBeNull();
    expect(parseTileCoords("3", "../8", "1")).toBeNull();
    expect(parseTileCoords("abc", "1", "1")).toBeNull();
  });
});

describe("tileUpstreamUrls", () => {
  it("never interpolates user strings into the host", () => {
    const urls = tileUpstreamUrls({ z: 3, x: 4, y: 5 });
    expect(urls[0]).toBe(
      "https://basemaps.cartocdn.com/rastertiles/voyager/3/4/5.png",
    );
    expect(urls.every((u) => u.startsWith("https://"))).toBe(true);
  });
});

describe("isGeoServiceUnavailable", () => {
  it("flags missing key / auth, not a partial reverse result", () => {
    expect(isGeoServiceUnavailable(503, "سرویس نقشه پیکربندی نشده است")).toBe(
      true,
    );
    expect(isGeoServiceUnavailable(401, "Unauthorized")).toBe(true);
    expect(isGeoServiceUnavailable(200, "")).toBe(false);
    expect(isGeoServiceUnavailable(502, "خطا در تبدیل موقعیت به آدرس")).toBe(
      false,
    );
  });
});
