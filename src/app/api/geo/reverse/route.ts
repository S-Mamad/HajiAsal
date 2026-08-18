import { NextResponse } from "next/server";
import { z } from "zod";
import { getSessionFromRequest } from "@/lib/auth/session";

const querySchema = z.object({
  lat: z.coerce.number().min(-90).max(90),
  lng: z.coerce.number().min(-180).max(180),
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

  if (!allow(`rev:${session.userId}`)) {
    return NextResponse.json(
      { error: "تعداد درخواست زیاد است. کمی بعد تلاش کنید." },
      { status: 429 },
    );
  }

  const { searchParams } = new URL(request.url);
  const parsed = querySchema.safeParse({
    lat: searchParams.get("lat"),
    lng: searchParams.get("lng"),
  });
  if (!parsed.success) {
    return NextResponse.json({ error: "مختصات نامعتبر است" }, { status: 400 });
  }

  const { lat, lng } = parsed.data;
  const url = `https://api.neshan.org/v5/reverse?lat=${lat}&lng=${lng}`;

  try {
    const res = await fetch(url, {
      headers: { "Api-Key": apiKey },
      next: { revalidate: 0 },
    });
    const data = (await res.json().catch(() => ({}))) as Record<string, unknown>;
    if (!res.ok) {
      return NextResponse.json(
        { error: "خطا در تبدیل موقعیت به آدرس" },
        { status: 502 },
      );
    }

    const state = String(data.state ?? data.province ?? "");
    const city = String(data.city ?? data.county ?? "");
    const neighbourhood = String(data.neighbourhood ?? data.district ?? "");
    const formatted = String(
      data.formatted_address ?? data.address ?? neighbourhood,
    );

    return NextResponse.json({
      success: true,
      province: state,
      city,
      neighbourhood,
      formattedAddress: formatted,
      postalCode: typeof data.postal_code === "string" ? data.postal_code : "",
      lat,
      lng,
    });
  } catch {
    return NextResponse.json(
      { error: "ارتباط با سرویس نقشه برقرار نشد" },
      { status: 502 },
    );
  }
}
