import { gateAdmin } from "@/lib/server/admin-gate";
import { NextResponse } from "next/server";
import { z } from "zod";
import type { RowDataPacket } from "mysql2/promise";
import {
  isMysqlConfigured,
  mysqlQuery,
} from "@/lib/server/mysql";
import {
  getSiteSettings,
  updateSiteSettings,
} from "@/lib/server/site-settings";
import { logAdminAction } from "@/lib/server/audit-log";
import { isZibalConfigured, isZibalRefundConfigured } from "@/lib/server/zibal";
import {
  resolveShippingMethodCopy,
  resolveShippingQuoteSettings,
} from "@/lib/shipping";
import { resolveCartPromo } from "@/lib/cart-promo";
import { normalizeSearchSuggestions, resolveSearchUi } from "@/lib/search-ui";
import { resolveSupportWidgetCopy } from "@/lib/support-fab/copy";
import { revalidatePath } from "next/cache";
import { sanitizePlainText } from "@/lib/server/safe-copy";

const methodCopySchema = z.object({
  label: z.string().max(80).optional(),
  description: z.string().max(200).optional(),
  eta: z.string().max(80).optional(),
});

const patchSchema = z.object({
  shippingCost: z.number().min(0).optional(),
  expressShippingCost: z.number().min(0).optional(),
  pickupShippingCost: z.number().min(0).optional(),
  freeShippingThreshold: z.number().min(0).optional(),
  freeShippingIncludesExpress: z.boolean().optional(),
  shippingMethods: z
    .object({
      standard: methodCopySchema.optional(),
      express: methodCopySchema.optional(),
      pickup: methodCopySchema.optional(),
    })
    .optional(),
  cartPromo: z
    .object({
      freeShippingBarEnabled: z.boolean().optional(),
      freeShippingRemainingText: z.string().max(120).optional(),
      freeShippingUnlockedText: z.string().max(120).optional(),
      impulseEnabled: z.boolean().optional(),
      impulseTitle: z.string().max(80).optional(),
      impulseMode: z.enum(["popular", "manual"]).optional(),
      impulseProductIds: z.array(z.string().max(80)).max(24).optional(),
      impulseLimit: z.number().int().min(1).max(16).optional(),
    })
    .optional(),
  searchUi: z
    .object({
      placeholder: z.string().max(80).optional(),
      suggestionsTitle: z.string().max(40).optional(),
      hint: z.string().max(160).optional(),
      suggestions: z.array(z.string().max(80)).max(16).optional(),
    })
    .optional(),
  supportWidgetCopy: z
    .object({
      welcomeLineLive: z.string().max(160).optional(),
      welcomeLineQueue: z.string().max(160).optional(),
      welcomeLineAfterHours: z.string().max(160).optional(),
      statusLive: z.string().max(80).optional(),
      statusQueue: z.string().max(80).optional(),
      statusAfterHours: z.string().max(80).optional(),
      statusOffline: z.string().max(80).optional(),
      liveGreeting: z.string().max(200).optional(),
      offlineOperatorGreeting: z.string().max(200).optional(),
      afterHoursGreeting: z.string().max(200).optional(),
    })
    .optional(),
});

export async function GET(request: Request) {
  const __gate = await gateAdmin(request, "settings.view");
  if (!__gate.ok) return __gate.response;

  let dbPing = false;
  let dbError: string | null = null;

  if (isMysqlConfigured()) {
    try {
      await mysqlQuery<RowDataPacket>("SELECT 1 AS ok");
      dbPing = true;
    } catch (err) {
      dbError = err instanceof Error ? err.message : "خطای اتصال به دیتابیس";
    }
  }

  const settings = await getSiteSettings();
  const missing: string[] = [];
  if (!process.env.NEXT_PUBLIC_SITE_URL) missing.push("NEXT_PUBLIC_SITE_URL");
  if (!isMysqlConfigured()) {
    missing.push("MYSQL_HOST / MYSQL_USER / MYSQL_DATABASE / MYSQL_PASSWORD");
  }
  if (!process.env.AUTH_SESSION_SECRET) missing.push("AUTH_SESSION_SECRET");
  const smsConfigured =
    Boolean(process.env.MELIPAYAMAK_OTP_URL?.trim()) ||
    Boolean(process.env.MELIPAYAMAK_OTP_TOKEN?.trim()) ||
    Boolean(process.env.MELIPAYAMAK_BODY_ID?.trim()) ||
    Boolean(process.env.KAVENEGAR_OTP_TEMPLATE?.trim()) ||
    Boolean(process.env.SMS_API_KEY && process.env.SMS_SENDER);
  if (!smsConfigured) {
    missing.push("MELIPAYAMAK_OTP_URL یا SMS_API_KEY / SMS_SENDER (برای OTP واقعی)");
  }
  if (!process.env.NEXT_PUBLIC_ADMIN_URL) missing.push("NEXT_PUBLIC_ADMIN_URL");
  if (!process.env.NEXT_PUBLIC_SELLER_URL) missing.push("NEXT_PUBLIC_SELLER_URL");

  const { isTransactionalSmsConfigured, isOrderSmsEnabled } = await import(
    "@/lib/server/sms"
  );
  const transactionalSms = isTransactionalSmsConfigured();
  const orderSmsEnabled = isOrderSmsEnabled();
  // Auto order SMS is opt-in; do not treat it as a production gap.
  const orderSms = orderSmsEnabled && transactionalSms;

  return NextResponse.json({
    env: {
      mysql: isMysqlConfigured(),
      mysqlPing: dbPing,
      mysqlError: dbError,
      // backward-compatible aliases for old admin UI
      supabase: isMysqlConfigured(),
      supabasePing: dbPing,
      supabaseError: dbError,
      sms: smsConfigured,
      transactionalSms,
      orderSms,
      orderSmsEnabled,
      zarinpal: false,
      zarinpalRefund: false,
      zibal: isZibalConfigured(),
      zibalRefund: isZibalRefundConfigured(),
      authSecret: Boolean(process.env.AUTH_SESSION_SECRET),
      adminOtp: true,
      siteUrl: Boolean(process.env.NEXT_PUBLIC_SITE_URL),
      adminUrl: Boolean(process.env.NEXT_PUBLIC_ADMIN_URL),
      sellerUrl: Boolean(process.env.NEXT_PUBLIC_SELLER_URL),
    },
    settings: {
      ...resolveShippingQuoteSettings(settings),
      shippingMethods: {
        standard: resolveShippingMethodCopy(
          "standard",
          settings.shippingMethods,
        ),
        express: resolveShippingMethodCopy(
          "express",
          settings.shippingMethods,
        ),
        pickup: resolveShippingMethodCopy("pickup", settings.shippingMethods),
      },
      cartPromo: resolveCartPromo(settings),
      searchUi: resolveSearchUi(settings),
      supportWidgetCopy: resolveSupportWidgetCopy(settings),
    },
    missing,
    productionReady:
      isMysqlConfigured() &&
      dbPing &&
      Boolean(process.env.AUTH_SESSION_SECRET) &&
      Boolean(process.env.NEXT_PUBLIC_SITE_URL) &&
      smsConfigured,
  });
}

