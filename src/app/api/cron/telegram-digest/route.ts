import { NextResponse } from "next/server";
import { isProduction } from "@/lib/server/production";
import { tehranDateKey } from "@/lib/server/telegram-sales-stats";
import {
  claimTelegramDigestDay,
  clearTelegramDigestClaim,
  markTelegramDigestSent,
  wasDigestSentForDate,
} from "@/lib/server/telegram-digest-state";
import { sendTelegramDigest } from "@/lib/server/telegram-digest";

/**
 * cPanel cron (daily, ideally ~23:55 Asia/Tehran):
 * curl -fsS -H "Authorization: Bearer $CRON_SECRET" \
 *   https://admin.hajiasal.ir/api/cron/telegram-digest
 *
 * Force resend same day: add ?force=1
 */
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
  const url = new URL(request.url);
  const urlSecret = url.searchParams.get("secret") ?? "";
  if (bearer !== secret && urlSecret !== secret) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const force =
    url.searchParams.get("force") === "1" ||
    url.searchParams.get("force") === "true";
  const todayKey = tehranDateKey();

  try {
    if (!force) {
      if (await wasDigestSentForDate(todayKey)) {
        return NextResponse.json({
          success: true,
          skipped: "already_sent_today",
          dateKey: todayKey,
        });
      }
      const claimed = await claimTelegramDigestDay(todayKey);
      if (!claimed) {
        return NextResponse.json({
          success: true,
          skipped: "already_sent_today",
          dateKey: todayKey,
        });
      }
    } else {
      // Force: refresh claim so subsequent non-force runs skip.
      await markTelegramDigestSent(todayKey);
    }

    const result = await sendTelegramDigest();

    if (!result.sent) {
      await clearTelegramDigestClaim(todayKey);
    }

    return NextResponse.json({
      success: true,
      sent: result.sent,
      skipped: result.skipped,
      error: result.error,
      dateKey: todayKey,
      salesToday: result.sales.salesToday,
      ordersToday: result.sales.ordersToday,
      pendingFresh: result.sales.pendingOrdersFresh,
      pendingStale: result.sales.pendingOrdersStale,
    });
  } catch (error) {
    await clearTelegramDigestClaim(todayKey).catch(() => undefined);
    console.error(
      "[cron/telegram-digest]",
      error instanceof Error ? error.message : error,
    );
    return NextResponse.json(
      { success: false, error: "digest_failed" },
      { status: 500 },
    );
  }
}

export async function GET(request: Request) {
  return POST(request);
}
