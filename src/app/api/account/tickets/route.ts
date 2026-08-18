import { NextResponse } from "next/server";
import { z } from "zod";
import { getSessionFromRequest } from "@/lib/auth/session";
import {
  createCustomerTicket,
  listSupportTicketMessages,
  listSupportTicketsByCustomer,
} from "@/lib/server/support-tickets";
import { resolveSupportActor } from "@/lib/server/support-guest";
import { assertMessageRateLimitAsync } from "@/lib/server/ticket-runtime";
import { notifyTelegram } from "@/lib/server/telegram-notify";
import { buildCustomerValueContext } from "@/lib/server/support-widget-context";
import { classifyPathname } from "@/lib/support-fab/context";
import { countUnreadStaffMessages } from "@/lib/tickets/read-receipts";

export async function GET(request: Request) {
  const actor = resolveSupportActor(getSessionFromRequest(request), request);
  if (!actor) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const tickets = await listSupportTicketsByCustomer(actor.customerId);
  const enriched = await Promise.all(
    tickets.map(async (ticket) => {
      const messages = await listSupportTicketMessages(ticket.id);
      const unreadCount = countUnreadStaffMessages({
        status: ticket.status,
        lastReadByCustomerAt: ticket.lastReadByCustomerAt,
        messages,
      });
      return { ...ticket, unreadCount };
    }),
  );
  return NextResponse.json({ tickets: enriched });
}

const createSchema = z.object({
  subject: z.string().min(3).max(200),
  body: z.string().min(1).max(5000),
  priority: z.enum(["low", "normal", "high"]).default("normal"),
  meta: z
    .object({
      currentUrl: z.string().optional(),
      userAgent: z.string().optional(),
      pageKind: z.string().optional(),
      productOutOfStock: z.boolean().optional(),
      source: z.string().optional(),
      clientMessageId: z.string().max(80).optional(),
      attachmentUrl: z.string().nullable().optional(),
      attachmentName: z.string().nullable().optional(),
      attachmentMime: z.string().nullable().optional(),
    })
    .optional(),
});

export async function POST(request: Request) {
  const actor = resolveSupportActor(getSessionFromRequest(request), request);
  if (!actor) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const rl = await assertMessageRateLimitAsync(
    `customer-create:${actor.customerId}`,
  );
  if (!rl.ok) {
    return NextResponse.json(
      {
        error: "ایجاد تیکت بیش از حد مجاز است",
        retryAfterSec: rl.retryAfterSec,
      },
      { status: 429 },
    );
  }

  const parsed = createSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json({ error: "اطلاعات نامعتبر است" }, { status: 400 });
  }

  try {
    const pageKind = classifyPathname(
      parsed.data.meta?.currentUrl
        ? (() => {
            try {
              return new URL(
                parsed.data.meta.currentUrl,
                "https://hajiasal.ir",
              ).pathname;
            } catch {
              return "/";
            }
          })()
        : "/",
    );
    const value =
      actor.kind === "user"
        ? await buildCustomerValueContext({
            userId: actor.customerId,
            fullName: actor.fullName,
            pageKind:
              (parsed.data.meta?.pageKind as typeof pageKind | undefined) ??
              pageKind,
            currentUrl: parsed.data.meta?.currentUrl,
          })
        : {
            pageKind:
              (parsed.data.meta?.pageKind as typeof pageKind | undefined) ??
              pageKind,
            pendingPaymentCount: 0,
            shippingOrderId: null as string | null,
            accountValue: 0,
            vip: false,
            vipSummary: "",
          };
    const { ticket, message, greeting } = await createCustomerTicket({
      customerId: actor.customerId,
      customerName: actor.fullName?.trim() || actor.phone,
      customerPhone: actor.phone,
      subject: parsed.data.subject,
      body: parsed.data.body,
      priority: parsed.data.priority,
      attachmentUrl: parsed.data.meta?.attachmentUrl,
      attachmentName: parsed.data.meta?.attachmentName,
      attachmentMime: parsed.data.meta?.attachmentMime,
      clientMessageId: parsed.data.meta?.clientMessageId,
      meta: {
        source: parsed.data.meta?.source ?? "ticket-form",
        currentUrl: parsed.data.meta?.currentUrl,
        productOutOfStock: parsed.data.meta?.productOutOfStock,
        userAgent: request.headers.get("user-agent") ?? undefined,
        pageKind: value.pageKind,
        pendingPaymentCount: value.pendingPaymentCount,
        shippingOrderId: value.shippingOrderId,
        accountValue: value.accountValue,
        vip: value.vip,
        vipSummary: value.vipSummary,
        identityKind: actor.kind,
      },
    });

    void notifyTelegram("ticket.new", {
      id: ticket.id,
      subject: ticket.subject ?? parsed.data.subject,
      customerName: (actor.fullName?.trim() || actor.phone) ?? undefined,
      customerPhone: actor.phone,
      excerpt: String(parsed.data.body ?? "").slice(0, 400),
    });

    return NextResponse.json({
      success: true,
      id: ticket.id,
      ticket,
      greeting,
      message,
      messages: [greeting, message],
    });
  } catch (error) {
    const code = error instanceof Error ? error.message : "";
    console.error("[tickets.create]", code || error);
    if (code === "MYSQL_UNAVAILABLE") {
      return NextResponse.json(
        { error: "پایگاه داده در دسترس نیست" },
        { status: 503 },
      );
    }
    if (code === "EMPTY_BODY") {
      return NextResponse.json({ error: "متن پیام خالی است" }, { status: 400 });
    }
    return NextResponse.json({ error: "خطا در ایجاد تیکت" }, { status: 500 });
  }
}
