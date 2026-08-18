import { NextResponse } from "next/server";
import { getAppRole } from "@/lib/server/app-role";
import { isTelegramBotConfigured } from "@/lib/server/telegram/config";
import { ingestTelegramUpdate } from "@/lib/server/telegram/ingest";
import { wakeTelegramOutboxWorker } from "@/lib/server/telegram/wake";

export const runtime = "nodejs";

function webhookAllowedOnThisApp(): boolean {
  const role = getAppRole();
  return role === "admin" || role === "all";
}

function verifySecret(request: Request): boolean {
  const expected = process.env.TELEGRAM_WEBHOOK_SECRET?.trim();
  if (!expected) return false;
  const header = request.headers.get("x-telegram-bot-api-secret-token") ?? "";
  return header === expected;
}

export async function POST(request: Request) {
  if (!webhookAllowedOnThisApp()) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  if (!verifySecret(request)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  if (!isTelegramBotConfigured()) {
    return NextResponse.json({ ok: true, skipped: "bot_not_configured" });
  }

  let update: unknown;
  try {
    update = await request.json();
  } catch {
    return NextResponse.json({ error: "Bad request" }, { status: 400 });
  }

  const result = await ingestTelegramUpdate(update);
  if (result.queued) {
    void wakeTelegramOutboxWorker();
  }

  return NextResponse.json({ ok: true, ...result });
}
