import { NextResponse } from "next/server";
import { z } from "zod";
import { isProduction } from "@/lib/server/production";
import { enqueueTelegramEvent } from "@/lib/server/telegram/outbox";
import { wakeTelegramOutboxWorker } from "@/lib/server/telegram/wake";
import type { TelegramNotifyEvent, TelegramPayloadMap } from "@/lib/server/telegram/events";

export const runtime = "nodejs";

/**
 * Compatibility shim for storefronts still posting to the old HTTP relay.
 * New code writes MySQL outbox directly; this path also enqueues.
 */
const bodySchema = z.object({
  event: z.string().min(1).max(64),
  payload: z.unknown(),
});

export async function POST(request: Request) {
  const secret = process.env.CRON_SECRET?.trim();
  if (!secret) {
    return NextResponse.json(
      { error: isProduction() ? "پیکربندی ناقص" : "CRON_SECRET تنظیم نشده" },
      { status: 503 },
    );
  }

  const auth = request.headers.get("authorization") ?? "";
  const bearer = auth.startsWith("Bearer ") ? auth.slice(7).trim() : "";
  const urlSecret = new URL(request.url).searchParams.get("secret") ?? "";
  if (bearer !== secret && urlSecret !== secret) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  let raw: unknown;
  try {
    raw = await request.json();
  } catch {
    return NextResponse.json({ error: "invalid_json" }, { status: 400 });
  }

  const parsed = bodySchema.safeParse(raw);
  if (!parsed.success) {
    return NextResponse.json({ error: "invalid_body" }, { status: 400 });
  }

  if (
    parsed.data.event === "cart.add" ||
    parsed.data.event === "funnel.digest"
  ) {
    return NextResponse.json({
      success: true,
      sent: false,
      skipped: "event_dropped",
    });
  }

  const result = await enqueueTelegramEvent(
    parsed.data.event as TelegramNotifyEvent,
    parsed.data.payload as TelegramPayloadMap[TelegramNotifyEvent],
  );
  if (result.queued) void wakeTelegramOutboxWorker();

  return NextResponse.json({
    success: result.queued,
    sent: result.queued,
    skipped: result.skipped,
    error: result.error,
    via: "outbox",
  });
}

export async function GET() {
  return NextResponse.json(
    { error: "Use POST with Authorization Bearer CRON_SECRET" },
    { status: 405 },
  );
}
