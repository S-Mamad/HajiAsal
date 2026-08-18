import { NextResponse } from "next/server";
import { searchPublicProductsAsync } from "@/lib/server/product-search";
import { checkRateLimitAsync, getClientIp } from "@/lib/server/rate-limit";
import { getSiteSettings } from "@/lib/server/site-settings";
import { resolveSearchUi } from "@/lib/search-ui";

function parseLimit(raw: string | null): number {
  const n = Number(raw ?? 12);
  if (!Number.isFinite(n)) return 12;
  return Math.min(Math.max(Math.floor(n), 1), 24);
}

export async function GET(request: Request) {
  const ip = getClientIp(request);
  const rate = await checkRateLimitAsync(`search:${ip}`, 90, 60_000);
  if (!rate.ok) {
    return NextResponse.json(
      {
        error: "تعداد درخواست جستجو زیاد است. چند ثانیه بعد دوباره تلاش کنید.",
        retryAfterSec: rate.retryAfterSec,
      },
      {
        status: 429,
        headers: {
          "Retry-After": String(Math.max(rate.retryAfterSec, 1)),
        },
      },
    );
  }

  const { searchParams } = new URL(request.url);
  const raw = searchParams.get("q") ?? "";
  const limit = parseLimit(searchParams.get("limit"));

  if (!raw.trim()) {
    const searchUi = resolveSearchUi(await getSiteSettings());
    return NextResponse.json(
      {
        results: [],
        query: "",
        total: 0,
        suggestions: searchUi.suggestions,
      },
      {
        headers: {
          "Cache-Control": "private, max-age=60",
        },
      },
    );
  }

  const started = Date.now();
  const { results, total, query } = await searchPublicProductsAsync(raw, limit);

  return NextResponse.json(
    {
      results,
      query,
      total,
      limit,
      tookMs: Date.now() - started,
    },
    {
      headers: {
        "Cache-Control": "private, max-age=30, stale-while-revalidate=120",
      },
    },
  );
}
