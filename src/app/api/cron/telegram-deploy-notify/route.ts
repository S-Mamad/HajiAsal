import { NextResponse } from "next/server";
import { z } from "zod";
import { isProduction } from "@/lib/server/production";
import { notifyTelegram } from "@/lib/server/telegram-notify";
import { checkRateLimitAsync } from "@/lib/server/rate-limit";

const bodySchema = z.object({
  title: z.string().max(120).optional(),
  summary: z.string().max(4000).optional(),
  summaryLines: z.array(z.string().max(240)).max(30).optional(),
  app: z.string().max(64).optional(),
  version: z.string().max(80).optional(),
  source: z.string().max(80).optional(),
});

function authorize(request: Request): boolean {
  const secret = process.env.CRON_SECRET?.trim();
  if (!secret) return false;
  const auth = request.headers.get("authorization") ?? "";
  const bearer = auth.startsWith("Bearer ") ? auth.slice(7).trim() : "";
  const urlSecret = new URL(request.url).searchParams.get("secret") ?? "";
  return bearer === secret || urlSecret === secret;
}

/**
 * Production deploy notify (cPanel / CI):
 * curl -fsS -X POST -H "Authorization: Bearer $CRON_SECRET" \
 *   -H "Content-Type: application/json" \
 *   -d '{"app":"all","summaryLines":["الرت تلگرام","ضداسپم درگاه"]}' \
 *   https://admin.hajiasal.ir/api/cron/telegram-deploy-notify
 */
export async function POST(request: Request) {
  if (!authorize(request)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const secret = process.env.CRON_SECRET?.trim();
  if (!secret) {
    return NextResponse.json(
      { error: isProduction() ? "پیکربندی ناقص" : "CRON_SECRET تنظیم نشده" },
      { status: 503 },
    );
  }

  const rl = await checkRateLimitAsync(
    "cron-telegram-deploy-notify",
    12,
    60 * 60 * 1000,
  );
  if (!rl.ok) {
    return NextResponse.json(
      { error: "rate_limited", retryAfterSec: rl.retryAfterSec },
      { status: 429 },
    );
  }

  let raw: unknown = {};
  try {
    raw = await request.json();
  } catch {
    raw = {};
  }
  const parsed = bodySchema.safeParse(raw);
  if (!parsed.success) {
    return NextResponse.json({ error: "invalid_body" }, { status: 400 });
  }

  const fromText = (parsed.data.summary ?? "")
    .split(/\r?\n/)
    .map((l) => l.replace(/^[-•*\s]+/, "").trim())
    .filter(Boolean);

  const summaryLines = [
    ...(parsed.data.summaryLines ?? []),
    ...fromText,
  ].slice(0, 20);

  if (summaryLines.length === 0) {
    summaryLines.push("آپدیت پروداکشن اعمال شد");
  }

  const result = await notifyTelegram("deploy.update", {
    title: parsed.data.title ?? "آپدیت پروداکشن حاجی‌عسل",
    summaryLines,
    app: parsed.data.app,
    version: parsed.data.version,
    source: parsed.data.source ?? "deploy",
  });

  return NextResponse.json({
    success: result.sent,
    sent: result.sent,
    skipped: result.skipped,
    error: result.error,
  });
}

export async function GET() {
  return NextResponse.json(
    { error: "Use POST with Authorization Bearer CRON_SECRET" },
    { status: 405 },
  );
}
