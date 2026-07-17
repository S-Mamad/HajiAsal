import { NextResponse } from "next/server";
import { z } from "zod";
import type { RowDataPacket } from "mysql2/promise";
import { isAdminRequestAuthenticatedAsync } from "@/lib/server/admin";
import {
  isMysqlConfigured,
  mysqlExecute,
  mysqlQuery,
  newId,
} from "@/lib/server/mysql";
import {
  getSiteSettings,
  updateSiteSettings,
} from "@/lib/server/site-settings";
import { logAdminAction } from "@/lib/server/audit-log";

const patchSchema = z.object({
  shippingCost: z.number().min(0).optional(),
});

export async function GET(request: Request) {
  if (!(await isAdminRequestAuthenticatedAsync(request))) {
    return NextResponse.json({ error: "دسترسی غیرمجاز" }, { status: 401 });
  }

  let dbPing = false;
  let dbError: string | null = null;
  let sessionWriteOk = false;

  if (isMysqlConfigured()) {
    try {
      await mysqlQuery<RowDataPacket>("SELECT id FROM admin_sessions LIMIT 1");
      dbPing = true;
    } catch (err) {
      dbError = err instanceof Error ? err.message : "خطای اتصال به دیتابیس";
    }

    if (dbPing) {
      const dryId = newId();
      try {
        await mysqlExecute(
          "INSERT INTO admin_sessions (id, token_hash, expires_at) VALUES (?, ?, ?)",
          [dryId, "health-check-dry-run", new Date(Date.now() - 60_000)],
        );
        sessionWriteOk = true;
        await mysqlExecute("DELETE FROM admin_sessions WHERE id = ?", [dryId]);
      } catch {
        sessionWriteOk = false;
      }
    }
  }

  const settings = await getSiteSettings();
  const missing: string[] = [];
  if (!process.env.NEXT_PUBLIC_SITE_URL) missing.push("NEXT_PUBLIC_SITE_URL");
  if (!isMysqlConfigured()) {
    missing.push("MYSQL_HOST / MYSQL_USER / MYSQL_DATABASE / MYSQL_PASSWORD");
  }
  if (!process.env.ADMIN_PASSWORD) missing.push("ADMIN_PASSWORD");
  if (!process.env.AUTH_SESSION_SECRET) missing.push("AUTH_SESSION_SECRET");
  const smsConfigured =
    Boolean(process.env.MELIPAYAMAK_OTP_URL?.trim()) ||
    Boolean(process.env.MELIPAYAMAK_OTP_TOKEN?.trim()) ||
    Boolean(process.env.SMS_API_KEY && process.env.SMS_SENDER);
  if (!smsConfigured) {
    missing.push("MELIPAYAMAK_OTP_URL یا SMS_API_KEY / SMS_SENDER (برای OTP واقعی)");
  }

  return NextResponse.json({
    env: {
      mysql: isMysqlConfigured(),
      mysqlPing: dbPing,
      mysqlError: dbError,
      // backward-compatible aliases for old admin UI
      supabase: isMysqlConfigured(),
      supabasePing: dbPing,
      supabaseError: dbError,
      sessionWriteOk,
      sms: smsConfigured,
      zarinpal: Boolean(
        process.env.ZARINPAL_MERCHANT_ID &&
          process.env.ZARINPAL_MERCHANT_ID !== "your_merchant_id",
      ),
      authSecret: Boolean(process.env.AUTH_SESSION_SECRET),
      adminPassword: Boolean(process.env.ADMIN_PASSWORD),
      siteUrl: Boolean(process.env.NEXT_PUBLIC_SITE_URL),
    },
    settings: {
      shippingCost: settings.shippingCost,
    },
    missing,
    productionReady:
      isMysqlConfigured() &&
      dbPing &&
      sessionWriteOk &&
      Boolean(process.env.ADMIN_PASSWORD) &&
      Boolean(process.env.AUTH_SESSION_SECRET) &&
      Boolean(process.env.NEXT_PUBLIC_SITE_URL),
  });
}

export async function PATCH(request: Request) {
  if (!(await isAdminRequestAuthenticatedAsync(request))) {
    return NextResponse.json({ error: "دسترسی غیرمجاز" }, { status: 401 });
  }

  try {
    const body = await request.json();
    const parsed = patchSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: "اطلاعات نامعتبر" }, { status: 400 });
    }

    const updated = await updateSiteSettings(parsed.data);
    await logAdminAction({
      action: "settings.update",
      entityType: "site_settings",
      entityId: "hajiasal",
      payload: parsed.data,
    });

    return NextResponse.json({ success: true, settings: updated });
  } catch (err) {
    const message = err instanceof Error ? err.message : "خطای سرور";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
