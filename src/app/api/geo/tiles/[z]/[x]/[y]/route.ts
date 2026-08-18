import { NextResponse } from "next/server";
import { getSessionFromRequest } from "@/lib/auth/session";
import { parseTileCoords, tileUpstreamUrls } from "@/lib/geo/tiles";

type RouteContext = { params: Promise<{ z: string; x: string; y: string }> };

const TILE_UA =
  "HajiAsalMap/1.0 (https://hajiasal.ir; checkout address picker)";

export async function GET(request: Request, context: RouteContext) {
  const session = getSessionFromRequest(request);
  if (!session) {
    return new NextResponse(null, { status: 401 });
  }

  const { z, x, y } = await context.params;
  const coords = parseTileCoords(z, x, y);
  if (!coords) {
    return NextResponse.json({ error: "مختصات تایل نامعتبر است" }, { status: 400 });
  }

  const urls = tileUpstreamUrls(coords);
  for (const url of urls) {
    try {
      const res = await fetch(url, {
        headers: {
          Accept: "image/png,image/jpeg,image/*",
          "User-Agent": TILE_UA,
        },
        next: { revalidate: 86_400 },
      });
      if (!res.ok) continue;
      const buf = await res.arrayBuffer();
      if (buf.byteLength < 80) continue;
      const rawType = res.headers.get("content-type") ?? "image/png";
      const contentType = rawType.startsWith("image/") ? rawType : "image/png";
      return new NextResponse(buf, {
        status: 200,
        headers: {
          "Content-Type": contentType,
          "Cache-Control":
            "public, max-age=86400, s-maxage=86400, stale-while-revalidate=604800",
        },
      });
    } catch {
      continue;
    }
  }

  return new NextResponse(null, { status: 502 });
}
