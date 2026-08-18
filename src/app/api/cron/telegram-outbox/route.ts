import { NextResponse } from "next/server";
import { isProduction } from "@/lib/server/production";
import { getAppRole } from "@/lib/server/app-role";
import { processTelegramOutbox } from "@/lib/server/telegram/worker";
import {
  countTelegramDlq,
  countTelegramOutboxPending,
  ensureTelegramOutboxTables,
} from "@/lib/server/telegram/outbox";

export const runtime = "nodejs";

function unauthorizedOrMissingSecret(): NextResponse | null {
  const secret = process.env.CRON_SECRET?.trim();
  if (!secret) {
    return NextResponse.json(
      { error: isProduction() ? "پیکربندی ناقص" : "CRON_SECRET تنظیم نشده" },
      { status: 503 },
    );
  }
  return null;
}

function isAuthorized(request: Request, secret: string): boolean {
  const auth = request.headers.get("authorization") ?? "";
  const bearer = auth.startsWith("Bearer ") ? auth.slice(7).trim() : "";
  const urlSecret = new URL(request.url).searchParams.get("secret") ?? "";
  return bearer === secret || urlSecret === secret;
}

async function run(request: Request) {
  const missing = unauthorizedOrMissingSecret();
  if (missing) return missing;

  const secret = process.env.CRON_SECRET!.trim();
  if (!isAuthorized(request, secret)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const role = getAppRole();
  if (role !== "admin" && role !== "all") {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  await ensureTelegramOutboxTables();
  const stats = await processTelegramOutbox();
  const pending = await countTelegramOutboxPending();
  const dlq = await countTelegramDlq();

  return NextResponse.json({
    success: true,
    ...stats,
    pending,
    dlq,
  });
}

export async function POST(request: Request) {
  try {
    return await run(request);
  } catch (error) {
    console.error(
      "[cron/telegram-outbox]",
      error instanceof Error ? error.message : error,
    );
    return NextResponse.json(
      { success: false, error: "outbox_failed" },
      { status: 500 },
    );
  }
}

export async function GET(request: Request) {
  return POST(request);
}
