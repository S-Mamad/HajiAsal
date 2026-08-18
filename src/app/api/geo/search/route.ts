import { NextResponse } from "next/server";
import { z } from "zod";
import { getSessionFromRequest } from "@/lib/auth/session";

const querySchema = z.object({
  term: z.string().min(2).max(120),
  lat: z.coerce.number().min(-90).max(90).optional(),
  lng: z.coerce.number().min(-180).max(180).optional(),
});

const rateBucket = new Map<string, { count: number; resetAt: number }>();

function allow(key: string, max = 30, windowMs = 60_000): boolean {
  const now = Date.now();
  const cur = rateBucket.get(key);
  if (!cur || now > cur.resetAt) {
    rateBucket.set(key, { count: 1, resetAt: now + windowMs });
    return true;
  }
  if (cur.count >= max) return false;
  cur.count += 1;
  return true;
}

export async function GET(request: Request) {
  const session = getSessionFromRequest(request);
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const apiKey = process.env.NESHAN_API_KEY?.trim();
  if (!apiKey) {
    return NextResponse.json(
      { error: "سرویس نقشه پیکربندی نشده است" },
      { status: 503 },
    );
  }

  if (!allow(`search:${session.userId}`)) {
    return NextResponse.json(
      { error: "تعداد درخواست زیاد است. کمی بعد تلاش کنید." },
      { status: 429 },
    );
  }

  const { searchParams } = new URL(request.url);
  const parsed = querySchema.safeParse({
    term: searchParams.get("term"),
    lat: searchParams.get("lat") ?? undefined,
    lng: searchParams.get("lng") ?? undefined,
  });
  if (!parsed.success) {
    return NextResponse.json({ error: "عبارت جستجو نامعتبر است" }, { status: 400 });
  }

  const lat = parsed.data.lat ?? 31.8974;
  const lng = parsed.data.lng ?? 54.3569;
  const url = `https://api.neshan.org/v1/search?term=${encodeURIComponent(parsed.data.term)}&lat=${lat}&lng=${lng}`;

  try {
    const res = await fetch(url, {
      headers: { "Api-Key": apiKey },
      next: { revalidate: 0 },
    });
    const data = (await res.json().catch(() => ({}))) as {
      items?: Array<{
        title?: string;
        address?: string;
        location?: { x?: number; y?: number };
      }>;
    };
    if (!res.ok) {
      return NextResponse.json({ error: "جستجوی آدرس ناموفق بود" }, { status: 502 });
    }

    const items = (data.items ?? []).slice(0, 8).map((item) => ({
      title: item.title ?? "",
      address: item.address ?? "",
      lat: item.location?.y ?? null,
      lng: item.location?.x ?? null,
    }));

    return NextResponse.json({ success: true, items });
  } catch {
    return NextResponse.json(
      { error: "ارتباط با سرویس نقشه برقرار نشد" },
      { status: 502 },
    );
  }
}