export async function PATCH(request: Request) {
  const __gate = await gateAdmin(request, "settings.edit");
  if (!__gate.ok) return __gate.response;

  try {
    const body = await request.json();
    const parsed = patchSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: "اطلاعات نامعتبر" }, { status: 400 });
    }

    const patch = parsed.data;
    if (patch.shippingMethods) {
      for (const method of Object.values(patch.shippingMethods)) {
        if (!method) continue;
        if (method.label !== undefined) {
          method.label = sanitizePlainText(method.label, 80);
        }
        if (method.description !== undefined) {
          method.description = sanitizePlainText(method.description, 200);
        }
        if (method.eta !== undefined) {
          method.eta = sanitizePlainText(method.eta, 80);
        }
      }
    }
    if (patch.cartPromo) {
      if (patch.cartPromo.freeShippingRemainingText !== undefined) {
        patch.cartPromo.freeShippingRemainingText = sanitizePlainText(
          patch.cartPromo.freeShippingRemainingText,
          120,
        );
      }
      if (patch.cartPromo.freeShippingUnlockedText !== undefined) {
        patch.cartPromo.freeShippingUnlockedText = sanitizePlainText(
          patch.cartPromo.freeShippingUnlockedText,
          120,
        );
      }
      if (patch.cartPromo.impulseTitle !== undefined) {
        patch.cartPromo.impulseTitle = sanitizePlainText(
          patch.cartPromo.impulseTitle,
          80,
        );
      }
    }
    if (patch.searchUi) {
      if (patch.searchUi.placeholder !== undefined) {
        patch.searchUi.placeholder = sanitizePlainText(
          patch.searchUi.placeholder,
          80,
        );
      }
      if (patch.searchUi.suggestionsTitle !== undefined) {
        patch.searchUi.suggestionsTitle = sanitizePlainText(
          patch.searchUi.suggestionsTitle,
          40,
        );
      }
      if (patch.searchUi.hint !== undefined) {
        patch.searchUi.hint = sanitizePlainText(patch.searchUi.hint, 160);
      }
      if (patch.searchUi.suggestions) {
        patch.searchUi.suggestions = normalizeSearchSuggestions(
          patch.searchUi.suggestions.map((s) => sanitizePlainText(s, 80)),
          [],
        );
      }
    }
    if (patch.supportWidgetCopy) {
      for (const [key, value] of Object.entries(patch.supportWidgetCopy)) {
        if (typeof value !== "string") continue;
        const max =
          key === "liveGreeting" ||
          key === "offlineOperatorGreeting" ||
          key === "afterHoursGreeting"
            ? 200
            : key.startsWith("welcomeLine")
              ? 160
              : 80;
        (patch.supportWidgetCopy as Record<string, string>)[key] =
          sanitizePlainText(value, max);
      }
    }

    const updated = await updateSiteSettings(patch);
    try {
      revalidatePath("/", "layout");
    } catch {
      /* tests / non-request runtime */
    }
    await logAdminAction({
      action: "settings.update",
      entityType: "site_settings",
      entityId: "hajiasal",
      payload: patch,
    });

    return NextResponse.json({ success: true, settings: updated });
  } catch (err) {
    const message = err instanceof Error ? err.message : "خطای سرور";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
